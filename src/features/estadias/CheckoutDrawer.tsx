import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Drawer, EstadoDot, ErrorBox, Icon } from '@/components/ui'
import type { ReservaDTO } from '@/dto/reserva'
import { useTurno } from '@/context/SessionContext'
import { estadiasService } from '@/services/estadiasService'
import { fechaDia, hora, money } from '@/lib/format'

/** Check-out en un paso: la estadía ya está pagada; la habitación queda sucia. */
export function CheckoutDrawer({ reserva, onClose, extra }: { reserva: ReservaDTO | null; onClose: () => void; extra?: React.ReactNode }) {
  const turno = useTurno()
  const qc = useQueryClient()
  const ok = useMutation({
    mutationFn: () => estadiasService.checkout(reserva!.id, turno),
    onSuccess: () => { ['reservas', 'habitaciones', 'historial-hab'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); onClose() },
  })
  if (!reserva) return null
  const anticipada = new Date(reserva.salida).getTime() - Date.now() > 30 * 60_000

  return (
    <Drawer open onClose={onClose}
      title={<div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-ink-3">Check-out · ficha {reserva.ficha}</span>
        <div className="flex items-baseline gap-3"><span className="font-mono text-[28px] font-medium leading-8">{reserva.habitacion}</span><h2 className="text-lg font-semibold">{reserva.titular}</h2></div>
        <span className="text-[13px] text-ink-2">{reserva.modalidad === 'promo5h' ? 'Promo 5 h' : 'Por noche'} · {fechaDia(reserva.entrada)} <span className="font-mono">{hora(reserva.entrada)}</span> → <span className="font-mono">{hora(reserva.salida)}</span></span>
      </div>}
      footer={<Button variant="primary" size="lg" block icon="logout" loading={ok.isPending} onClick={() => ok.mutate()}>Registrar salida</Button>}>
      <div className="flex items-center justify-between rounded-xl bg-ok-1 px-4 py-3.5 text-ok">
        <span className="flex items-center gap-2 font-semibold"><Icon name="check" size={18} stroke={2.2} />Estadía pagada</span>
        <span className="num font-semibold">{money(reserva.total)}</span>
      </div>
      {extra}
      <section className="flex flex-col gap-2">
        <h3 className="text-[15px] font-semibold">Al confirmar</h3>
        <div className="flex items-center gap-2 rounded-xl border border-line px-3.5 py-3"><EstadoDot estado="ocupada" /><Icon name="arrowright" size={15} className="text-ink-3" /><EstadoDot estado="sucia" /></div>
        <p className="text-[13px] text-ink-2">La {reserva.habitacion} queda bloqueada para la venta hasta que recepción la marque limpia.</p>
        {anticipada && <p className="text-[13px] text-warn">Salida anticipada: la salida programada era a las {hora(reserva.salida)}. El horario restante queda libre.</p>}
      </section>
      <p className="mt-auto flex items-center gap-2 text-xs text-ink-3"><Icon name="clock" size={15} />Se registra a nombre de {turno.recepcionista}.</p>
      {ok.error && <ErrorBox error={ok.error} />}
    </Drawer>
  )
}
