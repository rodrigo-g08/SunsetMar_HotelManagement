import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  // Se muestra en consola y la pantalla de ingreso avisa del problema.
  console.error('Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. Revise .env.local o las variables de Cloudflare Pages.')
}

export const supabaseConfigured = Boolean(url && anonKey)

export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'missing', {
  auth: { persistSession: true, autoRefreshToken: true },
})

/** Lanza un Error legible con el mensaje que devuelve PostgreSQL. */
export function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}
