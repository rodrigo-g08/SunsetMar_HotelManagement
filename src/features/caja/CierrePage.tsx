import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, ErrorBox, Icon, Loading, Notice, Panel, TextInput, cx } from '@/components/ui'
import { DENOMINACIONES } from '@/dto/caja'
import { useTurno } from '@/context/SessionContext'
import { cajaService, repartir, totalContado } from '@/services/cajaService'
import { habitacionesService } from '@/services/habitacionesService'
import { money } from '@/lib/format'
import { nombreTurno } from '@/lib/time'
import { useCajaAbierta } from './CajaLayout'

export function CierrePage() {
  const turno = useTurno()
  const qc = useQueryClient()
  const caja = useCajaAbierta()
  const cfg = useQuery({ queryKey: ['config'], queryFn: habitacionesService.config })
  const resumen = useQuery({ queryKey: ['caja', 'resumen', caja.data?.id], queryFn: () => cajaService.resumen(caja.data!.id), enabled: !!caja.data })
  const [cant, setCant] = useState<Record<string, number>>({})
  const [recibe, setRecibe] = useState('')
  const [obs, setObs] = useState('')
  const [resultado, setResultado] = useState<{ contado: number; diferencia: number; entregado: number; queda_fondo: number } | null>(null)

  const cerrar = useMutation({
    mutationFn: () => cajaService.cerrar(caja.data!.id, Object.fromEntries(DENOMINACIONES.map((d) => [String(d.valor), cant[d.valor] ?? 0])), recibe, obs, turno),
    onSuccess: (r) => { setResultado(r); qc.invalidateQueries({ queryKey: ['caja'] }) },
  })

  if (resultado) return (
    <Notice tone={Number(resultado.diferencia) === 0 ? 'ok' : 'warn'} icon={Number(resultado.diferencia) === 0 ? 'check' : 'alert'}>
      Caja cerrada. Contado {money(resultado.contado)} · diferencia {money(resultado.diferencia)}. Quedan {money(resultado.queda_fondo)} de fondo y se entregan {money(resultado.entregado)}. El siguiente turno abre la caja con ese fondo.
    </Notice>
  )
  if (caja.isLoading || cfg.isLoading) return <Loading />
  if (!caja.data) return <Notice tone="warn">No hay una caja abierta para cerrar.</Notice>

  const contado = totalContado(cant)
  const esperado = Number(resumen.data?.esperado ?? 0)
  const dif = Math.round((contado - esperado) * 100) / 100
  const { queda, entrega } = repartir(contado, cfg.data!.fondo_fijo)
  const cuadra = dif === 0

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <Panel title="Conteo del cajón" subtitle="Ingrese la cantidad de cada billete y moneda" className="lg:col-span-6" bodyClassName="pt-2 overflow-x-auto">
        <table className="w-full text-[13.5px]">
          <thead><tr className="border-b border-line text-left text-xs text-ink-3"><th className="py-2 pl-5 font-medium">Tipo</th><th className="font-medium">Valor</th><th className="font-medium">Cantidad</th><th className="pr-5 text-right font-medium">Subtotal</th></tr></thead>
          <tbody>
            {DENOMINACIONES.map((d) => {
              const n = cant[d.valor] ?? 0
              return (
                <tr key={d.valor} className="border-b border-line-2">
                  <td className="py-1.5 pl-5 text-xs text-ink-3">{d.tipo}</td>
                  <td className="num font-semibold">S/ {d.valor < 1 ? d.valor.toFixed(2) : d.valor}</td>
                  <td><input aria-label={`Cantidad de S/ ${d.valor}`} inputMode="numeric" value={n || ''} placeholder="0"
                    onChange={(e) => setCant((c) => ({ ...c, [d.valor]: Number(e.target.value.replace(/\D/g, '').slice(0, 4)) }))}
                    className="h-8 w-20 rounded-lg border border-line text-center font-mono focus:border-petrol focus:outline-none" /></td>
                  <td className={cx('num pr-5 text-right', n ? 'text-ink' : 'text-ink-3')}>{money(d.valor * n)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot><tr><td colSpan={3} className="py-3 pl-5 font-semibold">Efectivo contado</td><td className="num pr-5 text-right text-lg font-semibold">{money(contado)}</td></tr></tfoot>
        </table>
      </Panel>
      <section className="flex flex-col overflow-hidden rounded-panel border border-line bg-white lg:col-span-6">
        <div className={cx('flex items-center gap-3 px-5 py-4', contado === 0 ? 'bg-canvas text-ink-2' : cuadra ? 'bg-ok-1 text-ok' : 'bg-bad-1 text-bad')}>
          <span className={cx('grid size-9 place-items-center rounded-full text-white', contado === 0 ? 'bg-ink-3' : cuadra ? 'bg-ok' : 'bg-bad')}><Icon name={cuadra ? 'check' : 'alert'} size={18} stroke={2.4} /></span>
          <div><b className="block text-base font-semibold">{contado === 0 ? 'Cuente el efectivo' : cuadra ? 'Caja cuadrada' : dif > 0 ? `Sobran ${money(dif)}` : `Faltan ${money(-dif)}`}</b>
            <span className="text-[13px]">Contado {money(contado)} · esperado {money(esperado)}</span></div>
        </div>
        <div className="px-5 py-2">
          {[['Fondo recibido', money(resumen.data?.fondo)], ['Cobros en efectivo', `+ ${money(resumen.data?.ingresos_efectivo)}`], ['Egresos y devoluciones', `− ${money(resumen.data?.egresos_efectivo)}`]].map(([a, b]) => (
            <div key={a} className="flex justify-between border-b border-line-2 py-2 text-[13.5px]"><span className="text-ink-2">{a}</span><span className="num">{b}</span></div>
          ))}
          <div className="flex justify-between py-2 text-[13.5px] font-semibold"><span>Esperado en caja</span><span className="num">{money(esperado)}</span></div>
        </div>
        <div className="grid grid-cols-2 gap-3 px-5">
          <div className="rounded-xl bg-canvas px-4 py-3"><span className="text-xs font-medium text-ink-3">Queda como fondo</span><b className="num block text-xl font-semibold">{money(queda)}</b></div>
          <div className="rounded-xl border-2 border-petrol px-4 py-3"><span className="text-xs font-medium text-ink-3">Se entrega</span><b className="num block text-xl font-semibold">{money(entrega)}</b></div>
        </div>
        <p className="px-5 pt-2 text-xs text-ink-3">Yape {money(resumen.data?.yape)} y tarjeta {money(resumen.data?.tarjeta)} se informan aparte; no entran al cajón.</p>
        <div className="mt-auto flex flex-col gap-3 px-5 py-4">
          <TextInput label="Recibe la caja" value={recibe} onChange={(e) => setRecibe(e.target.value)} placeholder="Nombre de quien recibe" />
          <TextInput label="Observaciones" value={obs} onChange={(e) => setObs(e.target.value)} placeholder={cuadra ? 'Opcional' : 'Explique la diferencia'} />
          {cerrar.error && <ErrorBox error={cerrar.error} />}
          <Button variant="primary" size="lg" block icon="lock" disabled={contado === 0 || (!cuadra && obs.trim().length < 3)} loading={cerrar.isPending} onClick={() => cerrar.mutate()}>
            Cerrar caja del turno {nombreTurno(caja.data.turno).toLowerCase()}
          </Button>
        </div>
      </section>
    </div>
  )
}
