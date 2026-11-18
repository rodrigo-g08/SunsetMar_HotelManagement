import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, ErrorBox, Icon, Kpi, Loading, Modal, Notice, Panel, Segmented, Tag, TextInput } from '@/components/ui'
import { METODOS, type MetodoPago } from '@/dto/common'
import { useTurno } from '@/context/SessionContext'
import { cajaService, TIPO_MOV } from '@/services/cajaService'
import { habitacionesService } from '@/services/habitacionesService'
import { addDays, limaISO, limaParts, nombreTurno } from '@/lib/time'
import { hora, money } from '@/lib/format'
import { useCajaAbierta } from './CajaLayout'

export function CajaTurnoPage() {
  const caja = useCajaAbierta()
  if (caja.isLoading) return <Loading />
  if (caja.error) return <ErrorBox error={caja.error} />
  return caja.data ? <CajaAbierta id={caja.data.id} /> : <Apertura />
}

function Apertura() {
  const turno = useTurno()
  const qc = useQueryClient()
  const ultima = useQuery({ queryKey: ['caja', 'ultima'], queryFn: cajaService.ultimaCerrada })
  const cfg = useQuery({ queryKey: ['config'], queryFn: habitacionesService.config })
  const [fondo, setFondo] = useState<string>('')
  const sugerido = ultima.data?.queda_fondo ?? cfg.data?.fondo_fijo ?? 140
  const abrir = useMutation({
    mutationFn: () => cajaService.abrir(turno.turno, Number(fondo || sugerido), turno),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['caja'] }),
  })
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <Panel title="Abrir caja del turno" subtitle={`Turno ${nombreTurno(turno.turno).toLowerCase()} · ${turno.recepcionista}`} className="lg:col-span-5" bodyClassName="flex flex-col gap-4 px-5 py-4">
        {ultima.data && (
          <div className="rounded-lg bg-canvas px-4 py-3 text-[13px]">
            <div className="flex items-center gap-2 font-semibold">
              {Number(ultima.data.diferencia) === 0 ? <Icon name="check" size={16} className="text-ok" stroke={2.2} /> : <Icon name="alert" size={16} className="text-bad" />}
              Último cierre: turno {nombreTurno(ultima.data.turno).toLowerCase()} · {ultima.data.cerrado_por}
            </div>
            <p className="mt-1 text-ink-2">Contado {money(ultima.data.contado)} · diferencia {money(ultima.data.diferencia)} · dejó {money(ultima.data.queda_fondo)} de fondo{ultima.data.recibe ? ` para ${ultima.data.recibe}` : ''}.</p>
            {ultima.data.observaciones && <p className="mt-1 text-ink-2">«{ultima.data.observaciones}»</p>}
          </div>
        )}
        <TextInput label="Fondo recibido" type="number" min={0} step="0.10" placeholder={String(sugerido)} value={fondo} onChange={(e) => setFondo(e.target.value)}
          hint="Cuente el fondo antes de abrir. Desde la apertura, todo cobro y egreso queda en esta caja." />
        {abrir.error && <ErrorBox error={abrir.error} />}
        <Button variant="dark" size="lg" icon="lock" loading={abrir.isPending} onClick={() => abrir.mutate()}>Abrir caja con {money(Number(fondo || sugerido))}</Button>
      </Panel>
      <div className="lg:col-span-7"><TurnosDelDia /></div>
    </div>
  )
}

