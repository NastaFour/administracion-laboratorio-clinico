import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { ok, err, envelopeSchema } from './errors'
import { ERROR_CODES } from './errors'
import { idSchema, cedulaSchema, emailSchema, isoDateSchema, isoDateOnlySchema } from './primitives'
import { ROLES } from './constants'
import { loginRequestSchema, sessionSchema, userSchema } from './auth'
import { patientInputSchema, patientSchema, sexSchema } from './patients'
import { examInputSchema, parameterInputSchema, referenceRangeInputSchema } from './catalog'
import { createOrderRequestSchema, orderExamSchema } from './orders'
import { sampleStatusSchema } from './samples'
import { captureValueSchema } from './results'
import { recordPaymentRequestSchema } from './payments'

describe('envelope', () => {
  it('builds a success envelope schema', () => {
    const schema = envelopeSchema(z.object({ id: z.number() }))
    const parsed = schema.parse(ok({ id: 1 }))
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.data.id).toBe(1)
  })

  it('builds an error envelope schema', () => {
    const schema = envelopeSchema(z.object({ id: z.number() }))
    const parsed = schema.parse(err(ERROR_CODES.NOT_FOUND, 'Missing'))
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) {
      expect(parsed.error.code).toBe(ERROR_CODES.NOT_FOUND)
      expect(parsed.error.message).toBe('Missing')
    }
  })

  it('rejects an envelope missing ok flag', () => {
    const schema = envelopeSchema(z.object({ id: z.number() }))
    expect(() => schema.parse({ data: { id: 1 } })).toThrow()
  })
})

describe('primitives', () => {
  it('accepts positive integer IDs', () => {
    expect(idSchema.parse(42)).toBe(42)
  })

  it('rejects zero and negative IDs', () => {
    expect(() => idSchema.parse(0)).toThrow()
    expect(() => idSchema.parse(-1)).toThrow()
    expect(() => idSchema.parse(1.5)).toThrow()
  })

  it('accepts valid Venezuelan cédulas', () => {
    expect(cedulaSchema.parse('V-12345678')).toBe('V-12345678')
    expect(cedulaSchema.parse('E-1234567')).toBe('E-1234567')
  })

  it('rejects malformed cédulas', () => {
    expect(() => cedulaSchema.parse('12345678')).toThrow()
    expect(() => cedulaSchema.parse('X-12345678')).toThrow()
    expect(() => cedulaSchema.parse('V-')).toThrow()
  })

  it('accepts valid emails', () => {
    expect(emailSchema.parse('lab@example.com')).toBe('lab@example.com')
  })

  it('rejects invalid emails', () => {
    expect(() => emailSchema.parse('not-an-email')).toThrow()
  })

  it('accepts ISO-8601 datetimes and dates', () => {
    expect(isoDateSchema.parse('2026-08-18T10:30:00.000Z')).toBe('2026-08-18T10:30:00.000Z')
    expect(isoDateOnlySchema.parse('2026-08-18')).toBe('2026-08-18')
  })

  it('rejects malformed dates', () => {
    expect(() => isoDateSchema.parse('2026-08-18')).toThrow()
    expect(() => isoDateOnlySchema.parse('18/08/2026')).toThrow()
  })
})

describe('auth contracts', () => {
  it('accepts a valid login request', () => {
    const parsed = loginRequestSchema.parse({ usuario: 'admin', clave: 'secret' })
    expect(parsed.usuario).toBe('admin')
  })

  it('rejects empty login fields', () => {
    expect(() => loginRequestSchema.parse({ usuario: '', clave: 'secret' })).toThrow()
    expect(() => loginRequestSchema.parse({ usuario: 'admin' })).toThrow()
  })

  it('accepts a valid session', () => {
    const parsed = sessionSchema.parse({
      userId: 1,
      nombre: 'Admin',
      rol: ROLES.ADMIN,
      loginAt: '2026-08-18T10:30:00.000Z',
    })
    expect(parsed.rol).toBe(ROLES.ADMIN)
  })

  it('accepts a valid user', () => {
    const parsed = userSchema.parse({
      id: 1,
      usuario: 'admin',
      nombre: 'Admin',
      rol: ROLES.ADMIN,
      activo: true,
      debe_cambiar_clave: false,
      ultimo_acceso_en: '2026-08-18T10:30:00.000Z',
    })
    expect(parsed.id).toBe(1)
  })
})

