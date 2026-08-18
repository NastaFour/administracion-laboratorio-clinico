"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const database = require("./database.js");
const mergePatientData = (localPatient, incomingPatient) => {
  const pickBest = (local, incoming) => {
    if (!local) return incoming || "";
    if (!incoming) return local;
    return incoming.length >= local.length ? incoming : local;
  };
  return {
    ...localPatient,
    nombres: pickBest(localPatient.nombres, incomingPatient.nombres),
    apellidos: pickBest(localPatient.apellidos, incomingPatient.apellidos),
    telefono: pickBest(localPatient.telefono, incomingPatient.telefono),
    email: pickBest(localPatient.email, incomingPatient.email),
    direccion: pickBest(localPatient.direccion, incomingPatient.direccion),
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
};
const processImport = async (externalPatients) => {
  const results = { imported: 0, merged: 0, errors: 0 };
  const insertMany = database.default.transaction((patients) => {
    for (const p of patients) {
      const existing = database.default.prepare("SELECT * FROM pacientes WHERE cedula = ?").get(p.cedula);
      if (existing) {
        const merged = mergePatientData(existing, p);
        database.default.prepare(`
                    UPDATE pacientes SET 
                        nombres = ?, apellidos = ?, telefono = ?, email = ?, direccion = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `).run(merged.nombres, merged.apellidos, merged.telefono, merged.email, merged.direccion, existing.id);
        results.merged++;
      } else {
        database.default.prepare(`
                    INSERT INTO pacientes (cedula, nombres, apellidos, fecha_nacimiento, sexo, telefono, email, direccion)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `).run(p.cedula, p.nombres, p.apellidos, p.fecha_nacimiento, p.sexo, p.telefono, p.email, p.direccion);
        results.imported++;
      }
    }
  });
  insertMany(externalPatients);
  return results;
};
exports.mergePatientData = mergePatientData;
exports.processImport = processImport;
//# sourceMappingURL=mergeService.js.map
