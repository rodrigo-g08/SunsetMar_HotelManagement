import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, ErrorBox, Icon, Loading, Notice, PageHeader, Panel, Segmented, SelectInput, TextInput, cx } from '@/components/ui'
import { METODOS, type MetodoPago } from '@/dto/common'
import { CANALES, type Canal, type Modalidad, type NuevaReservaDTO } from '@/dto/reserva'
import type { HabitacionDTO } from '@/dto/habitacion'
import { useTurno } from '@/context/SessionContext'
import { habitacionesService } from '@/services/habitacionesService'
import { cotizar, promoDisponible, ReglaError } from '@/services/pricingService'
import { reservasService, LimpiezaPendienteError } from '@/services/reservasService'
import { addHours, limaISO, limaParts } from '@/lib/time'
import { digits, fechaDia, hora, money } from '@/lib/format'
import { CheckinDrawer } from '@/features/estadias/CheckinDrawer'
import type { ReservaDTO } from '@/dto/reserva'
import { useCajaAbierta } from '@/features/caja/CajaLayout'
import { Link } from 'react-router-dom'

type Grupo = 'todas' | 'matrimonial' | 'suites' | 'grupos'
const GRUPO: Record<Exclude<Grupo, 'todas'>, (n: string) => boolean> = {
  matrimonial: (n) => n.startsWith('Matrimonial'),
  suites: (n) => /Suite/.test(n),
  grupos: (n) => /Doble|Triple|Departamento/.test(n),
}

