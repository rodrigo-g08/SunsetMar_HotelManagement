import { describe, expect, it } from 'vitest'
import { cotizar, ReglaError } from './pricingService'
import type { CategoriaDTO, ConfigDTO } from '@/dto/habitacion'

const cfg: ConfigDTO = { adicional_persona: 40, hora_checkin: '13:00', hora_checkout: '12:00', promo_horas: 5, promo_dias_iso: [1, 2, 3, 4], fondo_fijo: 140 }
const sinVista: CategoriaDTO = { id: 1, nombre: 'Matrimonial sin vista', precio_noche: 119, precio_promo: 99, capacidad_base: 2, capacidad_max: 3, orden: 1 }
const dobleTriple: CategoriaDTO = { id: 5, nombre: 'Doble / triple', precio_noche: 159, precio_promo: null, capacidad_base: 2, capacidad_max: 3, orden: 5 }

describe('cotizar', () => {
  it('promo de 5 h un martes con 2 personas', () => {
    const c = cotizar(sinVista, cfg, 'promo5h', '2026-11-17T15:00:00-05:00', 0, 2)
    expect(c.total).toBe(99)
    expect(new Date(c.salida).toISOString()).toBe('2026-11-18T01:00:00.000Z') // 20:00 en Lima
  })

  it('promo con persona adicional suma S/ 40', () => {
    expect(cotizar(sinVista, cfg, 'promo5h', '2026-11-17T15:00:00-05:00', 0, 3).total).toBe(139)
  })

  it('la promo no aplica en viernes', () => {
    expect(() => cotizar(sinVista, cfg, 'promo5h', '2026-11-20T15:00:00-05:00', 0, 2)).toThrow(ReglaError)
  })

  it('303 como triple: 159 + 40 por noche', () => {
    const c = cotizar(dobleTriple, cfg, 'noche', '2026-11-17T16:30:00-05:00', 2, 3)
    expect(c.total).toBe(398)
    expect(c.salida).toBe('2026-11-19T17:00:00.000Z') // 12:00 en Lima
  })

  it('respeta la capacidad máxima', () => {
    expect(() => cotizar(dobleTriple, cfg, 'noche', '2026-11-17T16:30:00-05:00', 1, 4)).toThrow('Máximo 3')
  })
})
