-- Migration 001_baseline
-- Captures the v1 schema verbatim (including the ALTER-style columns folded into CREATE).
-- All DDL is idempotent (IF NOT EXISTS) so it is a no-op on an existing v1 database.
-- Seeding only happens when the target table is empty.

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

-- Valores iniciales de configuración si no existen
INSERT OR IGNORE INTO configuracion (clave, valor) VALUES
    ('lab_nombre', 'CENTRO DE DIAGNÓSTICO MÉDICO'),
    ('lab_direccion', 'Av. Principal con Calle 10, Edif. Salud, Nivel 1'),
    ('lab_sedes', 'Principal - Sucursal Norte - Centro de Atención Inmediata'),
    ('prof_nombre', 'Dr. Alejandro Moreno'),
    ('prof_titulo', 'Lic. En Bioanálisis / Esp. en Microbiología'),
    ('prof_cedula', 'V-15.344.211'),
    ('prof_creds', 'MSDS: 54321 / C.B.Z.: 8899'),
    ('prof_especialidad', 'BIOANALISTA');

-- Catálogo base solo si la tabla está vacía
INSERT INTO examenes_catalogo (id, codigo, nombre, categoria, muestra, precio)
SELECT 1, 'HEM01', 'Hematología Completa', 'Hematología', 'Sangre', 15.00
WHERE (SELECT COUNT(*) FROM examenes_catalogo) = 0;

INSERT INTO examenes_catalogo (id, codigo, nombre, categoria, muestra, precio)
SELECT 2, 'QUI01', 'Química Sanguínea', 'Química', 'Sangre', 35.00
WHERE (SELECT COUNT(*) FROM examenes_catalogo) = 0;

INSERT INTO examenes_catalogo (id, codigo, nombre, categoria, muestra, precio)
SELECT 3, 'ORI01', 'Uroanálisis Completo', 'Uroanálisis', 'Orina', 8.00
WHERE (SELECT COUNT(*) FROM examenes_catalogo) = 0;

INSERT INTO examenes_catalogo (id, codigo, nombre, categoria, muestra, precio)
SELECT 4, 'HIV01', 'HIV (Anticuerpos)', 'Serología', 'Sangre/Suero', 15.00
WHERE (SELECT COUNT(*) FROM examenes_catalogo) = 0;

INSERT INTO examenes_catalogo (id, codigo, nombre, categoria, muestra, precio)
SELECT 5, 'VDR01', 'VDRL', 'Serología', 'Sangre/Suero', 5.00
WHERE (SELECT COUNT(*) FROM examenes_catalogo) = 0;

INSERT INTO examenes_catalogo (id, codigo, nombre, categoria, muestra, precio)
SELECT 6, 'HORM01', 'T3 Total', 'Hormonas', 'Suero', 25.00
WHERE (SELECT COUNT(*) FROM examenes_catalogo) = 0;

INSERT INTO examenes_catalogo (id, codigo, nombre, categoria, muestra, precio)
SELECT 7, 'HORM02', 'T4 Libre', 'Hormonas', 'Suero', 25.00
WHERE (SELECT COUNT(*) FROM examenes_catalogo) = 0;

INSERT INTO examenes_catalogo (id, codigo, nombre, categoria, muestra, precio)
SELECT 8, 'HORM03', 'TSH', 'Hormonas', 'Suero', 28.00
WHERE (SELECT COUNT(*) FROM examenes_catalogo) = 0;

-- Parámetros base solo si la tabla está vacía
INSERT INTO parametros_examen (id, examen_id, nombre, orden, unidad)
SELECT 1, 1, 'Hemoglobina', 1, 'g/dL' WHERE (SELECT COUNT(*) FROM parametros_examen) = 0;

INSERT INTO parametros_examen (id, examen_id, nombre, orden, unidad)
SELECT 2, 1, 'Hematocrito', 2, '%' WHERE (SELECT COUNT(*) FROM parametros_examen) = 0;

INSERT INTO parametros_examen (id, examen_id, nombre, orden, unidad)
SELECT 3, 1, 'Plaquetas', 3, 'x10³/mm³' WHERE (SELECT COUNT(*) FROM parametros_examen) = 0;

INSERT INTO parametros_examen (id, examen_id, nombre, orden, unidad)
SELECT 4, 2, 'Glicemia', 1, 'mg/dL' WHERE (SELECT COUNT(*) FROM parametros_examen) = 0;

