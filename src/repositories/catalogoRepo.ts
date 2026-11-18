import { supabase, unwrap } from '@/lib/supabase'
import type { CategoriaDTO, ConfigDTO, HabitacionDTO, ProductoDTO } from '@/dto/habitacion'

/** Acceso directo a tablas de catálogo. Sin reglas de negocio. */
export const catalogoRepo = {
  async habitaciones(): Promise<HabitacionDTO[]> {
    const rows = unwrap(await supabase.from('habitaciones').select('*, categoria:categorias(*)').order('numero'))
    return rows as HabitacionDTO[]
  },

  async categorias(): Promise<CategoriaDTO[]> {
    return unwrap(await supabase.from('categorias').select('*').order('orden')) as CategoriaDTO[]
  },

  async productos(): Promise<ProductoDTO[]> {
    return unwrap(await supabase.from('productos').select('*').eq('activo', true).order('orden')) as ProductoDTO[]
  },

  async config(): Promise<ConfigDTO> {
    const rows = unwrap(await supabase.from('config').select('clave, valor')) as { clave: string; valor: unknown }[]
    const m = Object.fromEntries(rows.map((r) => [r.clave, r.valor]))
    return {
      adicional_persona: Number(m.adicional_persona ?? 40),
      hora_checkin: String(m.hora_checkin ?? '13:00'),
      hora_checkout: String(m.hora_checkout ?? '12:00'),
      promo_horas: Number(m.promo_horas ?? 5),
      promo_dias_iso: (m.promo_dias_iso as number[]) ?? [1, 2, 3, 4],
      fondo_fijo: Number(m.fondo_fijo ?? 140),
    }
  },
}
