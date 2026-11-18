import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button, ErrorBox, Icon, Loading, Panel, Tag, cx } from '@/components/ui'
import type { ReservaDTO } from '@/dto/reserva'
import { reservasService } from '@/services/reservasService'
import { estadiasService } from '@/services/estadiasService'
import { addDays, limaISO, limaParts } from '@/lib/time'
import { hora, money } from '@/lib/format'
import { CheckinDrawer } from './CheckinDrawer'
import { CheckoutDrawer } from './CheckoutDrawer'

/** Llegadas y salidas de hoy, con acceso directo al check-in y check-out. */
export function MovimientosHoy({ className }: { className?: string }) {
  const hoy = limaParts().date
  const q = useQuery({
    queryKey: ['reservas', 'hoy', hoy],
    queryFn: () => reservasService.enRango(limaISO(addDays(hoy, -1), '12:00'), limaISO(addDays(hoy, 1), '00:00')),
    refetchInterval: 60_000,
  })
  const [checkin, setCheckin] = useState<ReservaDTO | null>(null)
  const [checkout, setCheckout] = useState<ReservaDTO | null>(null)
  const navigate = useNavigate()
  const items = q.data ? estadiasService.movimientosDelDia(q.data, hoy) : []

  return (
    <Panel title="Llegadas y salidas de hoy" subtitle="Check-out a las 12:00 · check-in desde las 13:00" className={className} bodyClassName="pt-3"
      actions={<Link to="/reservas" className="text-[13px] font-semibold text-ink-2 hover:text-ink">Ver calendario</Link>}>
      {q.isLoading ? <div className="px-5"><Loading /></div> : q.error ? <div className="px-5 pb-4"><ErrorBox error={q.error} /></div> :
        items.length === 0 ? <p className="px-5 pb-5 text-[13px] text-ink-3">No hay llegadas ni salidas programadas hoy.</p> : (
          <ul>
            {items.map((m) => {
              const r = m.reserva
              const hecho = !m.pendiente
              return (
                <li key={r.id + m.tipo} className="flex items-center gap-3 border-t border-line-2 px-5 py-2">
                  <span className={cx('w-11 font-mono', hecho && 'opacity-55')}>{hora(m.hora)}</span>
                  <Tag tone={m.tipo === 'llegada' ? 'petrol' : 'terra'} className={cx('hidden w-16 justify-center sm:inline-flex', hecho && 'opacity-55')}>{m.tipo === 'llegada' ? 'Llegada' : 'Salida'}</Tag>
                  <span className={cx('w-8 font-mono font-medium', hecho && 'opacity-55')}>{r.habitacion}</span>
                  <div className={cx('flex min-w-0 flex-1 flex-col', hecho && 'opacity-55')}>
                    <b className="truncate text-[13.5px] font-semibold">{r.titular}</b>
                    <span className="truncate text-xs text-ink-3">{r.modalidad === 'promo5h' ? 'Promo 5 h' : 'Por noche'}{r.personas > 2 ? ` · ${r.personas} pers.` : ''} · pagado {money(r.total)}</span>
                  </div>
                  {hecho ? <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-ok"><Icon name="check" size={15} stroke={2.2} />Hecho</span>
                    : m.tipo === 'llegada' ? <Button size="sm" variant="dark" onClick={() => setCheckin(r)}>Check-in</Button>
                    : <Button size="sm" onClick={() => setCheckout(r)}>Check-out</Button>}
                </li>
              )
            })}
          </ul>
        )}
      <CheckinDrawer reserva={checkin} onClose={() => setCheckin(null)} />
      <CheckoutDrawer reserva={checkout} onClose={() => setCheckout(null)}
        extra={checkout && <FrigobarAviso onRegistrar={() => navigate(`/caja/venta?hab=${checkout.habitacion}`)} />} />
    </Panel>
  )
}

export function FrigobarAviso({ onRegistrar }: { onRegistrar: () => void }) {
  return (
    <section className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
      <div><h3 className="text-[14px] font-semibold">¿Consumió algo del frigobar?</h3><p className="text-xs text-ink-3">Se cobra antes de la salida con su ficha A&amp;B.</p></div>
      <Button size="sm" icon="plus" onClick={onRegistrar}>Registrar consumo</Button>
    </section>
  )
}
