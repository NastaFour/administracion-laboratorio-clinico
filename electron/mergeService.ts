import db from './database';

interface Patient {
    id?: number;
    cedula: string;
    nombres: string;
    apellidos: string;
    fecha_nacimiento: string;
    sexo: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    updated_at?: string;
}

const mergePatientData = (localPatient: Patient, incomingPatient: Patient): Patient => {
    const pickBest = (local?: string, incoming?: string): string => {
        if (!local) return incoming || '';
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
        updated_at: new Date().toISOString()
    };
};

const processImport = async (externalPatients: Patient[]) => {
    const results = { imported: 0, merged: 0, errors: 0 };

    const insertMany = db.transaction((patients: Patient[]) => {
        for (const p of patients) {
            const existing = db.prepare('SELECT * FROM pacientes WHERE cedula = ?').get(p.cedula) as Patient | undefined;

            if (existing) {
                const merged = mergePatientData(existing, p);
                db.prepare(`
                    UPDATE pacientes SET 
                        nombres = ?, apellidos = ?, telefono = ?, email = ?, direccion = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `).run(merged.nombres, merged.apellidos, merged.telefono, merged.email, merged.direccion, existing.id);
                results.merged++;
            } else {
                db.prepare(`
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

export { mergePatientData, processImport };