describe('patients contracts', () => {
  it('accepts a valid patient', () => {
    const parsed = patientSchema.parse({
      id: 1,
      cedula: 'V-12345678',
      nombre: 'María',
      apellido: 'Pérez',
      fecha_nacimiento: '1990-05-15',
      sexo: 'F',
      telefono: '+58 412-1234567',
      email: 'maria@example.com',
      direccion: 'Caracas',
      activo: true,
    })
    expect(parsed.sexo).toBe('F')
  })

  it('rejects invalid sex', () => {
    expect(() => sexSchema.parse('X')).toThrow()
  })

  it('rejects duplicate-style cédula in input', () => {
    expect(() =>
      patientInputSchema.parse({
        cedula: '12345678',
        nombre: 'María',
        apellido: 'Pérez',
        fecha_nacimiento: '1990-05-15',
        sexo: 'F',
      }),
    ).toThrow()
  })
})

describe('catalog contracts', () => {
  it('accepts a valid exam', () => {
    const parsed = examInputSchema.parse({
      codigo: 'HEM-01',
      nombre: 'Hemograma Completo',
      categoria: 'Hematología',
      tipo_muestra: 'Sangre',
      precio: 500,
      tercerizado: false,
      proveedor: null,
    })
    expect(parsed.codigo).toBe('HEM-01')
  })

  it('accepts a qualitative parameter', () => {
    const parsed = parameterInputSchema.parse({
      examen_id: 1,
      nombre: 'VDRL',
      orden: 1,
      unidad: null,
      tipo_resultado: 'cualitativo',
      opciones_cualitativas: ['Reactivo', 'No Reactivo'],
    })
    expect(parsed.tipo_resultado).toBe('cualitativo')
  })

  it('accepts a valid reference range', () => {
    const parsed = referenceRangeInputSchema.parse({
      parametro_id: 1,
      sexo: 'M',
      edad_unidad: 'anios',
      edad_min: 18,
      edad_max: 120,
      valor_min: 13.5,
      valor_max: 17.5,
      interpretacion: 'Normal',
      valor_min_critico: 7.0,
      valor_max_critico: 21.0,
    })
    expect(parsed.edad_unidad).toBe('anios')
  })
})

describe('orders contracts', () => {
  it('accepts a valid create order request', () => {
    const parsed = createOrderRequestSchema.parse({
      paciente_id: 1,
      medico_id: 2,
      empresa_id: null,
      examenes: [
        { examen_id: 1, precio: 500, tercerizado: false, proveedor: null, comentario: null },
        { examen_id: 2, precio: 300 },
      ],
      observaciones: 'Ayunas 12h',
    })
    expect(parsed.examenes).toHaveLength(2)
  })

  it('rejects an order without exams', () => {
    expect(() =>
      createOrderRequestSchema.parse({
        paciente_id: 1,
        examenes: [],
      }),
    ).toThrow()
  })

  it('rejects a negative price', () => {
    expect(() =>
      orderExamSchema.parse({
        examen_id: 1,
        precio: -10,
      }),
    ).toThrow()
  })
})

describe('samples contracts', () => {
  it('accepts valid sample statuses', () => {
    expect(sampleStatusSchema.parse('Recolectada')).toBe('Recolectada')
    expect(sampleStatusSchema.parse('Resultada')).toBe('Resultada')
  })

  it('rejects unknown status', () => {
    expect(() => sampleStatusSchema.parse('Entregada')).toThrow()
  })
})

describe('results contracts', () => {
  it('accepts numeric capture value', () => {
    const parsed = captureValueSchema.parse({ tipo: 'numerico', valor: 14.2 })
    expect(parsed.tipo).toBe('numerico')
  })

  it('accepts qualitative capture value', () => {
    const parsed = captureValueSchema.parse({ tipo: 'cualitativo', valor: 'Reactivo' })
    expect(parsed.valor).toBe('Reactivo')
  })

  it('rejects empty qualitative value', () => {
    expect(() => captureValueSchema.parse({ tipo: 'cualitativo', valor: '' })).toThrow()
  })
})

describe('payments contracts', () => {
  it('accepts a valid payment record', () => {
    const parsed = recordPaymentRequestSchema.parse({
      orden_id: 1,
      cuenta_id: null,
      metodo: 'pago_movil',
      monto_bs: 1000,
      monto_usd: 0,
      tasa_bcv: 950,
      referencia: 'REF001',
      fecha: '2026-08-18',
    })
    expect(parsed.metodo).toBe('pago_movil')
  })

  it('rejects invalid payment method', () => {
    expect(() =>
      recordPaymentRequestSchema.parse({
        orden_id: 1,
        metodo: 'tarjeta',
        monto_bs: 100,
        tasa_bcv: 950,
        fecha: '2026-08-18',
      }),
    ).toThrow()
  })
})
