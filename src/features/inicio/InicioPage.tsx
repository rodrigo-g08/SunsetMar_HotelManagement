import { useQuery } from '@tanstack/react-query'
import { ErrorBox, Kpi, Loading, Panel } from '@/components/ui'
import { BarrasApiladas, BarrasPorcentaje, Dona } from '@/components/ui/charts'
import { habitacionesService } from '@/services/habitacionesService'
import { reservasService } from '@/services/reservasService'
import { estadiasService } from '@/services/estadiasService'
import { reportesRepo } from '@/repositories/reportesRepo'
import { addDays, limaISO, limaParts } from '@/lib/time'
import { fechaDia, hora, money } from '@/lib/format'
import { RoomRack } from './RoomRack'
import { MovimientosHoy } from '@/features/estadias/MovimientosHoy'

const METODO_COLOR = { efectivo: '#153A43', yape: '#B46E4B', tarjeta: '#9DB4B9' } as const

export function InicioPage() {
  const hoy = limaParts().date
  const habs = useQuery({ queryKey: ['habitaciones'], queryFn: habitacionesService.listar, refetchInterval: 60_000 })
  const dash = useQuery({ queryKey: ['dashboard', hoy], queryFn: () => reportesRepo.dashboard(hoy), refetchInterval: 60_000 })
  // Misma clave que «Llegadas y salidas de hoy»: una sola consulta para ambos.
  const res = useQuery({
    queryKey: ['reservas', 'hoy', hoy],
    queryFn: () => reservasService.enRango(limaISO(addDays(hoy, -1), '12:00'), limaISO(addDays(hoy, 1), '00:00')),
    refetchInterval: 60_000,
  })

  if (habs.isLoading || dash.isLoading) return <Loading />
  if (habs.error || dash.error) return <ErrorBox error={habs.error ?? dash.error} />
  const h = habs.data!, d = dash.data!
  const occ = habitacionesService.ocupacion(h)
  const c = habitacionesService.conteo(h)
  const ventas = Number(d.alojamiento) + Number(d.ab)
  const porLlegar = res.data ? estadiasService.movimientosDelDia(res.data, hoy).filter((m) => m.tipo === 'llegada' && m.pendiente) : []
  const sucias = h.filter((x) => x.estado === 'sucia').map((x) => x.numero)
  const horaActual = limaParts().hour
  const ahoraIdx = d.ventas_por_tramo.findIndex((t, i, a) => horaActual >= t.t && (i === a.length - 1 || horaActual < a[i + 1].t))

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <section className="flex min-w-0 flex-col gap-1 rounded-panel border border-line bg-white px-5 py-3.5">
          <span className="text-xs font-medium text-ink-3">Ocupación ahora</span>
          <span className="num text-[24px] font-semibold leading-8 tracking-tight">{occ.pct} %</span>
          <div className="my-0.5 h-1.5 rounded bg-line-2"><div className="h-1.5 rounded bg-petrol" style={{ width: `${occ.pct}%` }} /></div>
          <span className="text-[12.5px] text-ink-2">{occ.ocupadas} de {occ.operativas} habitaciones operativas</span>
        </section>
        <Kpi label="Ventas del día" value={money(ventas)} detail={`Alojamiento ${money(d.alojamiento)} · A&B ${money(d.ab)}`} />
        <Kpi label="Por llegar hoy" value={porLlegar.length}
          detail={porLlegar[0] ? <><span className="font-mono">{hora(porLlegar[0].hora)}</span> · {porLlegar[0].reserva.titular} · {porLlegar[0].reserva.habitacion}</> : 'Sin llegadas pendientes'} />
        <Kpi label="Por limpiar" value={c.sucia} detail={sucias.length ? `${sucias.slice(0, 5).join(', ')}${c.en_limpieza ? ` · ${c.en_limpieza} en limpieza` : ''}` : 'Todo al día'} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
        <Panel title="Ventas del día por hora" subtitle="Soles cobrados en cada tramo" className="md:col-span-2 xl:col-span-5"
          actions={<div className="flex gap-3 text-xs text-ink-2"><span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-petrol" />Alojamiento</span><span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-[#D9A37F]" />A&amp;B</span></div>}>
          <BarrasApiladas datos={d.ventas_por_tramo.map((t) => ({ etiqueta: String(t.t).padStart(2, '0'), a: Number(t.alojamiento), b: Number(t.ab) }))}
            marca={{ idx: d.ventas_por_tramo.findIndex((t) => t.t === 14), texto: 'Turno tarde' }} ahoraIdx={ahoraIdx} />
        </Panel>
        <Panel title="Ocupación de la semana" subtitle="% de habitaciones ocupadas cada noche" className="xl:col-span-4">
          <BarrasPorcentaje datos={d.semana.map((s, i) => ({ etiqueta: i === d.semana.length - 1 ? 'Hoy' : fechaDia(limaISO(s.fecha, '12:00')).split(' ')[0], pct: Number(s.pct) }))} resaltar={d.semana.length - 1} />
        </Panel>
        <Panel title="Cobros por método" className="xl:col-span-3" bodyClassName="flex flex-col items-center gap-2 px-5 pb-4 pt-2">
          <Dona partes={(['efectivo', 'yape', 'tarjeta'] as const).map((k) => ({ valor: Number(d.por_metodo[k]), color: METODO_COLOR[k] }))} centro={`S/ ${Math.round(ventas)}`} sub="cobrado" />
          <div className="w-full">
            {(['efectivo', 'yape', 'tarjeta'] as const).map((k) => (
              <div key={k} className="flex justify-between border-b border-line-2 py-1 text-[13px] capitalize last:border-0">
                <span className="inline-flex items-center gap-2 text-ink-2"><span className="size-2 rounded-full" style={{ background: METODO_COLOR[k] }} />{k}</span>
                <span className="num font-medium">{money(d.por_metodo[k])}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <MovimientosHoy className="xl:col-span-7" />
        <Panel title={`Estado de las ${h.length} habitaciones`} className="xl:col-span-5"><RoomRack habitaciones={h} /></Panel>
      </div>
    </>
  )
}
