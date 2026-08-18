"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const database = require("./database.js");
const mergeService = require("./mergeService.js");
const systemServices = require("./systemServices.js");
const setupIPCHandlers = () => {
  electron.ipcMain.handle("db:getPatients", () => {
    return database.default.prepare("SELECT * FROM pacientes ORDER BY created_at DESC").all();
  });
  electron.ipcMain.handle("db:savePatient", (_, patient) => {
    const { cedula, nombres, apellidos, fecha_nacimiento, sexo, telefono, email, direccion } = patient;
    const stmt = database.default.prepare(`
            INSERT INTO pacientes (cedula, nombres, apellidos, fecha_nacimiento, sexo, telefono, email, direccion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(cedula) DO UPDATE SET
                nombres=excluded.nombres,
                apellidos=excluded.apellidos,
                fecha_nacimiento=excluded.fecha_nacimiento,
                sexo=excluded.sexo,
                telefono=excluded.telefono,
                email=excluded.email,
                direccion=excluded.direccion,
                updated_at=CURRENT_TIMESTAMP
        `);
    return stmt.run(cedula, nombres, apellidos, fecha_nacimiento, sexo, telefono, email, direccion);
  });
  electron.ipcMain.handle("system:generatePDF", async (_, data) => {
    return await systemServices.createPDFReport(data);
  });
  electron.ipcMain.handle("system:importData", async (_, patients) => {
    return await mergeService.processImport(patients);
  });
  electron.ipcMain.handle("system:backup", async () => {
    const isDev = !electron.app.isPackaged;
    const dbPath = isDev ? path.resolve("lab_clinical.db") : path.join(electron.app.getPath("userData"), "lab_clinical.db");
    return await systemServices.backupDatabase(dbPath);
  });
  electron.ipcMain.handle("system:exportFull", async () => {
    console.log("Iniciando system:exportFull...");
    try {
      const dateStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const { filePath } = await electron.dialog.showSaveDialog({
        title: "Exportar Copia de Seguridad Completa",
        defaultPath: path.join(electron.app.getPath("desktop"), `LabCore_Respaldado_${dateStr}.sqlite`),
        filters: [{ name: "SQLite Database", extensions: ["sqlite", "db"] }]
      });
      if (filePath) {
        console.log("Ruta seleccionada para exportación:", filePath);
        database.default.pragma("journal_mode = DELETE");
        await database.default.backup(filePath);
        database.default.pragma("journal_mode = WAL");
        console.log("Exportación completada con éxito");
        return filePath;
      } else {
        console.log("Exportación cancelada por el usuario");
      }
    } catch (error) {
      console.error("CRÍTICO: Error en exportación total:", error);
      throw error;
    }
    return null;
  });
  electron.ipcMain.handle("system:importFull", async (_, { mode }) => {
    const { filePaths } = await electron.dialog.showOpenDialog({
      title: "Seleccionar Archivo de Respaldo para Restaurar",
      filters: [{ name: "SQLite Database", extensions: ["sqlite", "db"] }],
      properties: ["openFile"]
    });
    if (filePaths && filePaths[0]) {
      const isDev = !electron.app.isPackaged;
      const dbPath = isDev ? path.resolve("lab_clinical.db") : path.join(electron.app.getPath("userData"), "lab_clinical.db");
      console.log(`[Import] Iniciando Importación (${mode}). Origen: ${filePaths[0]}`);
      try {
        const backupFile = await systemServices.backupDatabase(dbPath);
        console.log(`[Import] Respaldo preventivo creado en: ${backupFile}`);
        if (mode === "replace") {
          database.default.close();
          console.log("[Import] Conexión DB cerrada para reemplazo.");
          await new Promise((resolve) => setTimeout(resolve, 500));
          fs.copyFileSync(filePaths[0], dbPath);
          if (!isDev) {
            electron.app.relaunch();
            electron.app.exit(0);
          } else {
            electron.app.quit();
          }
        } else if (mode === "preview") {
          const Database2 = require("better-sqlite3");
          const sourceDb = new Database2(filePaths[0]);
          const conflicts = [];
          const newItems = [];
          const extPatients = sourceDb.prepare("SELECT * FROM pacientes").all();
          for (const p of extPatients) {
            const existing = database.default.prepare("SELECT * FROM pacientes WHERE cedula = ?").get(p.cedula);
            if (existing) {
              const hasDiff = p.nombres !== existing.nombres || p.apellidos !== existing.apellidos || p.telefono !== existing.telefono || p.email !== existing.email || p.direccion !== existing.direccion;
              if (hasDiff) {
                conflicts.push({ local: existing, incoming: p, type: "patient" });
              }
            } else {
              newItems.push({ data: p, type: "patient" });
            }
          }
          sourceDb.close();
          return { conflicts, newItems, filePath: filePaths[0] };
        } else {
          const Database2 = require("better-sqlite3");
          const sourceDb = new Database2(filePaths[0]);
          const { mergePatientData: mergePatientData2 } = require("./mergeService");
          const transaction = database.default.transaction(() => {
            const extPatients = sourceDb.prepare("SELECT * FROM pacientes").all();
            for (const p of extPatients) {
              const existing = database.default.prepare("SELECT * FROM pacientes WHERE cedula = ?").get(p.cedula);
              if (existing) {
                const merged = mergePatientData2(existing, p);
                database.default.prepare(`
                                    UPDATE pacientes SET 
                                        nombres = ?, apellidos = ?, telefono = ?, email = ?, direccion = ?, updated_at = CURRENT_TIMESTAMP
                                    WHERE id = ?
                                `).run(merged.nombres, merged.apellidos, merged.telefono, merged.email, merged.direccion, existing.id);
              } else {
                database.default.prepare(`
                                    INSERT INTO pacientes (cedula, nombres, apellidos, fecha_nacimiento, sexo, telefono, email, direccion)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                                `).run(p.cedula, p.nombres, p.apellidos, p.fecha_nacimiento, p.sexo, p.telefono, p.email, p.direccion);
              }
            }
            const extExams = sourceDb.prepare("SELECT * FROM examenes_catalogo WHERE activo = 1").all();
            for (const e of extExams) {
              const existing = database.default.prepare("SELECT * FROM examenes_catalogo WHERE nombre = ?").get(e.nombre);
              if (!existing) {
                database.default.prepare("INSERT INTO examenes_catalogo (codigo, nombre, categoria, precio, activo) VALUES (?, ?, ?, ?, 1)").run(e.codigo + "_IMP", e.nombre, e.categoria, e.precio);
              }
            }
          });
          transaction();
          sourceDb.close();
          console.log("[Import] Fusión completada con éxito.");
        }
        return true;
      } catch (e) {
        console.error("Error crítico al importar/fusionar:", e);
        throw new Error(`Error en proceso: ${e.message}`);
      }
    }
    return false;
  });
  electron.ipcMain.handle("system:wipeData", async () => {
    try {
      const transaction = database.default.transaction(() => {
        database.default.prepare("DELETE FROM resultados").run();
        database.default.prepare("DELETE FROM ordenes").run();
        database.default.prepare("DELETE FROM pacientes").run();
        database.default.prepare("DELETE FROM sqlite_sequence WHERE name IN ('pacientes', 'ordenes', 'resultados')").run();
      });
      transaction();
      return true;
    } catch (error) {
      console.error("Error al limpiar base de datos:", error);
      throw error;
    }
  });
  electron.ipcMain.handle("system:quit", () => {
    electron.app.quit();
  });
  electron.ipcMain.handle("db:getExams", () => {
    return database.default.prepare("SELECT * FROM examenes_catalogo WHERE activo = 1 ORDER BY nombre").all();
  });
  electron.ipcMain.handle("system:seedCatalog", async () => {
    const { initDB } = require("./database");
    return initDB(true);
  });
  electron.ipcMain.handle("db:updateExam", (_, { id, precio, muestra }) => {
    if (muestra !== void 0) {
      return database.default.prepare("UPDATE examenes_catalogo SET precio = ?, muestra = ? WHERE id = ?").run(precio, muestra, id);
    }
    return database.default.prepare("UPDATE examenes_catalogo SET precio = ? WHERE id = ?").run(precio, id);
  });
  electron.ipcMain.handle("db:addExam", (_, data) => {
    try {
      const transaction = database.default.transaction(() => {
        const random = Math.floor(1e3 + Math.random() * 9e3);
        const codigo = data.nombre.substring(0, 3).toUpperCase() + random;
        const insertStmt = database.default.prepare("INSERT INTO examenes_catalogo (codigo, nombre, categoria, muestra, precio, activo) VALUES (?, ?, ?, ?, ?, 1)");
        const result = insertStmt.run(codigo, data.nombre, data.categoria, data.muestra || "Sangre", data.precio);
        const examId = result.lastInsertRowid;
        database.default.prepare("INSERT INTO parametros_examen (examen_id, nombre, orden) VALUES (?, 'Resultado', 1)").run(examId);
        return examId;
      });
      return transaction();
    } catch (error) {
      console.error("Error en db:addExam:", error);
      throw error;
    }
  });
  electron.ipcMain.handle("db:deleteExam", (_, id) => {
    return database.default.prepare("UPDATE examenes_catalogo SET activo = 0 WHERE id = ?").run(id);
  });
  electron.ipcMain.handle("db:getParams", (_, { examId }) => {
    return database.default.prepare(`
            SELECT p.*, r.valor_min, r.valor_max, r.sexo as ref_sexo, r.edad_min, r.edad_max
            FROM parametros_examen p
            LEFT JOIN valores_referencia r ON p.id = r.parametro_id
            WHERE p.examen_id = ?
            GROUP BY p.id
            ORDER BY p.orden
        `).all(examId);
  });
  electron.ipcMain.handle("db:deleteParam", (_, id) => {
    const transaction = database.default.transaction(() => {
      database.default.prepare("DELETE FROM valores_referencia WHERE parametro_id = ?").run(id);
      return database.default.prepare("DELETE FROM parametros_examen WHERE id = ?").run(id);
    });
    return transaction();
  });
  electron.ipcMain.handle("db:addParam", (_, { examId, nombre, unidad, min, max, sexo, edad_min, edad_max }) => {
    try {
      const transaction = database.default.transaction(() => {
        const paramStmt = database.default.prepare("INSERT INTO parametros_examen (examen_id, nombre, orden, unidad) VALUES (?, ?, ?, ?)");
        const paramId = paramStmt.run(examId, nombre, 99, unidad || "").lastInsertRowid;
        const vMin = typeof min === "number" && !isNaN(min) ? min : null;
        const vMax = typeof max === "number" && !isNaN(max) ? max : null;
        const refStmt = database.default.prepare("INSERT INTO valores_referencia (parametro_id, sexo, edad_min, edad_max, valor_min, valor_max, interpretacion) VALUES (?, ?, ?, ?, ?, ?, 'Normal')");
        refStmt.run(paramId, sexo || "Ambos", edad_min || 0, edad_max || 120, vMin, vMax);
        return paramId;
      });
      return transaction();
    } catch (error) {
      console.error("Error en db:addParam:", error);
      throw error;
    }
  });
  electron.ipcMain.handle("db:saveResults", (_, { patientId, results, examId, observation, precioTotal, estatusPago }) => {
    const transaction = database.default.transaction(() => {
      const createOrder = database.default.prepare(`INSERT INTO ordenes (paciente_id, estatus, observaciones, precio_total, estatus_pago) VALUES (?, 'Completada', ?, ?, ?)`);
      const orderId = createOrder.run(patientId, observation, precioTotal || 0, estatusPago || "Pendiente").lastInsertRowid;
      const insertResult = database.default.prepare(`INSERT INTO resultados (orden_id, parametro_id, valor_texto) VALUES (?, ?, ?)`);
      for (const res of results) {
        insertResult.run(orderId, res.parametro_id, res.value);
      }
      return orderId;
    });
    return transaction();
  });
  electron.ipcMain.handle("db:getHistory", () => {
    return database.default.prepare(`
            SELECT 
                o.id, 
                p.nombres || ' ' || p.apellidos as paciente, 
                p.cedula,
                o.fecha_solicitud as fecha,
                o.estatus,
                o.precio_total,
                o.estatus_pago,
                (SELECT GROUP_CONCAT(DISTINCT e.nombre) 
                 FROM resultados r 
                 JOIN parametros_examen pe ON r.parametro_id = pe.id 
                 JOIN examenes_catalogo e ON pe.examen_id = e.id 
                 WHERE r.orden_id = o.id) as examenes
            FROM ordenes o
            JOIN pacientes p ON o.paciente_id = p.id
            ORDER BY o.fecha_solicitud DESC
        `).all();
  });
  electron.ipcMain.handle("db:updatePaymentStatus", (_, { orderId, status }) => {
    try {
      console.log(`Petición IPC: Actualizando pago. ID: ${orderId}, Estatus: ${status}`);
      const id = parseInt(String(orderId), 10);
      if (isNaN(id)) {
        console.error("ERROR: ID de orden inválido en updatePaymentStatus:", orderId);
        throw new Error("ID de orden inválido");
      }
      const result = database.default.prepare("UPDATE ordenes SET estatus_pago = ? WHERE id = ?").run(status, id);
      console.log("Resultado DB updatePaymentStatus:", result);
      return result;
    } catch (error) {
      console.error("Error crítico al actualizar pago en IPC:", error);
      throw error;
    }
  });
  electron.ipcMain.handle("db:getOrderReport", (_, orderId) => {
    const order = database.default.prepare(`
            SELECT o.*, p.nombres, p.apellidos, p.cedula, p.sexo, p.fecha_nacimiento 
            FROM ordenes o 
            JOIN pacientes p ON o.paciente_id = p.id 
            WHERE o.id = ?
        `).get(orderId);
    if (!order) return null;
    const birth = new Date(order.fecha_nacimiento);
    const now = /* @__PURE__ */ new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || m === 0 && now.getDate() < birth.getDate()) {
      age--;
    }
    const resultsRows = database.default.prepare(`
            SELECT pe.nombre, r.valor_texto as value, pe.unidad, e.nombre as exam_name, e.muestra,
                   pe.id as parametro_id
            FROM resultados r
            JOIN parametros_examen pe ON r.parametro_id = pe.id
            JOIN examenes_catalogo e ON pe.examen_id = e.id
            WHERE r.orden_id = ?
        `).all(orderId);
    const results = resultsRows.map((row) => {
      const ref = database.default.prepare(`
                SELECT valor_min, valor_max, interpretacion
                FROM valores_referencia
                WHERE parametro_id = ?
                AND (sexo = ? OR sexo = 'Ambos')
                AND (? >= edad_min AND ? <= edad_max)
                LIMIT 1
            `).get(row.parametro_id, order.sexo, age, age);
      return {
        ...row,
        valor_min: ref ? ref.valor_min : null,
        valor_max: ref ? ref.valor_max : null,
        interpretacion: ref ? ref.interpretacion : null
      };
    });
    return { ...order, results, edad: age, muestra: results[0]?.muestra };
  });
  electron.ipcMain.handle("db:updateOrderResults", (_, { orderId, results, observation }) => {
    try {
      const transaction = database.default.transaction(() => {
        database.default.prepare("UPDATE ordenes SET observaciones = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(observation, orderId);
        const updateResult = database.default.prepare(`
                    UPDATE resultados 
                    SET valor_texto = ? 
                    WHERE orden_id = ? AND parametro_id = ?
                `);
        for (const res of results) {
          updateResult.run(res.value, orderId, res.parametro_id);
        }
        return true;
      });
      return transaction();
    } catch (error) {
      console.error("Error al actualizar la orden:", error);
      throw error;
    }
  });
  electron.ipcMain.handle("db:deletePatient", (_, id) => {
    const transaction = database.default.transaction(() => {
      database.default.prepare("DELETE FROM resultados WHERE orden_id IN (SELECT id FROM ordenes WHERE paciente_id = ?)").run(id);
      database.default.prepare("DELETE FROM ordenes WHERE paciente_id = ?").run(id);
      return database.default.prepare("DELETE FROM pacientes WHERE id = ?").run(id);
    });
    return transaction();
  });
  electron.ipcMain.handle("db:deleteOrder", (_, id) => {
    const transaction = database.default.transaction(() => {
      database.default.prepare("DELETE FROM resultados WHERE orden_id = ?").run(id);
      return database.default.prepare("DELETE FROM ordenes WHERE id = ?").run(id);
    });
    return transaction();
  });
  electron.ipcMain.handle("db:getLabConfig", () => {
    const rows = database.default.prepare("SELECT clave, valor FROM configuracion").all();
    const config = {};
    rows.forEach((row) => {
      config[row.clave] = row.valor;
    });
    return config;
  });
  electron.ipcMain.handle("db:updateLabConfig", (_, config) => {
    const updateStmt = database.default.prepare("INSERT OR REPLACE INTO configuracion (clave, valor) VALUES (?, ?)");
    const transaction = database.default.transaction((data) => {
      for (const clave in data) {
        updateStmt.run(clave, data[clave]);
      }
      return true;
    });
    return transaction(config);
  });
};
exports.setupIPCHandlers = setupIPCHandlers;
//# sourceMappingURL=ipcHandlers.js.map
