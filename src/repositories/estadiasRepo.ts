import { supabase, unwrap } from '@/lib/supabase'
import type { HuespedDTO } from '@/dto/huesped'
import type { SesionTurnoDTO } from '@/dto/sesion'

export const estadiasRepo = {
  async buscarHuesped(documento: string): Promise<HuespedDTO | null> {
    const rows = unwrap(await supabase.rpc('buscar_huesped', { p_documento: documento })) as HuespedDTO[] | null
    return rows?.[0] ?? null
  },

  async checkin(reservaId: string, titular: HuespedDTO, acompanante: HuespedDTO | null, s: SesionTurnoDTO) {
    unwrap(await supabase.rpc('hacer_checkin', {
      p: { reserva_id: reservaId, titular, acompanante, sesion_id: s.id, recepcionista: s.recepcionista },
    }))
  },

  async checkout(reservaId: string, s: SesionTurnoDTO) {
    unwrap(await supabase.rpc('hacer_checkout', { p_reserva: reservaId, p_sesion: s.id, p_recep: s.recepcionista }))
  },

  async huespedesDeReserva(reservaId: string): Promise<{ es_titular: boolean; huesped: HuespedDTO }[]> {
    return (unwrap(await supabase.rpc('huespedes_de_reserva', { p_reserva: reservaId })) ?? []) as { es_titular: boolean; huesped: HuespedDTO }[]
  },
}
