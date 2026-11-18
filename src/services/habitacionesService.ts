import { catalogoRepo } from '@/repositories/catalogoRepo'
import type { EstadoHabitacion } from '@/dto/common'
import type { HabitacionDTO } from '@/dto/habitacion'

export type ConteoEstados = Record<EstadoHabitacion, number>

export const habitacionesService = {
  listar: () => catalogoRepo.habitaciones(),
  categorias: () => catalogoRepo.categorias(),
  config: () => catalogoRepo.config(),

  porPiso(habs: HabitacionDTO[]): { piso: number; habitaciones: HabitacionDTO[] }[] {
    const pisos = [...new Set(habs.map((h) => h.piso))].sort()
    return pisos.map((piso) => ({ piso, habitaciones: habs.filter((h) => h.piso === piso) }))
  },

  conteo(habs: HabitacionDTO[]): ConteoEstados {
    const c: ConteoEstados = { ocupada: 0, limpia: 0, sucia: 0, en_limpieza: 0, fuera_servicio: 0 }
    habs.forEach((h) => { c[h.estado] += 1 })
    return c
  },

  /** Ocupación sobre habitaciones operativas (excluye fuera de servicio). */
  ocupacion(habs: HabitacionDTO[]): { ocupadas: number; operativas: number; pct: number } {
    const operativas = habs.filter((h) => h.estado !== 'fuera_servicio').length
    const ocupadas = habs.filter((h) => h.estado === 'ocupada').length
    return { ocupadas, operativas, pct: operativas ? Math.round((ocupadas / operativas) * 100) : 0 }
  },

  /** Nombre corto para fichas pequeñas. */
  nombreCorto(categoria: string): string {
    return categoria
      .replace('Matrimonial con vista frontal', 'Vista frontal')
      .replace('Matrimonial moderna con vista frontal', 'Moderna')
      .replace('Matrimonial con vista parcial', 'Vista parcial')
      .replace('Matrimonial sin vista', 'Sin vista')
      .replace('Suite con jacuzzi y frigobar · 508', 'Suite jacuzzi')
      .replace('Suite con jacuzzi y frigobar', 'Suite jacuzzi')
      .replace('Junior Suite sin jacuzzi', 'Jr. Suite')
      .replace('Senior Suite con jacuzzi', 'Senior Suite')
      .replace('Departamento', 'Depto.')
  },
}