function CajaAbierta({ id }: { id: string }) {
  const resumen = useQuery({ queryKey: ['caja', 'resumen', id], queryFn: () => cajaService.resumen(id) })
  const movs = useQuery({ queryKey: ['movimientos', 'caja', id], queryFn: () => cajaService.movimientos(id) })
  const [egreso, setEgreso] = useState(false)
  const r = resumen.data

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Fondo recibido" value={money(r?.fondo)} detail="Al abrir la caja" />
        <Kpi label="Cobrado en efectivo" value={money(r?.ingresos_efectivo)} detail={`Egresos ${money(r?.egresos_efectivo)}`} />
        <Kpi label="Yape y tarjeta" value={money(Number(r?.yape ?? 0) + Number(r?.tarjeta ?? 0))} detail={`Yape ${money(r?.yape)} · tarjeta ${money(r?.tarjeta)}`} />
        <Kpi dark label="Debe haber en caja" value={money(r?.esperado)} detail="Fondo + efectivo − egresos" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Panel title="Movimientos del turno" subtitle="Todo cobro desde la apertura se registra en esta caja" className="lg:col-span-8" bodyClassName="pt-3 overflow-x-auto"
          actions={<div className="flex gap-2"><Button size="sm" icon="minus" onClick={() => setEgreso(true)}>Egreso</Button>
            <Link to="/caja/venta" className="inline-flex h-8 items-center gap-2 rounded-lg border border-line bg-white px-3 text-[13px] font-semibold"><Icon name="plus" size={15} />Venta A&amp;B</Link></div>}>
          {movs.isLoading ? <div className="px-5"><Loading /></div> : movs.data?.length ? (
            <table className="w-full min-w-[560px] text-[13.5px]">
              <thead><tr className="border-b border-line text-left text-xs text-ink-3"><th className="py-2 pl-5 font-medium">Hora</th><th className="font-medium">Concepto</th><th className="font-medium">Método</th><th className="pr-5 text-right font-medium">Importe</th></tr></thead>
              <tbody>{movs.data.map((m) => {
                const signo = TIPO_MOV[m.tipo].signo
                return (
                  <tr key={m.id} className="border-b border-line-2 last:border-0">
                    <td className="py-2.5 pl-5 font-mono">{hora(m.fecha_operacion)}</td>
                    <td><Tag tone={signo > 0 ? (m.tipo === 'ab' ? 'terra' : 'petrol') : 'bad'} className="mr-2">{TIPO_MOV[m.tipo].nombre}</Tag>{m.concepto}</td>
                    <td className="capitalize">{m.metodo}</td>
                    <td className={`num pr-5 text-right font-medium ${signo > 0 ? 'text-ok' : 'text-bad'}`}>{signo > 0 ? '+ ' : '− '}{money(m.importe)}</td>
                  </tr>
                )
              })}</tbody>
            </table>
          ) : <p className="px-5 pb-5 text-[13px] text-ink-3">Aún no hay movimientos en este turno.</p>}
        </Panel>
        <div className="flex flex-col gap-4 lg:col-span-4">
          <TurnosDelDia />
          <Link to="/caja/cierre" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-petrol px-4 text-[13.5px] font-semibold text-white"><Icon name="lock" size={16} />Cerrar caja del turno</Link>
        </div>
      </div>
      <EgresoModal open={egreso} onClose={() => setEgreso(false)} />
    </>
  )
}

function TurnosDelDia() {
  const hoy = limaParts().date
  const q = useQuery({ queryKey: ['caja', 'dia', hoy], queryFn: () => cajaService.delDia(limaISO(hoy, '00:00'), limaISO(addDays(hoy, 1), '00:00')) })
  return (
    <Panel title="Turnos de hoy">
      {q.data?.length ? q.data.map((c) => (
        <div key={c.id} className="flex items-center gap-3 border-t border-line-2 py-2.5 first:border-0">
          <span className={`size-2.5 rounded-full ${c.estado === 'abierta' ? 'bg-st-limpia' : 'bg-line'}`} />
          <div className="flex min-w-0 flex-1 flex-col">
            <b className="text-[13.5px] font-semibold">{nombreTurno(c.turno)} <span className="font-mono text-xs font-normal text-ink-3">{hora(c.apertura_en)}{c.cierre_en ? ` – ${hora(c.cierre_en)}` : ''}</span></b>
            <span className="truncate text-xs text-ink-3">{c.recepcionista}{c.estado === 'cerrada' ? ` · entregó ${money(c.entregado)}${Number(c.diferencia) !== 0 ? ` · diferencia ${money(c.diferencia)}` : ' · cuadrado'}` : ''}</span>
          </div>
          <Tag tone={c.estado === 'abierta' ? 'ok' : 'mute'}>{c.estado === 'abierta' ? 'Abierta' : 'Cerrada'}</Tag>
        </div>
      )) : <p className="text-[13px] text-ink-3">Sin cajas registradas hoy.</p>}
      <Notice icon="clock">De 14:00 a 17:00 coinciden mañana y tarde: la caja pasa a la tarde a las 14:00.</Notice>
    </Panel>
  )
}

function EgresoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const turno = useTurno()
  const qc = useQueryClient()
  const [concepto, setConcepto] = useState('')
  const [importe, setImporte] = useState('')
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo')
  const m = useMutation({
    mutationFn: () => cajaService.egreso(concepto, Number(importe), metodo, turno),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['caja'] }); qc.invalidateQueries({ queryKey: ['movimientos'] }); setConcepto(''); setImporte(''); onClose() },
  })
  return (
    <Modal open={open} onClose={onClose} width={420} title="Registrar egreso" subtitle="Sale dinero de la caja del turno"
      footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" loading={m.isPending} disabled={concepto.trim().length < 3 || !(Number(importe) > 0)} onClick={() => m.mutate()}>Registrar {money(Number(importe) || 0)}</Button></>}>
      <TextInput label="Concepto" value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Ej. compra de útiles de limpieza" autoFocus />
      <TextInput label="Importe" type="number" min={0} step="0.10" value={importe} onChange={(e) => setImporte(e.target.value)} />
      <Segmented block value={metodo} onChange={setMetodo} options={METODOS.map((x) => ({ id: x.id, label: x.nombre }))} />
      {m.error && <ErrorBox error={m.error} />}
    </Modal>
  )
}
