import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Drawer, ErrorBox, Notice, Segmented, TextInput, Tag } from '@/components/ui'
import { METODOS, type MetodoPago } from '@/dto/common'
import { CANALES, type ReservaDTO } from '@/dto/reserva'
import { useTurno } from '@/context/SessionContext'
import { reservasService, LimpiezaPendienteError } from '@/services/reservasService'
import { fechaDia, hora, money } from '@/lib/format'
import { limaISO, limaParts } from '@/lib/time'

type Modo = 'ver' | 'cancelar' | 'reprogramar'

/** Detalle de una reserva con cancelación y reprogramación. */
export function ReservaDrawer({ reserva, onClose, acciones }: { reserva: ReservaDTO | null; onClose: () => void; acciones?: React.ReactNode }) {
  const turno = useTurno()
  const qc = useQueryClient()
  const [modo, setModo] = useState<Modo>('ver')
  const [motivo, setMotivo] = useState('')
  const [devolver, setDevolver] = useState(true)
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo')
  const [hab, setHab] = useState('')
  const [fecha, setFecha] = useState('')
  const [horaEnt, setHoraEnt] = useState('')
  const [noches, setNoches] = useState(1)
  const [personas, setPersonas] = useState(2)
  const [confirmarLimpieza, setConfirmarLimpieza] = useState<string | null>(null)

  useEffect(() => {
    if (!reserva) return
    const p = limaParts(new Date(reserva.entrada))
    setModo('ver'); setMotivo(''); setConfirmarLimpieza(null)
    setHab(reserva.habitacion); setFecha(p.date); setHoraEnt(`${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`)
    setNoches(Math.max(1, Math.round((new Date(reserva.salida).getTime() - new Date(reserva.entrada).getTime()) / 86_400_000)))
    setPersonas(reserva.personas)
  }, [reserva])

  const listo = () => { qc.invalidateQueries({ queryKey: ['reservas'] }); qc.invalidateQueries({ queryKey: ['movimientos'] }); onClose() }
  const cancelar = useMutation({ mutationFn: () => reservasService.cancelar(reserva!.id, motivo, devolver, metodo, turno), onSuccess: listo })
  const reprogramar = useMutation({
    mutationFn: (forzar: boolean) => reservasService.reprogramar(reserva!.id, hab, limaISO(fecha, horaEnt), noches, personas, metodo, forzar, turno),
    onSuccess: listo,
    onError: (e) => { if (e instanceof LimpiezaPendienteError) setConfirmarLimpieza(e.message) },
  })

  if (!reserva) return null
  const r = reserva
  const editable = r.estado === 'confirmada'
  const err = cancelar.error ?? (reprogramar.error instanceof LimpiezaPendienteError ? null : reprogramar.error)

  return (
    <Drawer open onClose={onClose} width={460}
      title={<div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-ink-3">Reserva · ficha {r.ficha}</span>
        <div className="flex items-baseline gap-3"><span className="font-mono text-[26px] font-medium">{r.habitacion}</span><h2 className="text-lg font-semibold">{r.titular}</h2></div>
        <span className="text-[13px] text-ink-2">{fechaDia(r.entrada)} <span className="font-mono">{hora(r.entrada)}</span> → {fechaDia(r.salida)} <span className="font-mono">{hora(r.salida)}</span></span>
      </div>}
      footer={modo === 'ver' ? (acciones ?? (editable ? <>
        <Button onClick={() => setModo('reprogramar')} icon="swap">Reprogramar</Button>
        <Button variant="danger" onClick={() => setModo('cancelar')}>Cancelar reserva</Button>
      </> : null)) : modo === 'cancelar' ? <>
        <Button variant="ghost" onClick={() => setModo('ver')}>Volver</Button>
        <Button variant="danger" block loading={cancelar.isPending} onClick={() => cancelar.mutate()}>Confirmar cancelación</Button>
      </> : <>
        <Button variant="ghost" onClick={() => setModo('ver')}>Volver</Button>
        <Button variant="primary" block loading={reprogramar.isPending} onClick={() => reprogramar.mutate(false)}>Guardar cambios</Button>
      </>}>
      <div className="flex flex-wrap gap-2">
        <Tag tone={r.estado === 'en_casa' ? 'petrol' : r.estado === 'finalizada' ? 'mute' : 'ok'}>{{ confirmada: 'Pagada · por llegar', en_casa: 'En casa', finalizada: 'Finalizada', cancelada: 'Cancelada' }[r.estado]}</Tag>
        <Tag>{r.modalidad === 'promo5h' ? 'Promo 5 h' : 'Por noche'}</Tag>
        <Tag>{r.personas} personas</Tag>
        <Tag>{CANALES.find((c) => c.id === r.canal)?.nombre}</Tag>
        {r.historica && <Tag tone="info">Carga histórica</Tag>}
      </div>
      <div className="flex flex-col">
        {[['Tarifa', money(r.tarifa_base)], ['Personas adicionales', money(r.adicional)], ['Total pagado', money(r.total)], ['Registró', r.recepcionista ?? '—']].map(([a, b]) => (
          <div key={a} className="flex justify-between border-b border-line-2 py-2 text-[13.5px] last:border-0"><span className="text-ink-2">{a}</span><b className="num font-medium">{b}</b></div>
        ))}
      </div>
      {modo === 'cancelar' && (
        <div className="flex flex-col gap-3">
          <TextInput label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. el huésped desistió" />
          <label className="flex items-center gap-2 text-[13.5px]"><input type="checkbox" checked={devolver} onChange={(e) => setDevolver(e.target.checked)} className="size-4 accent-petrol" />Devolver {money(r.total)}</label>
          {devolver && <Segmented block value={metodo} onChange={setMetodo} label="Método de devolución" options={METODOS.map((m) => ({ id: m.id, label: m.nombre }))} />}
        </div>
      )}
      {modo === 'reprogramar' && (
        <div className="grid grid-cols-2 gap-3">
          <TextInput label="Habitación" value={hab} onChange={(e) => setHab(e.target.value.replace(/\D/g, '').slice(0, 3))} mono />
          <TextInput label="Personas" type="number" min={1} max={4} value={personas} onChange={(e) => setPersonas(Number(e.target.value))} />
          <TextInput label="Fecha de entrada" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <TextInput label="Hora" type="time" value={horaEnt} onChange={(e) => setHoraEnt(e.target.value)} />
          {r.modalidad === 'noche' && <TextInput label="Noches" type="number" min={1} value={noches} onChange={(e) => setNoches(Number(e.target.value))} />}
          <div className="col-span-2 flex flex-col gap-1"><span className="text-xs font-medium text-ink-2">Si cambia el precio, cobrar o devolver con</span>
            <Segmented block value={metodo} onChange={setMetodo} options={METODOS.map((m) => ({ id: m.id, label: m.nombre }))} /></div>
        </div>
      )}
      {confirmarLimpieza && (
        <Notice tone="warn" icon="sparkle">
          {confirmarLimpieza}. ¿Confirma que estará limpia a tiempo?
          <div className="mt-2"><Button size="sm" variant="dark" onClick={() => reprogramar.mutate(true)}>Sí, estará limpia</Button></div>
        </Notice>
      )}
      {err && <ErrorBox error={err} />}
    </Drawer>
  )
}