INSERT INTO parametros_examen (id, examen_id, nombre, orden, unidad)
SELECT 5, 2, 'Colesterol', 2, 'mg/dL' WHERE (SELECT COUNT(*) FROM parametros_examen) = 0;

INSERT INTO parametros_examen (id, examen_id, nombre, orden, unidad)
SELECT 6, 2, 'Triglicéridos', 3, 'mg/dL' WHERE (SELECT COUNT(*) FROM parametros_examen) = 0;

INSERT INTO parametros_examen (id, examen_id, nombre, orden, unidad)
SELECT 7, 2, 'Urea', 4, 'mg/dL' WHERE (SELECT COUNT(*) FROM parametros_examen) = 0;

INSERT INTO parametros_examen (id, examen_id, nombre, orden, unidad)
SELECT 8, 2, 'Creatinina', 5, 'mg/dL' WHERE (SELECT COUNT(*) FROM parametros_examen) = 0;

INSERT INTO parametros_examen (id, examen_id, nombre, orden, unidad)
SELECT 9, 2, 'TGO / AST', 6, 'U/L' WHERE (SELECT COUNT(*) FROM parametros_examen) = 0;

INSERT INTO parametros_examen (id, examen_id, nombre, orden, unidad)
SELECT 10, 2, 'TGP / ALT', 7, 'U/L' WHERE (SELECT COUNT(*) FROM parametros_examen) = 0;

INSERT INTO parametros_examen (id, examen_id, nombre, orden, unidad)
SELECT 11, 2, 'Bilirrubina Total', 8, 'mg/dL' WHERE (SELECT COUNT(*) FROM parametros_examen) = 0;

INSERT INTO parametros_examen (id, examen_id, nombre, orden, unidad)
SELECT 12, 2, 'Bilirrubina Directa', 9, 'mg/dL' WHERE (SELECT COUNT(*) FROM parametros_examen) = 0;

INSERT INTO parametros_examen (id, examen_id, nombre, orden, unidad)
SELECT 13, 2, 'Fosfatasa Alcalina', 10, 'U/L' WHERE (SELECT COUNT(*) FROM parametros_examen) = 0;

INSERT INTO parametros_examen (id, examen_id, nombre, orden, unidad)
SELECT 14, 3, 'Color y Aspecto', 1, '' WHERE (SELECT COUNT(*) FROM parametros_examen) = 0;

INSERT INTO parametros_examen (id, examen_id, nombre, orden, unidad)
SELECT 15, 3, 'Densidad', 2, '' WHERE (SELECT COUNT(*) FROM parametros_examen) = 0;

INSERT INTO parametros_examen (id, examen_id, nombre, orden, unidad)
SELECT 16, 3, 'pH', 3, '' WHERE (SELECT COUNT(*) FROM parametros_examen) = 0;

INSERT INTO parametros_examen (id, examen_id, nombre, orden, unidad)
SELECT 17, 3, 'Proteínas', 4, '' WHERE (SELECT COUNT(*) FROM parametros_examen) = 0;

INSERT INTO parametros_examen (id, examen_id, nombre, orden, unidad)
SELECT 18, 3, 'Glucosa', 5, '' WHERE (SELECT COUNT(*) FROM parametros_examen) = 0;

INSERT INTO parametros_examen (id, examen_id, nombre, orden, unidad)
SELECT 19, 3, 'Cuerpos Cetónicos', 6, '' WHERE (SELECT COUNT(*) FROM parametros_examen) = 0;

INSERT INTO parametros_examen (id, examen_id, nombre, orden, unidad)
SELECT 20, 3, 'Nitritos', 7, '' WHERE (SELECT COUNT(*) FROM parametros_examen) = 0;

INSERT INTO parametros_examen (id, examen_id, nombre, orden, unidad)
SELECT 21, 3, 'Leucocitos', 8, '' WHERE (SELECT COUNT(*) FROM parametros_examen) = 0;

INSERT INTO parametros_examen (id, examen_id, nombre, orden, unidad)
SELECT 22, 4, 'HIV 1/2', 1, 'Cualitativo' WHERE (SELECT COUNT(*) FROM parametros_examen) = 0;

INSERT INTO parametros_examen (id, examen_id, nombre, orden, unidad)
SELECT 23, 5, 'VDRL', 1, 'Cualitativo' WHERE (SELECT COUNT(*) FROM parametros_examen) = 0;

