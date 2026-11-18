import { supabase, unwrap } from '@/lib/supabase'
import type { DashboardDTO } from '@/dto/dashboard'

export const reportesRepo = {
  async dashboard(fecha: string): Promise<DashboardDTO> {
    return unwrap(await supabase.rpc('dashboard', { p_fecha: fecha })) as DashboardDTO
  },
}
