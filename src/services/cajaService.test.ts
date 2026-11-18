import { describe, expect, it } from 'vitest'
import { repartir, totalContado } from './cajaService'

describe('cierre de caja', () => {
  it('suma el conteo por denominaciones del turno mañana (S/ 266)', () => {
    expect(totalContado({ '200': 0, '100': 1, '50': 2, '20': 3, '10': 0, '5': 1, '2': 0, '1': 1 })).toBe(266)
  })

  it('suma céntimos sin error de redondeo', () => {
    expect(totalContado({ '0.1': 3, '0.2': 1, '0.5': 1 })).toBe(1)
  })

  it('deja el fondo fijo y entrega el resto', () => {
    expect(repartir(266, 140)).toEqual({ queda: 140, entrega: 126 })
  })

  it('si hay menos que el fondo, se queda todo', () => {
    expect(repartir(90, 140)).toEqual({ queda: 90, entrega: 0 })
  })
})