INSERT INTO parametros_examen (id, examen_id, nombre, orden, unidad)
SELECT 24, 6, 'Triyodotironina', 1, 'ng/dL' WHERE (SELECT COUNT(*) FROM parametros_examen) = 0;

INSERT INTO parametros_examen (id, examen_id, nombre, orden, unidad)
SELECT 25, 7, 'Tiroxina Libre', 1, 'ng/dL' WHERE (SELECT COUNT(*) FROM parametros_examen) = 0;

INSERT INTO parametros_examen (id, examen_id, nombre, orden, unidad)
SELECT 26, 8, 'Hormona Estimulante', 1, 'uUI/mL' WHERE (SELECT COUNT(*) FROM parametros_examen) = 0;

-- Valores de referencia base solo si la tabla está vacía
INSERT INTO valores_referencia (parametro_id, sexo, edad_min, edad_max, valor_min, valor_max)
SELECT 1, 'M', 18, 120, 13.5, 17.5 WHERE (SELECT COUNT(*) FROM valores_referencia) = 0;

INSERT INTO valores_referencia (parametro_id, sexo, edad_min, edad_max, valor_min, valor_max)
SELECT 1, 'F', 18, 120, 12.0, 16.0 WHERE (SELECT COUNT(*) FROM valores_referencia) = 0;

INSERT INTO valores_referencia (parametro_id, sexo, edad_min, edad_max, valor_min, valor_max)
SELECT 2, 'M', 18, 120, 41, 53 WHERE (SELECT COUNT(*) FROM valores_referencia) = 0;

INSERT INTO valores_referencia (parametro_id, sexo, edad_min, edad_max, valor_min, valor_max)
SELECT 3, 'Ambos', 0, 120, 150, 450 WHERE (SELECT COUNT(*) FROM valores_referencia) = 0;

INSERT INTO valores_referencia (parametro_id, sexo, edad_min, edad_max, valor_min, valor_max)
SELECT 4, 'Ambos', 0, 120, 70, 100 WHERE (SELECT COUNT(*) FROM valores_referencia) = 0;

INSERT INTO valores_referencia (parametro_id, sexo, edad_min, edad_max, valor_min, valor_max)
SELECT 5, 'Ambos', 0, 120, 0, 200 WHERE (SELECT COUNT(*) FROM valores_referencia) = 0;

INSERT INTO valores_referencia (parametro_id, sexo, edad_min, edad_max, valor_min, valor_max)
SELECT 6, 'Ambos', 0, 120, 0, 150 WHERE (SELECT COUNT(*) FROM valores_referencia) = 0;

INSERT INTO valores_referencia (parametro_id, sexo, edad_min, edad_max, valor_min, valor_max)
SELECT 7, 'Ambos', 0, 120, 15, 45 WHERE (SELECT COUNT(*) FROM valores_referencia) = 0;

INSERT INTO valores_referencia (parametro_id, sexo, edad_min, edad_max, valor_min, valor_max)
SELECT 8, 'Ambos', 0, 120, 0.6, 1.2 WHERE (SELECT COUNT(*) FROM valores_referencia) = 0;

INSERT INTO valores_referencia (parametro_id, sexo, edad_min, edad_max, valor_min, valor_max)
SELECT 9, 'Ambos', 0, 120, 0, 40 WHERE (SELECT COUNT(*) FROM valores_referencia) = 0;

INSERT INTO valores_referencia (parametro_id, sexo, edad_min, edad_max, valor_min, valor_max)
SELECT 10, 'Ambos', 0, 120, 0, 41 WHERE (SELECT COUNT(*) FROM valores_referencia) = 0;

INSERT INTO valores_referencia (parametro_id, sexo, edad_min, edad_max, valor_min, valor_max)
SELECT 11, 'Ambos', 0, 120, 0.2, 1.2 WHERE (SELECT COUNT(*) FROM valores_referencia) = 0;

INSERT INTO valores_referencia (parametro_id, sexo, edad_min, edad_max, valor_min, valor_max)
SELECT 12, 'Ambos', 0, 120, 0, 0.3 WHERE (SELECT COUNT(*) FROM valores_referencia) = 0;

INSERT INTO valores_referencia (parametro_id, sexo, edad_min, edad_max, valor_min, valor_max)
SELECT 13, 'Ambos', 0, 120, 40, 129 WHERE (SELECT COUNT(*) FROM valores_referencia) = 0;
