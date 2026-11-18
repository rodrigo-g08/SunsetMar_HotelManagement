import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { authService } from '@/services/authService'
import type { LoginDTO, SesionTurnoDTO } from '@/dto/sesion'

interface Ctx {
  ready: boolean
  auth: Session | null
  turno: SesionTurnoDTO | null
  ingresar: (dto: LoginDTO) => Promise<void>
  salir: () => Promise<void>
}

const SessionContext = createContext<Ctx | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [auth, setAuth] = useState<Session | null>(null)
  const [turno, setTurno] = useState<SesionTurnoDTO | null>(authService.sesionGuardada())

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setAuth(data.session); setReady(true) })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setAuth(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const ingresar = useCallback(async (dto: LoginDTO) => {
    setTurno(await authService.ingresar(dto))
  }, [])

  const salir = useCallback(async () => {
    await authService.salir(turno)
    setTurno(null)
  }, [turno])

  return <SessionContext.Provider value={{ ready, auth, turno, ingresar, salir }}>{children}</SessionContext.Provider>
}

export function useSession(): Ctx {
  const c = useContext(SessionContext)
  if (!c) throw new Error('useSession debe usarse dentro de SessionProvider')
  return c
}

/** Datos del turno activo. Solo se usa dentro de rutas protegidas. */
export function useTurno(): SesionTurnoDTO {
  const { turno } = useSession()
  if (!turno) throw new Error('No hay turno activo')
  return turno
}
