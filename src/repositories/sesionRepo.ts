import { supabase, unwrap } from '@/lib/supabase'
import type { Turno } from '@/dto/common'

export const sesionRepo = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    return data.session
  },

  async signOut() {
    await supabase.auth.signOut()
  },

  async abrirSesion(turno: Turno, recepcionista: string): Promise<string> {
    return unwrap(await supabase.rpc('abrir_sesion', { p_turno: turno, p_recepcionista: recepcionista })) as string
  },

  async cerrarSesion(id: string) {
    unwrap(await supabase.rpc('cerrar_sesion', { p_sesion: id }))
  },

  async recepcionistasRecientes(): Promise<string[]> {
    const rows = unwrap(await supabase.rpc('recepcionistas_recientes')) as string[] | null
    return rows ?? []
  },
}
