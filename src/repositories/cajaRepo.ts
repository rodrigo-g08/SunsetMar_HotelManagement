import { supabase, unwrap } from '@/lib/supabase'
import type { MetodoPago, Turno } from '@/dto/common'
import type { CajaTurnoDTO, MovimientoDTO, ReporteDiarioDTO, ResumenCajaDTO, VentaItemDTO } from '@/dto/caja'
import type { SesionTurnoDTO } from '@/dto/sesion'

export const cajaRepo = {
  async abierta(): Promise<CajaTurnoDTO | null> {
    return unwrap(await supabase.from('caja_turnos').select('*').eq('estado', 'abierta').maybeSingle()) as CajaTurnoDTO | null
  },

  async ultimaCerrada(): Promise<CajaTurnoDTO | null> {
    return unwrap(await supabase.from('caja_turnos').select('*').eq('estado', 'cerrada').order('cierre_en', { ascending: false }).limit(1).maybeSingle()) as CajaTurnoDTO | null
  },

  async delDia(desde: string, hasta: string): Promise<CajaTurnoDTO[]> {
    return unwrap(await supabase.from('caja_turnos').select('*').gte('apertura_en', desde).lt('apertura_en', hasta).order('apertura_en')) as CajaTurnoDTO[]
  },

  async abrir(turno: Turno, fondo: number, s: SesionTurnoDTO): Promise<string> {
    return unwrap(await supabase.rpc('abrir_caja', { p_turno: turno, p_fondo: fondo, p_sesion: s.id, p_recep: s.recepcionista })) as string
  },

  async resumen(id: string): Promise<ResumenCajaDTO> {
    return unwrap(await supabase.rpc('resumen_caja', { p_caja: id })) as ResumenCajaDTO
  },

  async movimientos(cajaId: string): Promise<MovimientoDTO[]> {
    return unwrap(await supabase.from('movimientos').select('*').eq('caja_turno_id', cajaId).order('fecha_operacion')) as MovimientoDTO[]
  },

  async movimientosRango(desde: string, hasta: string): Promise<MovimientoDTO[]> {
    return unwrap(await supabase.from('movimientos').select('*').gte('fecha_operacion', desde).lt('fecha_operacion', hasta).order('fecha_operacion')) as MovimientoDTO[]
  },

  async cerrar(id: string, denominaciones: Record<string, number>, recibe: string, obs: string, s: SesionTurnoDTO) {
    return unwrap(await supabase.rpc('cerrar_caja', {
      p_caja: id, p_denominaciones: denominaciones, p_recibe: recibe, p_obs: obs, p_sesion: s.id, p_recep: s.recepcionista,
    })) as { contado: number; esperado: number; diferencia: number; queda_fondo: number; entregado: number }
  },

  async egreso(concepto: string, importe: number, metodo: MetodoPago, s: SesionTurnoDTO) {
    unwrap(await supabase.rpc('registrar_egreso', { p_concepto: concepto, p_importe: importe, p_metodo: metodo, p_sesion: s.id, p_recep: s.recepcionista }))
  },

  async venta(ficha: string, habitacion: string | null, items: VentaItemDTO[], metodo: MetodoPago, s: SesionTurnoDTO) {
    return unwrap(await supabase.rpc('registrar_venta', {
      p: { ficha, habitacion, items, metodo, sesion_id: s.id, recepcionista: s.recepcionista },
    })) as string
  },

  async siguienteFichaAB(): Promise<string> {
    return unwrap(await supabase.rpc('siguiente_ficha_ab')) as string
  },

  async reporteDiario(fecha: string): Promise<ReporteDiarioDTO> {
    return unwrap(await supabase.rpc('reporte_diario', { p_fecha: fecha })) as ReporteDiarioDTO
  },

  async exportarReservas(desde: string, hasta: string): Promise<Record<string, unknown>[]> {
    return (unwrap(await supabase.rpc('exportar_reservas', { p_desde: desde, p_hasta: hasta })) ?? []) as Record<string, unknown>[]
  },
}
