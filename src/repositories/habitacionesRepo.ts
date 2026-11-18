import { supabase, unwrap } from '@/lib/supabase'
import type { EstadoHabitacion } from '@/dto/common'
import type { SesionTurnoDTO } from '@/dto/sesion'

export interface CambioEstadoDTO { ts: string; recepcionista: string | null; de: EstadoHabitacion; a: EstadoHabitacion; motivo: string | null }

export const habitacionesRepo = {
  async cambiarEstado(numero: string, estado: EstadoHabitacion, motivo: string | null, s: SesionTurnoDTO) {
    unwrap(await supabase.rpc('cambiar_estado_habitacion', {
      p_numero: numero, p_estado: estado, p_motivo: motivo, p_sesion: s.id, p_recep: s.recepcionista,
    }))
  },

  async historial(numero: string): Promise<CambioEstadoDTO[]> {
    return (unwrap(await supabase.rpc('historial_habitacion', { p_numero: numero, p_limite: 8 })) ?? []) as CambioEstadoDTO[]
  },
}
