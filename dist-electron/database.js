"use strict";
Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
const Database = require("better-sqlite3");
const electron = require("electron");
const path = require("path");
let db = null;
function getDB() {
  if (!db) {
    const isDev = !electron.app.isPackaged;
    const dbPath = isDev ? path.resolve("lab_clinical.db") : path.join(electron.app.getPath("userData"), "lab_clinical.db");
    console.log("Iniciando DB en:", dbPath);
    db = new Database(dbPath, { verbose: console.log });
    db.pragma("foreign_keys = ON");
    db.pragma("journal_mode = WAL");
  }
  return db;
}
const initDB = (force = false) => {
  const db2 = getDB();
  db2.exec(`
        -- Tablas de Configuración
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            nombre_completo TEXT NOT NULL,
            rol TEXT CHECK(rol IN ('admin', 'bioanalista', 'tecnico', 'recepcion')) DEFAULT 'tecnico',
            activo INTEGER DEFAULT 1
        );

        -- Gestión de Pacientes
        CREATE TABLE IF NOT EXISTS pacientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cedula TEXT UNIQUE NOT NULL,
            nombres TEXT NOT NULL,
            apellidos TEXT NOT NULL,
            fecha_nacimiento DATE NOT NULL,
            sexo TEXT CHECK(sexo IN ('M', 'F', 'O')) NOT NULL,
            telefono TEXT,
            email TEXT,
            direccion TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_pacientes_cedula ON pacientes(cedula);

        -- Catálogo de Exámenes
        CREATE TABLE IF NOT EXISTS examenes_catalogo (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo TEXT UNIQUE NOT NULL,
            nombre TEXT NOT NULL,
            categoria TEXT NOT NULL,
            muestra TEXT DEFAULT 'Sangre',
            precio REAL DEFAULT 0.0,
            activo INTEGER DEFAULT 1
        );

        -- Parámetros de Examen
        CREATE TABLE IF NOT EXISTS parametros_examen (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            examen_id INTEGER REFERENCES examenes_catalogo(id),
            nombre TEXT NOT NULL,
            orden INTEGER NOT NULL,
            unidad TEXT
        );

        -- Valores de Referencia
        CREATE TABLE IF NOT EXISTS valores_referencia (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            parametro_id INTEGER REFERENCES parametros_examen(id),
            sexo TEXT CHECK(sexo IN ('M', 'F', 'Ambos')) DEFAULT 'Ambos',
            edad_min INTEGER DEFAULT 0,
            edad_max INTEGER DEFAULT 120,
            valor_min REAL,
            valor_max REAL,
            interpretacion TEXT
        );

        -- Solicitudes / Órdenes
        CREATE TABLE IF NOT EXISTS ordenes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            paciente_id INTEGER REFERENCES pacientes(id),
            fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            estatus TEXT CHECK(estatus IN ('Pendiente', 'Procesando', 'Completada', 'Entregada')) DEFAULT 'Pendiente',
            observaciones TEXT,
            precio_total REAL DEFAULT 0.0,
            estatus_pago TEXT CHECK(estatus_pago IN ('Pendiente', 'Pagado')) DEFAULT 'Pendiente'
        );

        -- Resultados de Exámenes
        CREATE TABLE IF NOT EXISTS resultados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            orden_id INTEGER REFERENCES ordenes(id),
            parametro_id INTEGER REFERENCES parametros_examen(id),
            valor_texto TEXT,
            fecha_resultado TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Tabla de Configuración de Laboratorio
        CREATE TABLE IF NOT EXISTS configuracion (
            clave TEXT PRIMARY KEY,
            valor TEXT
        );
    `);
  const configExists = db2.prepare("SELECT COUNT(*) as count FROM configuracion").get();
  if (configExists.count === 0) {
    const insertConfig = db2.prepare("INSERT INTO configuracion (clave, valor) VALUES (?, ?)");
    insertConfig.run("lab_nombre", "CENTRO DE DIAGNÓSTICO MÉDICO");
    insertConfig.run("lab_direccion", "Av. Principal con Calle 10, Edif. Salud, Nivel 1");
    insertConfig.run("lab_sedes", "Principal - Sucursal Norte - Centro de Atención Inmediata");
    insertConfig.run("prof_nombre", "Dr. Alejandro Moreno");
    insertConfig.run("prof_titulo", "Lic. En Bioanálisis / Esp. en Microbiología");
    insertConfig.run("prof_cedula", "V-15.344.211");
    insertConfig.run("prof_creds", "MSDS: 54321 / C.B.Z.: 8899");
    insertConfig.run("prof_especialidad", "BIOANALISTA");
  }
  try {
    db2.prepare("ALTER TABLE valores_referencia ADD COLUMN edad_min INTEGER DEFAULT 0").run();
  } catch (e) {
  }
  try {
    db2.prepare("ALTER TABLE valores_referencia ADD COLUMN edad_max INTEGER DEFAULT 120").run();
  } catch (e) {
  }
  try {
    db2.prepare("ALTER TABLE ordenes ADD COLUMN precio_total REAL DEFAULT 0.0").run();
  } catch (e) {
  }
  try {
    db2.prepare("ALTER TABLE ordenes ADD COLUMN estatus_pago TEXT CHECK(estatus_pago IN ('Pendiente', 'Pagado')) DEFAULT 'Pendiente'").run();
  } catch (e) {
  }
  try {
    db2.prepare("ALTER TABLE examenes_catalogo ADD COLUMN muestra TEXT DEFAULT 'Sangre'").run();
  } catch (e) {
  }
  const catalogCount = db2.prepare("SELECT COUNT(*) as count FROM examenes_catalogo").get();
  if (catalogCount.count === 0 || force) {
    console.log("Sincronizando catálogo de estudios...");
    const upsertExamen = (codigo, nombre, categoria, muestra, precio) => {
      const existing = db2.prepare("SELECT id FROM examenes_catalogo WHERE codigo = ?").get(codigo);
      if (existing) {
        db2.prepare("UPDATE examenes_catalogo SET nombre = ?, categoria = ?, muestra = ?, precio = ? WHERE id = ?").run(nombre, categoria, muestra, precio, existing.id);
        return existing.id;
      }
      return db2.prepare("INSERT INTO examenes_catalogo (codigo, nombre, categoria, muestra, precio) VALUES (?, ?, ?, ?, ?)").run(codigo, nombre, categoria, muestra, precio).lastInsertRowid;
    };
    const upsertParam = (examenId, nombre, orden, unidad) => {
      const existing = db2.prepare("SELECT id FROM parametros_examen WHERE examen_id = ? AND nombre = ?").get(examenId, nombre);
      if (existing) {
        db2.prepare("UPDATE parametros_examen SET orden = ?, unidad = ? WHERE id = ?").run(orden, unidad, existing.id);
        return existing.id;
      }
      return db2.prepare("INSERT INTO parametros_examen (examen_id, nombre, orden, unidad) VALUES (?, ?, ?, ?)").run(examenId, nombre, orden, unidad).lastInsertRowid;
    };
    const upsertRef = (paramId, sexo, edad_min, edad_max, valor_min, valor_max) => {
      const existing = db2.prepare("SELECT id FROM valores_referencia WHERE parametro_id = ? AND sexo = ? AND edad_min = ? AND edad_max = ?").get(paramId, sexo, edad_min, edad_max);
      if (existing) {
        db2.prepare("UPDATE valores_referencia SET valor_min = ?, valor_max = ? WHERE id = ?").run(valor_min, valor_max, existing.id);
        return existing.id;
      }
      return db2.prepare("INSERT INTO valores_referencia (parametro_id, sexo, edad_min, edad_max, valor_min, valor_max) VALUES (?, ?, ?, ?, ?, ?)").run(paramId, sexo, edad_min, edad_max, valor_min, valor_max).lastInsertRowid;
    };
    const hemId = upsertExamen("HEM01", "Hematología Completa", "Hematología", "Sangre", 15);
    const hgbId = upsertParam(hemId, "Hemoglobina", 1, "g/dL");
    upsertRef(hgbId, "M", 18, 120, 13.5, 17.5);
    upsertRef(hgbId, "F", 18, 120, 12, 16);
    const hctId = upsertParam(hemId, "Hematocrito", 2, "%");
    upsertRef(hctId, "M", 18, 120, 41, 53);
    const plaId = upsertParam(hemId, "Plaquetas", 3, "x10³/mm³");
    upsertRef(plaId, "Ambos", 0, 120, 150, 450);
    const quiId = upsertExamen("QUI01", "Química Sanguínea", "Química", "Sangre", 35);
    const gliId = upsertParam(quiId, "Glicemia", 1, "mg/dL");
    upsertRef(gliId, "Ambos", 0, 120, 70, 100);
    const colQId = upsertParam(quiId, "Colesterol", 2, "mg/dL");
    upsertRef(colQId, "Ambos", 0, 120, 0, 200);
    const triQId = upsertParam(quiId, "Triglicéridos", 3, "mg/dL");
    upsertRef(triQId, "Ambos", 0, 120, 0, 150);
    const ureQId = upsertParam(quiId, "Urea", 4, "mg/dL");
    upsertRef(ureQId, "Ambos", 0, 120, 15, 45);
    const creQId = upsertParam(quiId, "Creatinina", 5, "mg/dL");
    upsertRef(creQId, "Ambos", 0, 120, 0.6, 1.2);
    const sgotId = upsertParam(quiId, "TGO / AST", 6, "U/L");
    upsertRef(sgotId, "Ambos", 0, 120, 0, 40);
    const sgptId = upsertParam(quiId, "TGP / ALT", 7, "U/L");
    upsertRef(sgptId, "Ambos", 0, 120, 0, 41);
    const btId = upsertParam(quiId, "Bilirrubina Total", 8, "mg/dL");
    upsertRef(btId, "Ambos", 0, 120, 0.2, 1.2);
    const bdId = upsertParam(quiId, "Bilirrubina Directa", 9, "mg/dL");
    upsertRef(bdId, "Ambos", 0, 120, 0, 0.3);
    const falcId = upsertParam(quiId, "Fosfatasa Alcalina", 10, "U/L");
    upsertRef(falcId, "Ambos", 0, 120, 40, 129);
    const uriEId = upsertExamen("ORI01", "Uroanálisis Completo", "Uroanálisis", "Orina", 8);
    upsertParam(uriEId, "Color y Aspecto", 1, "");
    upsertParam(uriEId, "Densidad", 2, "");
    upsertParam(uriEId, "pH", 3, "");
    upsertParam(uriEId, "Proteínas", 4, "");
    upsertParam(uriEId, "Glucosa", 5, "");
    upsertParam(uriEId, "Cuerpos Cetónicos", 6, "");
    upsertParam(uriEId, "Nitritos", 7, "");
    upsertParam(uriEId, "Leucocitos", 8, "");
    const hivId = upsertExamen("HIV01", "HIV (Anticuerpos)", "Serología", "Sangre/Suero", 15);
    upsertParam(hivId, "HIV 1/2", 1, "Cualitativo");
    const vdrId = upsertExamen("VDR01", "VDRL", "Serología", "Sangre/Suero", 5);
    upsertParam(vdrId, "VDRL", 1, "Cualitativo");
    const t3Id = upsertExamen("HORM01", "T3 Total", "Hormonas", "Suero", 25);
    upsertParam(t3Id, "Triyodotironina", 1, "ng/dL");
    const t4Id = upsertExamen("HORM02", "T4 Libre", "Hormonas", "Suero", 25);
    upsertParam(t4Id, "Tiroxina Libre", 1, "ng/dL");
    const tshId = upsertExamen("HORM03", "TSH", "Hormonas", "Suero", 28);
    upsertParam(tshId, "Hormona Estimulante", 1, "uUI/mL");
  }
};
const db$1 = getDB();
exports.default = db$1;
exports.getDB = getDB;
exports.initDB = initDB;
//# sourceMappingURL=database.js.map
