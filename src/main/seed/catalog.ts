import type Database from 'better-sqlite3'

export const AGE_UNIT = {
  DIAS: 'dias',
  MESES: 'meses',
  ANIOS: 'anios',
} as const

export const RESULT_TYPE = {
  NUMERICO: 'numerico',
  CUALITATIVO: 'cualitativo',
} as const

type ReferenceRangeSeed = {
  sexo: 'M' | 'F' | 'Ambos'
  edad_unidad: (typeof AGE_UNIT)[keyof typeof AGE_UNIT]
  edad_min: number
  edad_max: number
  valor_min: number | null
  valor_max: number | null
  interpretacion?: string
}

type ParameterSeed = {
  nombre: string
  orden: number
  unidad: string
  tipo_resultado?: (typeof RESULT_TYPE)[keyof typeof RESULT_TYPE]
  opciones_cualitativas?: string[]
  referencias: ReferenceRangeSeed[]
}

type ExamSeed = {
  codigo: string
  nombre: string
  categoria: string
  muestra: string
  precio: number
  parametros: ParameterSeed[]
}

const CATALOGO: ExamSeed[] = [
  {
    codigo: 'HEM01',
    nombre: 'Hematología Completa',
    categoria: 'Hematología',
    muestra: 'Sangre',
    precio: 15.0,
    parametros: [
      {
        nombre: 'Hemoglobina',
        orden: 1,
        unidad: 'g/dL',
        referencias: [
          { sexo: 'M', edad_unidad: AGE_UNIT.ANIOS, edad_min: 18, edad_max: 120, valor_min: 13.5, valor_max: 17.5 },
          { sexo: 'F', edad_unidad: AGE_UNIT.ANIOS, edad_min: 18, edad_max: 120, valor_min: 12.0, valor_max: 16.0 },
        ],
      },
      {
        nombre: 'Hematocrito',
        orden: 2,
        unidad: '%',
        referencias: [
          { sexo: 'M', edad_unidad: AGE_UNIT.ANIOS, edad_min: 18, edad_max: 120, valor_min: 41, valor_max: 53 },
        ],
      },
      {
        nombre: 'Plaquetas',
        orden: 3,
        unidad: 'x10³/mm³',
        referencias: [
          { sexo: 'Ambos', edad_unidad: AGE_UNIT.ANIOS, edad_min: 0, edad_max: 120, valor_min: 150, valor_max: 450 },
        ],
      },
    ],
  },
  {
    codigo: 'QUI01',
    nombre: 'Química Sanguínea',
    categoria: 'Química',
    muestra: 'Sangre',
    precio: 35.0,
    parametros: [
      {
        nombre: 'Glicemia',
        orden: 1,
        unidad: 'mg/dL',
        referencias: [
          { sexo: 'Ambos', edad_unidad: AGE_UNIT.ANIOS, edad_min: 0, edad_max: 120, valor_min: 70, valor_max: 100 },
        ],
      },
      {
        nombre: 'Colesterol',
        orden: 2,
        unidad: 'mg/dL',
        referencias: [
          { sexo: 'Ambos', edad_unidad: AGE_UNIT.ANIOS, edad_min: 0, edad_max: 120, valor_min: 0, valor_max: 200 },
        ],
      },
      {
        nombre: 'Triglicéridos',
        orden: 3,
        unidad: 'mg/dL',
        referencias: [
          { sexo: 'Ambos', edad_unidad: AGE_UNIT.ANIOS, edad_min: 0, edad_max: 120, valor_min: 0, valor_max: 150 },
        ],
      },
      {
        nombre: 'Urea',
        orden: 4,
        unidad: 'mg/dL',
        referencias: [
          { sexo: 'Ambos', edad_unidad: AGE_UNIT.ANIOS, edad_min: 0, edad_max: 120, valor_min: 15, valor_max: 45 },
        ],
      },
      {
        nombre: 'Creatinina',
        orden: 5,
        unidad: 'mg/dL',
        referencias: [
          { sexo: 'Ambos', edad_unidad: AGE_UNIT.ANIOS, edad_min: 0, edad_max: 120, valor_min: 0.6, valor_max: 1.2 },
        ],
      },
      {
        nombre: 'TGO / AST',
        orden: 6,
        unidad: 'U/L',
        referencias: [
          { sexo: 'Ambos', edad_unidad: AGE_UNIT.ANIOS, edad_min: 0, edad_max: 120, valor_min: 0, valor_max: 40 },
        ],
      },
      {
        nombre: 'TGP / ALT',
        orden: 7,
        unidad: 'U/L',
        referencias: [
          { sexo: 'Ambos', edad_unidad: AGE_UNIT.ANIOS, edad_min: 0, edad_max: 120, valor_min: 0, valor_max: 41 },
        ],
      },
      {
        nombre: 'Bilirrubina Total',
        orden: 8,
        unidad: 'mg/dL',
        referencias: [
          { sexo: 'Ambos', edad_unidad: AGE_UNIT.ANIOS, edad_min: 0, edad_max: 120, valor_min: 0.2, valor_max: 1.2 },
        ],
      },
      {
        nombre: 'Bilirrubina Directa',
        orden: 9,
        unidad: 'mg/dL',
        referencias: [
          { sexo: 'Ambos', edad_unidad: AGE_UNIT.ANIOS, edad_min: 0, edad_max: 120, valor_min: 0, valor_max: 0.3 },
        ],
      },
      {
        nombre: 'Fosfatasa Alcalina',
        orden: 10,
        unidad: 'U/L',
        referencias: [
          { sexo: 'Ambos', edad_unidad: AGE_UNIT.ANIOS, edad_min: 0, edad_max: 120, valor_min: 40, valor_max: 129 },
        ],
      },
    ],
  },
  {
    codigo: 'ORI01',
    nombre: 'Uroanálisis Completo',
    categoria: 'Uroanálisis',
    muestra: 'Orina',
    precio: 8.0,
    parametros: [
      { nombre: 'Color y Aspecto', orden: 1, unidad: '', referencias: [] },
      { nombre: 'Densidad', orden: 2, unidad: '', referencias: [] },
      { nombre: 'pH', orden: 3, unidad: '', referencias: [] },
      { nombre: 'Proteínas', orden: 4, unidad: '', referencias: [] },
      { nombre: 'Glucosa', orden: 5, unidad: '', referencias: [] },
      { nombre: 'Cuerpos Cetónicos', orden: 6, unidad: '', referencias: [] },
      { nombre: 'Nitritos', orden: 7, unidad: '', referencias: [] },
      { nombre: 'Leucocitos', orden: 8, unidad: '', referencias: [] },
    ],
  },
  {
    codigo: 'HIV01',
    nombre: 'HIV (Anticuerpos)',
    categoria: 'Serología',
    muestra: 'Sangre/Suero',
    precio: 15.0,
    parametros: [
      {
        nombre: 'HIV 1/2',
        orden: 1,
        unidad: 'Cualitativo',
        tipo_resultado: RESULT_TYPE.CUALITATIVO,
        opciones_cualitativas: ['Reactivo', 'No Reactivo'],
        referencias: [],
      },
    ],
  },
  {
    codigo: 'VDR01',
    nombre: 'VDRL',
    categoria: 'Serología',
    muestra: 'Sangre/Suero',
    precio: 5.0,
    parametros: [
      {
        nombre: 'VDRL',
        orden: 1,
        unidad: 'Cualitativo',
        tipo_resultado: RESULT_TYPE.CUALITATIVO,
        opciones_cualitativas: ['Reactivo', 'No Reactivo'],
        referencias: [],
      },
    ],
  },
  {
    codigo: 'HORM01',
    nombre: 'T3 Total',
    categoria: 'Hormonas',
    muestra: 'Suero',
    precio: 25.0,
    parametros: [
      {
        nombre: 'Triyodotironina',
        orden: 1,
        unidad: 'ng/dL',
        referencias: [],
      },
    ],
  },
  {
    codigo: 'HORM02',
    nombre: 'T4 Libre',
    categoria: 'Hormonas',
    muestra: 'Suero',
    precio: 25.0,
    parametros: [
      {
        nombre: 'Tiroxina Libre',
        orden: 1,
        unidad: 'ng/dL',
        referencias: [],
      },
    ],
  },
  {
    codigo: 'HORM03',
    nombre: 'TSH',
    categoria: 'Hormonas',
    muestra: 'Suero',
    precio: 28.0,
    parametros: [
      {
        nombre: 'Hormona Estimulante',
        orden: 1,
        unidad: 'uUI/mL',
        referencias: [],
      },
    ],
  },
]

