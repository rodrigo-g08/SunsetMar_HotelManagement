import { estadiasRepo } from '@/repositories/estadiasRepo'
import type { HuespedDTO } from '@/dto/huesped'
import type { ReservaDTO } from '@/dto/reserva'
import type { SesionTurnoDTO } from '@/dto/sesion'
import { limaParts } from '@/lib/time'

export interface MovimientoDia {
  reserva: ReservaDTO
  tipo: 'llegada' | 'salida'
  hora: string
  pendiente: boolean
}

/** Valida la ficha antes de enviarla. Devuelve el primer problema o null. */
export function validarHuesped(h: HuespedDTO, rol: string): string | null {
  const doc = h.documento.trim()
  if (!doc) return `Falta el documento del ${rol}`
  if (h.documento_tipo === 'DNI' && !/^\d{8}$/.test(doc)) return `El DNI del ${rol} debe tener 8 dígitos`
  if (h.apellidos_nombres.trim().length < 3) return `Faltan los apellidos y nombres del ${rol}`
  return null
}

export const estadiasService = {
  buscarHuesped: (doc: string) => estadiasRepo.buscarHuesped(doc.trim().toUpperCase()),
  huespedes: estadiasRepo.huespedesDeReserva,
  checkout: estadiasRepo.checkout,

  async checkin(reservaId: string, titular: HuespedDTO, acompanante: HuespedDTO | null, s: SesionTurnoDTO) {
    const e = validarHuesped(titular, 'titular') ?? (acompanante ? validarHuesped(acompanante, 'acompañante') : null)
    if (e) throw new Error(e)
    await estadiasRepo.checkin(reservaId, titular, acompanante, s)
  },

  /** Llegadas y salidas de una fecha, ordenadas por hora. */
  movimientosDelDia(reservas: ReservaDTO[], fecha = limaParts().date): MovimientoDia[] {
    const delDia = (iso: string | null) => !!iso && limaParts(new Date(iso)).date === fecha
    const out: MovimientoDia[] = []
    for (const r of reservas) {
      if (r.estado === 'cancelada') continue
      if (delDia(r.entrada)) out.push({ reserva: r, tipo: 'llegada', hora: r.checkin_en ?? r.entrada, pendiente: r.estado === 'confirmada' })
      if (delDia(r.salida) || delDia(r.checkout_en)) out.push({ reserva: r, tipo: 'salida', hora: r.checkout_en ?? r.salida, pendiente: r.estado === 'en_casa' })
    }
    return out.sort((a, b) => a.hora.localeCompare(b.hora))
  },
}
