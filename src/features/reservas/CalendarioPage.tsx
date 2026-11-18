import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button, ErrorBox, Icon, Loading, Notice, Segmented } from '@/components/ui'
import { habitacionesService } from '@/services/habitacionesService'
import { reservasService } from '@/services/reservasService'
import type { HabitacionDTO } from '@/dto/habitacion'
import type { ReservaDTO } from '@/dto/reserva'
import { addDays, limaISO, limaParts } from '@/lib/time'
import { fechaDia, fechaLarga, hora } from '@/lib/format'
import { Tape, TapeLegend, type TapeBar, type TapeRow } from './Tape'
import { ReservaDrawer } from './ReservaDrawer'
import { CheckinDrawer } from '@/features/estadias/CheckinDrawer'
import { CheckoutDrawer } from '@/features/estadias/CheckoutDrawer'

type Vista = 'dia' | 'semana'

export function CalendarioPage() {
  const [vista, setVista] = useState<Vista>('dia')
  const [fecha, setFecha] = useState(() => limaParts().date)
  const [soloMov, setSoloMov] = useState(true)
  const [abierta, setAbierta] = useState<ReservaDTO | null>(null)
  const [checkin, setCheckin] = useState<ReservaDTO | null>(null)
  const [checkout, setCheckout] = useState<ReservaDTO | null>(null)

  const rango = useMemo(() => {
    if (vista === 'semana') {
      const s = reservasService.semana(fecha)
      return { desde: s.desde, hasta: s.hasta, columnas: s.dias.map((d) => fechaDia(limaISO(d, '12:00'))), dias: s.dias }
    }
    return { desde: limaISO(fecha, '08:00'), hasta: limaISO(addDays(fecha, 1), '00:00'),
      columnas: Array.from({ length: 8 }, (_, i) => `${String(8 + i * 2).padStart(2, '0')}:00`), dias: [fecha] }
  }, [vista, fecha])

  const habs = useQuery({ queryKey: ['habitaciones'], queryFn: habitacionesService.listar })
  // Se piden 1 día más hacia atrás para dibujar los bloqueos de limpieza de la víspera.
  const res = useQuery({
    queryKey: ['reservas', rango.desde, rango.hasta],
    queryFn: () => reservasService.enRango(new Date(new Date(rango.desde).getTime() - 86_400_000).toISOString(), rango.hasta),
  })

  const rows = useMemo(() => (habs.data && res.data ? construirFilas(habs.data, res.data, setAbierta) : []), [habs.data, res.data])
  const d0 = new Date(rango.desde).getTime(), d1 = new Date(rango.hasta).getTime()
  const visibles = soloMov ? rows.filter((r) => r.bars.some((b) => b.fin > d0 && b.inicio < d1)) : rows
  const hoy = limaParts().date
  const hoyCol = vista === 'semana' ? rango.dias.indexOf(hoy) : undefined
  const mover = (d: number) => setFecha((f) => addDays(f, vista === 'semana' ? d * 7 : d))

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented value={vista} onChange={setVista} label="Vista" options={[{ id: 'dia', label: 'Día' }, { id: 'semana', label: 'Semana' }]} />
          <div className="flex gap-1">
            <Button size="sm" icon="chevleft" aria-label="Anterior" onClick={() => mover(-1)} />
            <Button size="sm" onClick={() => setFecha(hoy)}>Hoy</Button>
            <Button size="sm" icon="chevright" aria-label="Siguiente" onClick={() => mover(1)} />
          </div>
          <h1 className="text-lg font-semibold">
            {vista === 'dia' ? fechaLarga(limaISO(fecha, '12:00')) : `${fechaDia(limaISO(rango.dias[0], '12:00'))} – ${fechaDia(limaISO(rango.dias[6], '12:00'))}`}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented size="sm" value={soloMov ? 'mov' : 'todas'} onChange={(v) => setSoloMov(v === 'mov')} label="Filas"
            options={[{ id: 'mov', label: 'Con movimientos' }, { id: 'todas', label: `Todas · ${rows.length}` }]} />
          <Link to="/reservas/historial" className="inline-flex h-8 items-center gap-2 rounded-lg border border-line bg-white px-3 text-[13px] font-semibold"><Icon name="history" size={15} />Historial</Link>
        </div>
      </div>
      {habs.isLoading || res.isLoading ? <Loading /> : habs.error || res.error ? <ErrorBox error={habs.error ?? res.error} /> : (
        visibles.length ? (
          <Tape rows={visibles} desde={d0} hasta={d1}
            columnas={rango.columnas} hoyCol={hoyCol != null && hoyCol >= 0 ? hoyCol : undefined} ahora={Date.now()} />
        ) : <Notice>No hay movimientos en este periodo. Elija «Todas» para ver las 35 habitaciones.</Notice>
      )}
      <TapeLegend />
      <Notice tone="warn" icon="sparkle">
        <b className="font-semibold">Regla de limpieza:</b> después de cada salida la habitación queda bloqueada hasta que recepción la marque limpia. Así no se vende un cuarto sucio el mismo día.
      </Notice>
      <ReservaDrawer reserva={abierta} onClose={() => setAbierta(null)} acciones={accionesEstadia(abierta, (r) => { setAbierta(null); setCheckin(r) }, (r) => { setAbierta(null); setCheckout(r) })} />
      <CheckinDrawer reserva={checkin} onClose={() => setCheckin(null)} />
      <CheckoutDrawer reserva={checkout} onClose={() => setCheckout(null)} />
    </>
  )
}