function upsertExamen(db: Database.Database, examen: ExamSeed): number {
  const existing = db.prepare('SELECT id FROM examenes_catalogo WHERE codigo = ?').get(examen.codigo) as
    | { id: number }
    | undefined
  if (existing) {
    db.prepare(
      'UPDATE examenes_catalogo SET nombre = ?, categoria = ?, muestra = ?, precio = ? WHERE id = ?',
    ).run(examen.nombre, examen.categoria, examen.muestra, examen.precio, existing.id)
    return existing.id
  }
  const result = db
    .prepare('INSERT INTO examenes_catalogo (codigo, nombre, categoria, muestra, precio) VALUES (?, ?, ?, ?, ?)')
    .run(examen.codigo, examen.nombre, examen.categoria, examen.muestra, examen.precio)
  return Number(result.lastInsertRowid)
}

function upsertParametro(
  db: Database.Database,
  examenId: number,
  parametro: ParameterSeed,
): number {
  const tipoResultado = parametro.tipo_resultado ?? RESULT_TYPE.NUMERICO
  const opcionesJson = parametro.opciones_cualitativas ? JSON.stringify(parametro.opciones_cualitativas) : null
  const existing = db
    .prepare('SELECT id FROM parametros_examen WHERE examen_id = ? AND nombre = ?')
    .get(examenId, parametro.nombre) as { id: number } | undefined
  if (existing) {
    db.prepare(
      'UPDATE parametros_examen SET orden = ?, unidad = ?, tipo_resultado = ?, opciones_cualitativas = ? WHERE id = ?',
    ).run(parametro.orden, parametro.unidad, tipoResultado, opcionesJson, existing.id)
    return existing.id
  }
  const result = db
    .prepare(
      'INSERT INTO parametros_examen (examen_id, nombre, orden, unidad, tipo_resultado, opciones_cualitativas) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(examenId, parametro.nombre, parametro.orden, parametro.unidad, tipoResultado, opcionesJson)
  return Number(result.lastInsertRowid)
}

function upsertReferencia(db: Database.Database, parametroId: number, referencia: ReferenceRangeSeed): void {
  const interpretacion = referencia.interpretacion ?? null
  const existing = db
    .prepare('SELECT id FROM valores_referencia WHERE parametro_id = ? AND sexo = ? AND edad_min = ? AND edad_max = ? AND edad_unidad = ?')
    .get(parametroId, referencia.sexo, referencia.edad_min, referencia.edad_max, referencia.edad_unidad) as
    | { id: number }
    | undefined
  if (existing) {
    db.prepare(
      'UPDATE valores_referencia SET valor_min = ?, valor_max = ?, interpretacion = ? WHERE id = ?',
    ).run(referencia.valor_min, referencia.valor_max, interpretacion, existing.id)
    return
  }
  db.prepare(
    'INSERT INTO valores_referencia (parametro_id, sexo, edad_unidad, edad_min, edad_max, valor_min, valor_max, interpretacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(
    parametroId,
    referencia.sexo,
    referencia.edad_unidad,
    referencia.edad_min,
    referencia.edad_max,
    referencia.valor_min,
    referencia.valor_max,
    interpretacion,
  )
}

/**
 * Seed the exam catalog with the v1 reference data adapted to the v2 schema.
 *
 * The seed is idempotent: it upserts exams, parameters, and reference ranges so
 * it is safe to call on every startup after migrations have run.
 */
export function seedCatalog(db: Database.Database): void {
  for (const examen of CATALOGO) {
    const examenId = upsertExamen(db, examen)
    for (const parametro of examen.parametros) {
      const parametroId = upsertParametro(db, examenId, parametro)
      for (const referencia of parametro.referencias) {
        upsertReferencia(db, parametroId, referencia)
      }
    }
  }
}