export function NuevaReservaPage() {
  const turno = useTurno()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const ahora = limaParts()

  const [historica, setHistorica] = useState(false)
  const [modalidad, setModalidad] = useState<Modalidad>('noche')
  const [fecha, setFecha] = useState(ahora.date)
  const [horaEnt, setHoraEnt] = useState(() => `${String(Math.max(ahora.hour, 13)).padStart(2, '0')}:00`)
  const [noches, setNoches] = useState(1)
  const [personas, setPersonas] = useState(2)
  const [grupo, setGrupo] = useState<Grupo>('todas')
  const [hab, setHab] = useState<string | null>(null)
  const [titular, setTitular] = useState('')
  const [documento, setDocumento] = useState('')
  const [canal, setCanal] = useState<Canal>('recepcion')
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo')
  const [ficha, setFicha] = useState('')
  const [pedirLimpieza, setPedirLimpieza] = useState<string | null>(null)
  const [hecho, setHecho] = useState<{ texto: string; id: string; hoy: boolean } | null>(null)
  const [checkin, setCheckin] = useState<ReservaDTO | null>(null)

  const caja = useCajaAbierta()
  const entrada = limaISO(fecha, horaEnt || '13:00')
  const habs = useQuery({ queryKey: ['habitaciones'], queryFn: habitacionesService.listar })
  const cfg = useQuery({ queryKey: ['config'], queryFn: habitacionesService.config })
  const sugerida = useQuery({ queryKey: ['siguiente-ficha'], queryFn: reservasService.siguienteFicha })
  const salidaEstimada = cfg.data
    ? modalidad === 'promo5h' ? addHours(entrada, cfg.data.promo_horas) : limaISO(limaParts(new Date(addHours(entrada, 24 * noches))).date, cfg.data.hora_checkout)
    : entrada
  const res = useQuery({
    queryKey: ['reservas', 'disp', entrada, salidaEstimada],
    queryFn: () => reservasService.enRango(new Date(new Date(entrada).getTime() - 86_400_000).toISOString(), salidaEstimada),
    enabled: !!cfg.data,
  })

  const promoOk = cfg.data ? promoDisponible(cfg.data, entrada) : false
  useEffect(() => { if (!promoOk && modalidad === 'promo5h') setModalidad('noche') }, [promoOk, modalidad])

  const opciones = useMemo(() => {
    if (!habs.data || !cfg.data || !res.data) return []
    return habs.data
      .filter((h) => grupo === 'todas' || GRUPO[grupo](h.categoria.nombre))
      .map((h) => {
        let precio: number | null = null
        let regla: string | null = null
        try { precio = cotizar(h.categoria, cfg.data!, modalidad, entrada, noches, personas).total } catch (e) { regla = e instanceof ReglaError ? e.message : 'No disponible' }
        const disp = reservasService.disponibilidad(h, res.data!, entrada, salidaEstimada, historica)
        return { h, precio, regla, disp }
      })
      .filter((o) => o.precio != null && o.disp.estado !== 'no')
  }, [habs.data, cfg.data, res.data, grupo, modalidad, entrada, noches, personas, salidaEstimada, historica])

  const elegida = opciones.find((o) => o.h.numero === hab)
  useEffect(() => { if (hab && !elegida) setHab(null) }, [hab, elegida])

  const crear = useMutation({
    mutationFn: (forzar: boolean) => {
      const dto: NuevaReservaDTO = {
        habitacion: hab!, modalidad, entrada, noches: modalidad === 'noche' ? noches : 0, personas,
        titular, documento: documento || undefined, canal, metodo, ficha: ficha || sugerida.data || '', historica, forzar_limpieza: forzar,
      }
      return reservasService.crear(dto, turno)
    },
    onSuccess: (id) => {
      setHecho({ id, hoy: !historica && fecha === limaParts().date,
        texto: `Reserva registrada en la ${hab}: ${money(elegida?.precio)} ${historica ? 'registrados' : `cobrados con ${METODOS.find((m) => m.id === metodo)?.nombre.toLowerCase()}`}.` })
      setHab(null); setTitular(''); setDocumento(''); setFicha(''); setPedirLimpieza(null)
      qc.invalidateQueries({ queryKey: ['reservas'] }); qc.invalidateQueries({ queryKey: ['siguiente-ficha'] }); qc.invalidateQueries({ queryKey: ['movimientos'] })
    },
    onError: (e) => { if (e instanceof LimpiezaPendienteError) setPedirLimpieza(e.message) },
  })

  if (habs.isLoading || cfg.isLoading) return <Loading />
  if (habs.error || cfg.error) return <ErrorBox error={habs.error ?? cfg.error} />

  const puedeGuardar = hab && titular.trim().length >= 3 && (ficha || sugerida.data) && !crear.isPending
  const errorVisible = crear.error && !(crear.error instanceof LimpiezaPendienteError) ? crear.error : null

  return (
    <>
      <PageHeader title="Nueva reserva" subtitle="Tres decisiones y un cobro. Sirve para WhatsApp, teléfono, Booking, atención directa y para cargar reservas pasadas."
        actions={<label className={cx('inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[13px] font-medium', historica ? 'border-info bg-info-1 text-info' : 'border-line bg-white')}>
          <input type="checkbox" checked={historica} onChange={(e) => setHistorica(e.target.checked)} className="size-4 accent-petrol" />Reserva pasada (carga histórica)
        </label>} />
      {hecho && <Notice tone="ok" icon="check">
        <div className="flex flex-wrap items-center gap-3">{hecho.texto}
          {hecho.hoy && <Button size="sm" variant="dark" icon="login" onClick={async () => setCheckin(await reservasService.porId(hecho.id))}>Hacer check-in ahora</Button>}
        </div>
      </Notice>}
      <CheckinDrawer reserva={checkin} onClose={() => { setCheckin(null); setHecho(null) }} />
      {!historica && caja.isSuccess && !caja.data && <Notice tone="warn">La caja está cerrada. <Link to="/caja" className="font-semibold underline">Abra la caja del turno</Link> para cobrar la reserva.</Notice>}
      {historica && <Notice tone="info">Modo carga histórica: registra estadías ya terminadas para alimentar el historial y los reportes. No cambia el estado de las habitaciones ni la caja del turno.</Notice>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Panel title="1 · Estadía" className="lg:col-span-4" bodyClassName="flex flex-col gap-4 px-5 py-4">
          <div className="flex flex-col gap-1"><span className="text-xs font-medium text-ink-2">Modalidad</span>
            <Segmented block value={modalidad} onChange={setModalidad} options={[{ id: 'noche', label: 'Por noche' }, { id: 'promo5h', label: 'Promo 5 h', disabled: !promoOk }]} />
            {!promoOk && <span className="text-xs text-ink-3">La promo de 5 horas solo aplica de lunes a jueves.</span>}
          </div>
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-3"><TextInput label="Fecha de entrada" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
            <div className="col-span-2"><TextInput label="Hora" type="time" value={horaEnt} onChange={(e) => setHoraEnt(e.target.value)} /></div>
          </div>
          {modalidad === 'noche' && <TextInput label="Noches" type="number" min={1} max={30} value={noches} onChange={(e) => setNoches(Math.max(1, Number(e.target.value)))} />}
          <div className="flex items-center gap-2 rounded-lg bg-canvas px-3 py-2.5 text-[13px] text-ink-2"><Icon name="clock" size={16} />
            Salida: <b className="font-medium text-ink">{fechaDia(salidaEstimada)} · <span className="font-mono">{hora(salidaEstimada)}</span></b></div>
          <div className="flex flex-col gap-1"><span className="text-xs font-medium text-ink-2">Personas</span>
            <Segmented block value={String(personas)} onChange={(v) => setPersonas(Number(v))} options={['1', '2', '3', '4'].map((n) => ({ id: n, label: n }))} />
            <span className="text-xs text-ink-3">Cada persona sobre la capacidad base suma {money(cfg.data!.adicional_persona)}{modalidad === 'noche' ? ' por noche' : ''}.</span>
          </div>
        </Panel>

        <Panel title="2 · Habitación" subtitle={`${opciones.length} disponibles para esta estadía`} className="lg:col-span-5"
          actions={<Segmented size="sm" value={grupo} onChange={setGrupo} options={[{ id: 'todas', label: 'Todas' }, { id: 'matrimonial', label: 'Matrim.' }, { id: 'suites', label: 'Suites' }, { id: 'grupos', label: '3+ pers.' }]} />}>
          {res.isLoading ? <Loading /> : opciones.length === 0 ? <Notice tone="warn">No hay habitaciones disponibles con estos datos. Pruebe otra fecha, modalidad o número de personas.</Notice> : (
            <div className="grid max-h-[440px] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
              {opciones.map(({ h, precio, disp }) => (
                <RoomOption key={h.numero} h={h} precio={precio!} on={hab === h.numero} aviso={disp.estado === 'limpieza' ? disp.motivo : undefined} onClick={() => setHab(h.numero)} />
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-ink-3">Se ocultan las habitaciones con estadía en ese horario, fuera de servicio{historica ? '' : ' y, para hoy, las que no están limpias'}.</p>
        </Panel>

        <Panel title="3 · Huésped y cobro" className="lg:col-span-3" bodyClassName="flex flex-col gap-3 px-5 py-4">
          <TextInput label="Apellidos y nombres del titular" value={titular} onChange={(e) => setTitular(e.target.value)} />
          <TextInput label="DNI o pasaporte (opcional)" mono value={documento} onChange={(e) => setDocumento(e.target.value.toUpperCase().slice(0, 15))} />
          <SelectInput label="Canal" value={canal} onChange={(e) => setCanal(e.target.value as Canal)}>{CANALES.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</SelectInput>
          <div className="flex flex-col gap-1"><span className="text-xs font-medium text-ink-2">Método de pago</span>
            <Segmented block value={metodo} onChange={setMetodo} options={METODOS.map((m) => ({ id: m.id, label: m.nombre }))} /></div>
          <TextInput label="N.º de ficha de alojamiento" mono inputMode="numeric" value={ficha} placeholder={sugerida.data ?? ''}
            onChange={(e) => setFicha(digits(e.target.value).slice(0, 8))} hint={`Digite el número de la ficha de papel${sugerida.data ? ` (siguiente: ${sugerida.data})` : ''}.`} />
          <div className="mt-1 h-px bg-line-2" />
          <div className="flex items-baseline justify-between"><span className="text-[13px] text-ink-2">{hab ? `${hab} · ${modalidad === 'noche' ? `${noches} noche${noches > 1 ? 's' : ''}` : 'promo 5 h'}` : 'Elija una habitación'}</span>
            <b className="num text-[22px] font-semibold">{money(elegida?.precio ?? 0)}</b></div>
          {pedirLimpieza && (
            <Notice tone="warn" icon="sparkle">{pedirLimpieza}. ¿Confirma que estará limpia a la hora de entrada?
              <div className="mt-2 flex gap-2"><Button size="sm" variant="dark" onClick={() => crear.mutate(true)}>Sí, estará limpia</Button><Button size="sm" onClick={() => setPedirLimpieza(null)}>Elegir otra</Button></div>
            </Notice>
          )}
          {errorVisible && <ErrorBox error={errorVisible} />}
          <Button variant="primary" size="lg" block disabled={!puedeGuardar} loading={crear.isPending} onClick={() => crear.mutate(false)}>
            {historica ? 'Registrar reserva pasada' : `Cobrar ${money(elegida?.precio ?? 0)} y registrar`}
          </Button>
          <Button variant="ghost" block onClick={() => navigate('/reservas')}>Volver al calendario</Button>
        </Panel>
      </div>
    </>
  )
}

function RoomOption({ h, precio, on, aviso, onClick }: { h: HabitacionDTO; precio: number; on: boolean; aviso?: string; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cx('flex min-w-0 flex-col gap-1 rounded-xl border bg-white px-3 py-2.5 text-left', on ? 'border-petrol bg-petrol-1 ring-1 ring-petrol' : 'border-line hover:border-ink-3')}>
      <span className="flex items-center justify-between"><span className="font-mono text-base font-medium">{h.numero}</span><span className="num text-[13px] font-semibold">{money(precio)}</span></span>
      <span className="truncate text-xs text-ink-3">{habitacionesService.nombreCorto(h.categoria.nombre)}</span>
      {aviso && <span className="truncate text-[11.5px] font-medium text-warn">{aviso}</span>}
    </button>
  )
}
