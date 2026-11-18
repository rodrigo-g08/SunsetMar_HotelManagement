import type { CategoriaDTO, ConfigDTO } from '@/dto/habitacion'
import type { CotizacionDTO, Modalidad } from '@/dto/reserva'
import { addDays, addHours, limaISO, limaParts } from '@/lib/time'

export class ReglaError extends Error {}

/**
 * Réplica en el navegador de la función SQL `cotizar`, para mostrar el precio
 * mientras se llena el formulario. La base de datos vuelve a calcularlo al guardar.
 */
export function cotizar(cat: CategoriaDTO, cfg: ConfigDTO, modalidad: Modalidad, entradaISO: string, noches: number, personas: number): CotizacionDTO {
  if (personas > cat.capacidad_max) throw new ReglaError(`Máximo ${cat.capacidad_max} personas en esta categoría`)
  const extra = Math.max(personas - cat.capacidad_base, 0)
  if (modalidad === 'promo5h') {
    if (cat.precio_promo == null) throw new ReglaError('La promo de 5 horas no aplica a esta categoría')
    if (!cfg.promo_dias_iso.includes(limaParts(new Date(entradaISO)).isoWeekday)) throw new ReglaError('La promo de 5 horas solo aplica de lunes a jueves')
    const adicional = extra * cfg.adicional_persona
    return { tarifa_base: cat.precio_promo, adicional, total: cat.precio_promo + adicional, salida: addHours(entradaISO, cfg.promo_horas), noches: 0 }
  }
  if (noches < 1) throw new ReglaError('Indique al menos una noche')
  const base = cat.precio_noche * noches
  const adicional = extra * cfg.adicional_persona * noches
  const salidaFecha = addDays(limaParts(new Date(entradaISO)).date, noches)
  return { tarifa_base: base, adicional, total: base + adicional, salida: new Date(limaISO(salidaFecha, cfg.hora_checkout)).toISOString(), noches }
}

/** Promo vigente para la fecha de entrada. */
export function promoDisponible(cfg: ConfigDTO, entradaISO: string): boolean {
  return cfg.promo_dias_iso.includes(limaParts(new Date(entradaISO)).isoWeekday)
}
