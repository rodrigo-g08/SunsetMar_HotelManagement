import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button, Icon, Notice, TextInput, cx } from '@/components/ui'
import { useSession } from '@/context/SessionContext'
import { authService } from '@/services/authService'
import { supabaseConfigured } from '@/lib/supabase'
import { TURNOS, limaParts, turnoPorHora } from '@/lib/time'
import type { Turno } from '@/dto/common'

export function LoginPage() {
  const { auth, turno: activo, ingresar } = useSession()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [ver, setVer] = useState(false)
  const [nombre, setNombre] = useState('')
  const [turno, setTurno] = useState<Turno>(() => turnoPorHora(limaParts().hour))
  const [sugeridos, setSugeridos] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (auth) authService.recepcionistasRecientes().then(setSugeridos).catch(() => undefined)
  }, [auth])

  if (auth && activo) return <Navigate to="/" replace />

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      await ingresar({ email, password, turno, recepcionista: nombre })
      navigate('/', { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="grid min-h-full lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,1fr)]">
      <div className="relative hidden overflow-hidden bg-petrol lg:block">
        <img src="/brand/habitacion.jpg" alt="" className="absolute inset-0 size-full object-cover object-[20%_50%]" />
        <div className="absolute bottom-8 left-8 rounded-xl bg-[rgba(16,32,37,.82)] px-4 py-3 text-white">
          <b className="block text-[13px] font-semibold">Habitación renovada · piso 2</b>
          <span className="text-xs text-[#C9D7D9]">Malecón de Miraflores</span>
        </div>
      </div>
      <div className="grid place-items-center bg-[#F5F2EC] px-6 py-12">
        <form onSubmit={enviar} className="flex w-full max-w-[380px] flex-col gap-6" noValidate>
          <img src="/brand/logo-marfil.png" alt="Sunset Mar · Hotel Miraflores" className="-ml-1.5 w-34" />
          <div className="flex flex-col gap-2">
            <h1 className="text-[26px] font-semibold leading-8 tracking-tight">Panel de recepción</h1>
            <p className="text-sm text-ink-2">Ingrese con la cuenta de recepción y registre quién atiende el turno.</p>
          </div>
          {!supabaseConfigured && <Notice tone="bad">Falta configurar la conexión con Supabase (archivo .env.local).</Notice>}
          <div className="flex flex-col gap-4">
            <TextInput label="Correo" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <div className="relative">
              <TextInput label="Contraseña" type={ver ? 'text' : 'password'} autoComplete="current-password" required value={password}
                onChange={(e) => setPassword(e.target.value)} className="pr-10" />
              <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute bottom-2.5 right-3 text-ink-3 hover:text-ink"><Icon name="eye" size={18} /></button>
            </div>
            <TextInput label="Su nombre" placeholder="Ej. Paola Rivera" autoComplete="name" list="recepcionistas" required
              value={nombre} onChange={(e) => setNombre(e.target.value)} hint="Queda registrado en cada cobro, cambio de estado y cierre de caja." />
            <datalist id="recepcionistas">{sugeridos.map((s) => <option key={s} value={s} />)}</datalist>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-xs font-medium text-ink-2">Turno</legend>
            <div className="grid grid-cols-3 gap-2">
              {TURNOS.map((t) => (
                <button key={t.id} type="button" aria-pressed={turno === t.id} onClick={() => setTurno(t.id)}
                  className={cx('flex flex-col items-start rounded-lg border bg-white px-3 py-2 text-left', turno === t.id ? 'border-petrol ring-1 ring-petrol' : 'border-line')}>
                  <span className="text-[13px] font-semibold">{t.nombre}</span>
                  <span className="font-mono text-[11.5px] text-ink-3">{t.horario}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-ink-3">Se propone según la hora. Los cobros desde las 14:00 pertenecen al turno tarde.</p>
          </fieldset>
          {error && <Notice tone="bad">{error}</Notice>}
          <Button type="submit" variant="primary" size="lg" block loading={enviando}>Ingresar</Button>
        </form>
      </div>
    </div>
  )
}