/** Botón principal del detalle: check-in el día de llegada, check-out si está en casa. */
function accionesEstadia(r: ReservaDTO | null, checkin: (r: ReservaDTO) => void, checkout: (r: ReservaDTO) => void) {
  if (!r) return undefined
  if (r.estado === 'en_casa') return <Button variant="primary" block icon="logout" onClick={() => checkout(r)}>Check-out</Button>
  if (r.estado === 'confirmada' && limaParts(new Date(r.entrada)).date <= limaParts().date)
    return <Button variant="dark" block icon="login" onClick={() => checkin(r)}>Check-in</Button>
  return undefined
}

/** Convierte habitaciones y reservas en filas de la cinta, con bloqueos de limpieza. */
function construirFilas(habs: HabitacionDTO[], reservas: ReservaDTO[], abrir: (r: ReservaDTO) => void): TapeRow[] {
  const ahora = Date.now()
  return habs.map((h) => {
    const propias = reservas.filter((r) => r.habitacion === h.numero).sort((a, b) => a.entrada.localeCompare(b.entrada))
    const bars: TapeBar[] = []
    if (h.estado === 'fuera_servicio') {
      bars.push({ key: 'fuera', inicio: 0, fin: Number.MAX_SAFE_INTEGER, kind: 'fuera', titulo: 'Fuera de servicio', detalle: h.motivo_fuera ?? '' })
    }
    propias.forEach((r, i) => {
      const ini = new Date(r.entrada).getTime(), fin = new Date(r.salida).getTime()
      const kind = r.estado === 'en_casa' ? 'casa' : r.estado === 'finalizada' ? 'pasada' : r.modalidad === 'promo5h' ? 'promo' : 'pagada'
      const detalle = r.estado === 'finalizada' ? `Salió ${hora(r.checkout_en ?? r.salida)}` : `${hora(r.entrada)} → ${hora(r.salida)} · ficha ${r.ficha}`
      bars.push({ key: r.id, inicio: ini, fin, kind, titulo: r.modalidad === 'promo5h' ? `${r.titular} · promo 5 h` : r.titular, detalle, onClick: () => abrir(r) })
      // Bloqueo hasta las 10:00 del día siguiente, salvo que ya esté limpia.
      const yaLimpia = fin < ahora && h.estado === 'limpia'
      if (!yaLimpia && h.estado !== 'fuera_servicio') {
        const manana = new Date(limaISO(addDays(limaParts(new Date(fin)).date, 1), '10:00')).getTime()
        const siguiente = propias[i + 1] ? new Date(propias[i + 1].entrada).getTime() : Infinity
        const hasta = Math.min(manana, siguiente)
        if (hasta > fin) bars.push({ key: `${r.id}-l`, inicio: fin, fin: hasta, kind: 'limpieza', titulo: h.estado === 'en_limpieza' ? 'En limpieza' : 'Pendiente de limpieza', detalle: 'No vendible hasta marcarla limpia' })
      }
    })
    return { numero: h.numero, categoria: habitacionesService.nombreCorto(h.categoria.nombre), estado: h.estado, bars }
  })
}
