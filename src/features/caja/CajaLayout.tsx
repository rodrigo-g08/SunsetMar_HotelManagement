import { NavLink, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader, Tag, cx } from '@/components/ui'
import { cajaService } from '@/services/cajaService'
import { fechaLarga, hora } from '@/lib/format'
import { nombreTurno } from '@/lib/time'

const TABS = [
  { to: '/caja', label: 'Turno actual', end: true },
  { to: '/caja/venta', label: 'Venta A&B' },
  { to: '/caja/cierre', label: 'Cierre' },
  { to: '/caja/reporte', label: 'Reporte diario' },
]

export function useCajaAbierta() {
  return useQuery({ queryKey: ['caja', 'abierta'], queryFn: cajaService.abierta, refetchInterval: 60_000 })
}

export function CajaLayout() {
  const caja = useCajaAbierta()
  return (
    <>
      <PageHeader title="Caja" subtitle={fechaLarga(new Date().toISOString())}
        actions={caja.data ? <Tag tone="ok">Abierta · turno {nombreTurno(caja.data.turno).toLowerCase()} desde {hora(caja.data.apertura_en)} · {caja.data.recepcionista}</Tag>
          : caja.isSuccess ? <Tag tone="warn">Caja cerrada</Tag> : null} />
      <nav aria-label="Caja" className="-mt-1 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end}
            className={({ isActive }) => cx('-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-[13.5px]', isActive ? 'border-terra font-semibold text-ink' : 'border-transparent font-medium text-ink-2 hover:text-ink')}>
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </>
  )
}
