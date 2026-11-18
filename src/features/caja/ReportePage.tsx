import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, ErrorBox, Kpi, Loading, Panel, Tag, TextInput } from '@/components/ui'
import { cajaService, TIPO_MOV } from '@/services/cajaService'
import { addDays, limaISO, limaParts, nombreTurno } from '@/lib/time'
import { hora, money } from '@/lib/format'
import { descargar } from '@/lib/csv'
import type { Turno } from '@/dto/common'

export function ReportePage() {
  const [fecha, setFecha] = useState(limaParts().date)
  const q = useQuery({ queryKey: ['reporte', fecha], queryFn: () => cajaService.reporteDiario(fecha) })

  async function csv() {
    const rows = await cajaService.movimientosRango(limaISO(fecha, '00:00'), limaISO(addDays(fecha, 1), '00:00'))
    descargar(`sunsetmar-caja-${fecha}.csv`, cajaService.csvMovimientos(rows))
  }

  if (q.isLoading) return <Loading />
  if (q.error) return <ErrorBox error={q.error} />
  const r = q.data!
  const ingresos = Number(r.alojamiento) + Number(r.ab)
  const maxTurno = Math.max(1, ...Object.values(r.por_turno).map(Number))

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div className="w-44"><TextInput label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
        <div className="flex gap-2"><Button size="sm" icon="printer" onClick={() => window.print()}>Imprimir</Button><Button size="sm" icon="download" onClick={csv}>CSV</Button></div>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Ingresos" value={money(ingresos)} detail={`Alojamiento ${money(r.alojamiento)} · A&B ${money(r.ab)}`} />
        <Kpi label="Egresos y devoluciones" value={money(r.egresos)} />
        <Kpi label="Balance del día" value={money(r.balance)} detail="Ingresos menos egresos" />
        <Kpi label="Efectivo + Yape" value={money(Number(r.por_metodo.efectivo) + Number(r.por_metodo.yape))} detail={`Tarjeta ${money(r.por_metodo.tarjeta)}`} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Panel title="Movimientos del día" subtitle={`${r.movimientos.length} movimientos`} className="lg:col-span-8" bodyClassName="pt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13.5px]">
            <thead><tr className="border-b border-line text-left text-xs text-ink-3">
              {['Hora', 'Turno', 'Tipo', 'Ficha', 'Concepto', 'Método', 'Importe'].map((h, i) => <th key={h} className={`py-2 font-medium ${i === 0 ? 'pl-5' : ''} ${i === 6 ? 'pr-5 text-right' : ''}`}>{h}</th>)}
            </tr></thead>
            <tbody>
              {r.movimientos.map((m, i) => {
                const s = TIPO_MOV[m.tipo].signo
                return (
                  <tr key={i} className="border-b border-line-2">
                    <td className="py-2.5 pl-5 font-mono">{hora(m.fecha)}</td>
                    <td className="text-ink-2">{nombreTurno(m.turno)}</td>
                    <td><Tag tone={m.tipo === 'alojamiento' ? 'petrol' : m.tipo === 'ab' ? 'terra' : 'bad'}>{TIPO_MOV[m.tipo].nombre}</Tag></td>
                    <td className="font-mono">{m.ficha ?? '—'}</td>
                    <td className="max-w-64 truncate">{m.concepto}</td>
                    <td className="capitalize">{m.metodo}</td>
                    <td className={`num pr-5 text-right font-medium ${s < 0 ? 'text-bad' : ''}`}>{s < 0 ? '− ' : ''}{money(m.importe)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot><tr><td colSpan={6} className="py-3 pl-5 font-semibold">Balance del día</td><td className="num pr-5 text-right font-semibold">{money(r.balance)}</td></tr></tfoot>
          </table>
        </Panel>
        <div className="flex flex-col gap-4 lg:col-span-4">
          <Panel title="Por método">
            {(['efectivo', 'yape', 'tarjeta'] as const).map((k) => (
              <div key={k} className="flex justify-between border-b border-line-2 py-2 text-[13.5px] capitalize last:border-0"><span className="text-ink-2">{k}</span><span className="num font-medium">{money(r.por_metodo[k])}</span></div>
            ))}
          </Panel>
          <Panel title="Por turno">
            <div className="flex flex-col gap-3">
              {(['noche', 'manana', 'tarde'] as Turno[]).filter((t) => r.por_turno[t] != null).map((t) => (
                <div key={t} className="flex flex-col gap-1">
                  <div className="flex justify-between text-[13.5px]"><span className="text-ink-2">{nombreTurno(t)}</span><span className="num font-semibold">{money(r.por_turno[t])}</span></div>
                  <div className="h-2 rounded bg-line-2"><div className="h-2 rounded bg-petrol" style={{ width: `${(Number(r.por_turno[t]) / maxTurno) * 100}%` }} /></div>
                </div>
              ))}
              {!Object.keys(r.por_turno).length && <p className="text-[13px] text-ink-3">Sin movimientos.</p>}
            </div>
          </Panel>
          <Panel title="Cierres de caja">
            {r.cajas.length ? r.cajas.map((c) => (
              <div key={c.id} className="flex justify-between border-b border-line-2 py-2 text-[13px] last:border-0">
                <span>{nombreTurno(c.turno)} · {c.recepcionista}</span>
                <span className="num">{c.estado === 'cerrada' ? `${money(c.contado)} · dif. ${money(c.diferencia)}` : 'Abierta'}</span>
              </div>
            )) : <p className="text-[13px] text-ink-3">Sin cajas este día.</p>}
          </Panel>
        </div>
      </div>
    </>
  )
}
