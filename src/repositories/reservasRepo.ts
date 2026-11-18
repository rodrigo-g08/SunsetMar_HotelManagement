import { supabase, unwrap } from '@/lib/supabase'
import type { MetodoPago } from '@/dto/common'
import type { NuevaReservaDTO, ReservaDTO } from '@/dto/reserva'
import type { SesionTurnoDTO } from '@/dto/sesion'

const firma = (s: SesionTurnoDTO) => ({ p_sesion: s.id, p_recep: s.recepcionista })

export const reservasRepo = {
  /** Reservas no canceladas que se cruzan con el rango [desde, hasta). */
  async enRango(desde: string, hasta: string): Promise<ReservaDTO[]> {
    return unwrap(await supabase.from('reservas').select('*').neq('estado', 'cancelada')
      .lt('entrada', hasta).gt('salida', desde).order('entrada')) as ReservaDTO[]
  },

  async porId(id: string): Promise<ReservaDTO> {
    return unwrap(await supabase.from('reservas').select('*').eq('id', id).single()) as ReservaDTO
  },

  async historial(desde: string, hasta: string, texto?: string): Promise<ReservaDTO[]> {
    let q = supabase.from('reservas').select('*').gte('entrada', desde).lt('entrada', hasta).order('entrada', { ascending: false })
    const t = texto?.replace(/[,()%*:"\\]/g, '').trim()
    if (t) q = q.or(`titular.ilike.%${t}%,ficha.eq.${t.replace(/\D/g, '') || '0'},habitacion.eq.${t.replace(/\D/g, '') || '0'}`)
    return unwrap(await q) as ReservaDTO[]
  },

  async crear(dto: NuevaReservaDTO, s: SesionTurnoDTO): Promise<string> {
    return unwrap(await supabase.rpc('crear_reserva', { p: { ...dto, sesion_id: s.id, recepcionista: s.recepcionista } })) as string
  },

  async cancelar(id: string, motivo: string, devolver: boolean, metodo: MetodoPago, s: SesionTurnoDTO) {
    unwrap(await supabase.rpc('cancelar_reserva', { p_id: id, p_motivo: motivo, p_devolver: devolver, p_metodo: metodo, ...firma(s) }))
  },

  async reprogramar(id: string, habitacion: string, entrada: string, noches: number, personas: number,
    metodo: MetodoPago, forzarLimpieza: boolean, s: SesionTurnoDTO) {
    unwrap(await supabase.rpc('reprogramar_reserva', {
      p_id: id, p_habitacion: habitacion, p_entrada: entrada, p_noches: noches, p_personas: personas,
      p_metodo: metodo, p_forzar_limpieza: forzarLimpieza, ...firma(s),
    }))
  },

  async siguienteFicha(): Promise<string> {
    return unwrap(await supabase.rpc('siguiente_ficha_alojamiento')) as string
  },
}
