import { reservasRepo } from '@/repositories/reservasRepo'
import type { HabitacionDTO } from '@/dto/habitacion'
import type { Disponibilidad, NuevaReservaDTO, ReservaDTO } from '@/dto/reserva'
import type { SesionTurnoDTO } from '@/dto/sesion'
import { addDays, limaISO, limaParts } from '@/lib/time'

/** Error que pide confirmar que la habitación estará limpia a tiempo. */
export class LimpiezaPendienteError extends Error {}

function mapError(e: unknown): never {
  const msg = (e as Error).message ?? 'Error'
  if (msg.startsWith('LIMPIEZA:')) throw new LimpiezaPendienteError(msg.replace('LIMPIEZA:', '').trim())
  throw e instanceof Error ? e : new Error(msg)
}

const solapa = (a1: number, a2: number, b1: number, b2: number) => a1 < b2 && b1 < a2

export const reservasService = {
  enRango: reservasRepo.enRango,
  porId: reservasRepo.porId,
  historial: reservasRepo.historial,
  siguienteFicha: reservasRepo.siguienteFicha,

  async crear(dto: NuevaReservaDTO, s: SesionTurnoDTO): Promise<string> {
    try { return await reservasRepo.crear(dto, s) } catch (e) { return mapError(e) }
  },

  async reprogramar(...args: Parameters<typeof reservasRepo.reprogramar>) {
    try { await reservasRepo.reprogramar(...args) } catch (e) { mapError(e) }
  },

  cancelar: reservasRepo.cancelar,

  /**
   * Disponibilidad de una habitación para [entrada, salida).
   * - fuera de servicio o con estadía cruzada: no disponible
   * - si la entrada es hoy, debe estar limpia (no se vende sucia)
   * - si otra estadía sale ese mismo día antes de la entrada: pide confirmar limpieza
   */
  disponibilidad(h: HabitacionDTO, reservas: ReservaDTO[], entrada: string, salida: string, historica: boolean): Disponibilidad {
    const e = new Date(entrada).getTime()
    const s = new Date(salida).getTime()
    const propias = reservas.filter((r) => r.habitacion === h.numero && r.estado !== 'cancelada')
    if (propias.some((r) => solapa(e, s, new Date(r.entrada).getTime(), new Date(r.salida).getTime())))
      return { estado: 'no', motivo: 'Tiene una estadía en ese horario' }
    if (historica) return { estado: 'libre' }
    if (h.estado === 'fuera_servicio') return { estado: 'no', motivo: `Fuera de servicio: ${h.motivo_fuera ?? ''}` }
    const hoy = limaParts().date
    const diaEntrada = limaParts(new Date(entrada)).date
    if (diaEntrada === hoy && h.estado !== 'limpia' && h.estado !== 'ocupada')
      return { estado: 'no', motivo: h.estado === 'sucia' ? 'Pendiente de limpieza' : 'En limpieza' }
    const previa = propias.find((r) => new Date(r.salida).getTime() <= e && limaParts(new Date(r.salida)).date === diaEntrada)
    if (previa) return { estado: 'limpieza', motivo: 'Tiene una salida el mismo día' }
    if (h.estado === 'ocupada' && diaEntrada === hoy) return { estado: 'no', motivo: 'Ocupada' }
    return { estado: 'libre' }
  },

  /** Rango de la semana (lunes a domingo) que contiene la fecha dada. */
  semana(fecha: string): { desde: string; hasta: string; dias: string[] } {
    const iso = limaParts(new Date(limaISO(fecha, '12:00'))).isoWeekday
    const lunes = addDays(fecha, 1 - iso)
    const dias = Array.from({ length: 7 }, (_, i) => addDays(lunes, i))
    return { desde: limaISO(lunes, '00:00'), hasta: limaISO(addDays(lunes, 7), '00:00'), dias }
  },
}
