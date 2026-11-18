import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Icon, cx } from '@/components/ui'
import type { IconName } from '@/components/ui/icons'
import { useSession, useTurno } from '@/context/SessionContext'
import { limaParts, nombreTurno } from '@/lib/time'

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Inicio', icon: 'home' },
  { to: '/reservas', label: 'Reservas', icon: 'calendar' },
  { to: '/habitaciones', label: 'Habitaciones', icon: 'bed' },
  { to: '/caja', label: 'Caja', icon: 'wallet' },
]

const TITULOS: [RegExp, string][] = [
  [/^\/reservas\/nueva/, 'Reservas / Nueva reserva'],
  [/^\/reservas\/historial/, 'Reservas / Historial'],
  [/^\/reservas/, 'Reservas / Calendario'],
  [/^\/habitaciones\/tarifas/, 'Habitaciones / Tarifas'],
  [/^\/habitaciones/, 'Habitaciones / Estado'],
  [/^\/caja\/venta/, 'Caja / Venta A&B'],
  [/^\/caja\/cierre/, 'Caja / Cierre'],
  [/^\/caja\/reporte/, 'Caja / Reporte diario'],
  [/^\/caja/, 'Caja / Turno actual'],
  [/^\//, 'Inicio'],
]

function useReloj() {
  const [t, setT] = useState(() => limaParts())
  useEffect(() => {
    const id = setInterval(() => setT(limaParts()), 30_000)
    return () => clearInterval(id)
  }, [])
  return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`
}

export function AppShell() {
  const turno = useTurno()
  const { salir } = useSession()
  const navigate = useNavigate()
  const reloj = useReloj()
  const { pathname } = useLocation()
  const titulo = TITULOS.find(([r]) => r.test(pathname))?.[1] ?? 'Inicio'
  const [seccion, pagina] = titulo.includes(' / ') ? titulo.split(' / ') : ['', titulo]
  useEffect(() => { document.title = `${pagina} · Sunset Mar` }, [pagina])
  const iniciales = turno.recepcionista.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="grid min-h-full grid-cols-1 md:grid-cols-[72px_minmax(0,1fr)] xl:grid-cols-[216px_minmax(0,1fr)]">
      <aside className="fixed inset-x-0 bottom-0 z-30 flex bg-petrol px-2 py-1.5 md:static md:flex-col md:gap-1 md:px-3 md:pb-4 md:pt-5">
        <div className="hidden px-2 pb-5 md:block">
          <img src="/brand/logo-petroleo.png" alt="Sunset Mar · Hotel Miraflores" className="w-12 object-cover object-left xl:w-28" />
        </div>
        <nav aria-label="Módulos" className="flex flex-1 justify-around md:flex-none md:flex-col md:gap-1">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}
              className={({ isActive }) => cx(
                'flex flex-col items-center justify-center gap-1 rounded-lg px-2 text-[11px] font-medium md:h-10 md:flex-row md:justify-center md:gap-3 md:px-3 md:text-sm xl:justify-start',
                'h-13', isActive ? 'text-[#F0B593] md:bg-white/10 md:text-white md:font-semibold' : 'text-[#C3D3D6] hover:text-white')}>
              {({ isActive }) => (<><Icon name={n.icon} size={19} className={isActive ? 'md:text-[#E9A880]' : ''} /><span className="md:hidden xl:inline">{n.label}</span></>)}
            </NavLink>
          ))}
        </nav>
        <div className="hidden flex-1 md:block" />
        <div className="hidden items-center gap-3 border-t border-white/15 px-2 pt-4 md:flex">
          <span className="grid size-8 flex-none place-items-center rounded-full bg-sand text-xs font-semibold text-petrol">{iniciales}</span>
          <div className="hidden min-w-0 flex-1 xl:block">
            <b className="block truncate text-[13px] font-semibold text-white">{turno.recepcionista}</b>
            <span className="text-xs text-[#9FB6BA]">Turno {nombreTurno(turno.turno).toLowerCase()}</span>
          </div>
          <button type="button" aria-label="Cerrar sesión" title="Cerrar sesión" className="text-[#9FB6BA] hover:text-white"
            onClick={async () => { await salir(); navigate('/ingresar') }}>
            <Icon name="logout" size={18} />
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-col pb-20 md:pb-0">
        <header className="flex h-14 items-center gap-4 border-b border-line bg-white px-4 md:px-6">
          <div className="min-w-0 flex-1 truncate text-[15px]">
            {seccion && <span className="hidden text-ink-3 sm:inline">{seccion} <span className="px-1">/</span></span>}
            <span className="font-semibold">{pagina}</span>
          </div>
          <div className="flex h-9 items-center gap-2 rounded-lg bg-petrol-1 px-3 text-[13px] font-medium text-petrol">
            <span className="size-2 rounded-full bg-st-limpia" />
            <span className="hidden sm:inline">Turno {nombreTurno(turno.turno).toLowerCase()} ·</span>
            <span className="font-mono num">{reloj}</span>
          </div>
          <NavLink to="/reservas/nueva" className="hidden h-8 items-center gap-2 rounded-lg bg-terra-btn px-3 text-[13px] font-semibold text-white sm:inline-flex">
            <Icon name="plus" size={15} />Nueva reserva
          </NavLink>
        </header>
        <main className="flex min-w-0 flex-col gap-4 px-4 py-5 md:px-6"><Outlet /></main>
      </div>
    </div>
  )
}
