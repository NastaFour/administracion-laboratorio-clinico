-- Migration 002_rebuild
-- Additive schema evolution for LabCore v2.0.
-- All new tables/columns are optional or defaulted so existing v1 data survives.
-- Foreign keys reference existing v1 tables and new tables created above.

-- New tables -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS medicos_referentes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    cedula TEXT UNIQUE,
    especialidad TEXT,
    telefono TEXT,
    activo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS empresas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    rif TEXT,
    contacto TEXT,
    activo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS orden_examenes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orden_id INTEGER NOT NULL REFERENCES ordenes(id),
    examen_id INTEGER NOT NULL REFERENCES examenes_catalogo(id),
    precio REAL DEFAULT 0.0,
    tercerizado INTEGER DEFAULT 0,
    proveedor TEXT,
    comentario TEXT,
    UNIQUE(orden_id, examen_id)
);

CREATE TABLE IF NOT EXISTS muestras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orden_examen_id INTEGER NOT NULL REFERENCES orden_examenes(id),
    tipo_muestra TEXT NOT NULL,
    codigo TEXT UNIQUE,
    estatus TEXT CHECK(estatus IN ('Recolectada', 'En proceso', 'Resultada', 'Rechazada')) DEFAULT 'Recolectada',
    motivo_rechazo TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cuentas_por_cobrar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
    orden_id INTEGER REFERENCES ordenes(id),
    monto_bs REAL DEFAULT 0.0,
    monto_usd REAL DEFAULT 0.0,
    saldo_bs REAL DEFAULT 0.0,
    saldo_usd REAL DEFAULT 0.0,
    autorizada INTEGER DEFAULT 0,
    abierta INTEGER DEFAULT 1,
    creado_por INTEGER NOT NULL REFERENCES usuarios(id),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cerrado_en TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pagos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orden_id INTEGER NOT NULL REFERENCES ordenes(id),
    cuenta_id INTEGER REFERENCES cuentas_por_cobrar(id),
    metodo TEXT CHECK(metodo IN ('pago_movil', 'transferencia', 'punto', 'efectivo', 'mixto')) NOT NULL,
    monto_bs REAL DEFAULT 0.0,
    monto_usd REAL DEFAULT 0.0,
    tasa_bcv REAL,
    referencia TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    anulado INTEGER DEFAULT 0,
    anulado_por INTEGER REFERENCES usuarios(id),
    anulado_en TIMESTAMP
);

CREATE TABLE IF NOT EXISTS abonos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cuenta_id INTEGER NOT NULL REFERENCES cuentas_por_cobrar(id),
    pago_id INTEGER REFERENCES pagos(id),
    monto_bs REAL DEFAULT 0.0,
    monto_usd REAL DEFAULT 0.0,
    tasa_bcv REAL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS cierre_caja (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha DATE UNIQUE NOT NULL,
    total_bs REAL DEFAULT 0.0,
    total_usd REAL DEFAULT 0.0,
    tasa_bcv REAL,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    detalle_por_metodo TEXT CHECK(json_valid(detalle_por_metodo))
);

CREATE TABLE IF NOT EXISTS auditoria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER REFERENCES usuarios(id),
    accion TEXT NOT NULL,
    entidad TEXT NOT NULL,
    entidad_id INTEGER,
    antes TEXT CHECK(json_valid(antes)),
    despues TEXT CHECK(json_valid(despues)),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bcv_historial (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tasa_bcv REAL NOT NULL,
    usuario_id INTEGER REFERENCES usuarios(id),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes ----------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_pacientes_nombre ON pacientes(nombres, apellidos);
CREATE INDEX IF NOT EXISTS idx_pacientes_telefono ON pacientes(telefono);

CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON auditoria(entidad, entidad_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_creado_en ON auditoria(creado_en);

CREATE INDEX IF NOT EXISTS idx_orden_examenes_orden_id ON orden_examenes(orden_id);
CREATE INDEX IF NOT EXISTS idx_muestras_orden_examen_id ON muestras(orden_examen_id);
CREATE INDEX IF NOT EXISTS idx_pagos_orden_id ON pagos(orden_id);
CREATE INDEX IF NOT EXISTS idx_abonos_cuenta_id ON abonos(cuenta_id);

-- ALTERs on existing v1 tables -------------------------------------------

ALTER TABLE examenes_catalogo ADD COLUMN tercerizado INTEGER DEFAULT 0;
ALTER TABLE examenes_catalogo ADD COLUMN proveedor TEXT;

ALTER TABLE parametros_examen ADD COLUMN tipo_resultado TEXT CHECK(tipo_resultado IN ('numerico', 'cualitativo')) DEFAULT 'numerico';
ALTER TABLE parametros_examen ADD COLUMN opciones_cualitativas TEXT CHECK(json_valid(opciones_cualitativas));

ALTER TABLE valores_referencia ADD COLUMN edad_unidad TEXT CHECK(edad_unidad IN ('dias', 'meses', 'anios')) DEFAULT 'anios';
ALTER TABLE valores_referencia ADD COLUMN valor_min_critico REAL;
ALTER TABLE valores_referencia ADD COLUMN valor_max_critico REAL;

ALTER TABLE ordenes ADD COLUMN medico_id INTEGER REFERENCES medicos_referentes(id);
ALTER TABLE ordenes ADD COLUMN empresa_id INTEGER REFERENCES empresas(id);
ALTER TABLE ordenes ADD COLUMN credito INTEGER DEFAULT 0;
ALTER TABLE ordenes ADD COLUMN anulada INTEGER DEFAULT 0;
ALTER TABLE ordenes ADD COLUMN motivo_anulacion TEXT;
ALTER TABLE ordenes ADD COLUMN cerrada INTEGER DEFAULT 0;

ALTER TABLE resultados ADD COLUMN valor_numerico REAL;
ALTER TABLE resultados ADD COLUMN valor_cualitativo TEXT;
ALTER TABLE resultados ADD COLUMN estatus_validacion TEXT CHECK(estatus_validacion IN ('Pendiente', 'Capturado', 'Validado')) DEFAULT 'Pendiente';
ALTER TABLE resultados ADD COLUMN validado_por INTEGER REFERENCES usuarios(id);
ALTER TABLE resultados ADD COLUMN validado_en TIMESTAMP;
ALTER TABLE resultados ADD COLUMN flag TEXT CHECK(flag IN ('bajo', 'alto', 'critico'));
ALTER TABLE resultados ADD COLUMN comentario TEXT;

ALTER TABLE usuarios ADD COLUMN ultimo_acceso_en TIMESTAMP;
ALTER TABLE usuarios ADD COLUMN intentos_fallidos INTEGER DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN bloqueado_hasta TIMESTAMP;
ALTER TABLE usuarios ADD COLUMN debe_cambiar_clave INTEGER DEFAULT 0;

ALTER TABLE pacientes ADD COLUMN activo INTEGER DEFAULT 1;
