import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Drawer, ErrorBox, Icon, Notice, SelectInput, Tag, TextInput, cx } from '@/components/ui'
import { ESTADOS_CIVILES, huespedVacio, type HuespedDTO, type TipoDocumento } from '@/dto/huesped'
import type { ReservaDTO } from '@/dto/reserva'
import { useTurno } from '@/context/SessionContext'
import { estadiasService } from '@/services/estadiasService'
import { habitacionesService } from '@/services/habitacionesService'
import { fechaCorta, fechaDia, hora, money } from '@/lib/format'

/**
 * Check-in en un solo panel: el pago ya se cobró al reservar, así que solo
 * falta la ficha del huésped. Con un DNI conocido la ficha se completa sola.
 */
export function CheckinDrawer({ reserva, onClose }: { reserva: ReservaDTO | null; onClose: () => void }) {
  const turno = useTurno()
  const qc = useQueryClient()
  const [titular, setTitular] = useState<HuespedDTO>(huespedVacio())
  const [acomp, setAcomp] = useState<HuespedDTO | null>(null)
  const habs = useQuery({ queryKey: ['habitaciones'], queryFn: habitacionesService.listar, enabled: !!reserva })

  useEffect(() => {
    if (!reserva) return
    setTitular({ ...huespedVacio(), apellidos_nombres: reserva.titular, documento: reserva.documento ?? '' })
    setAcomp(null)
  }, [reserva])

  const ok = useMutation({
    mutationFn: () => estadiasService.checkin(reserva!.id, titular, acomp, turno),
    onSuccess: () => { ['reservas', 'habitaciones', 'historial-hab'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); onClose() },
  })

  if (!reserva) return null
  const hab = habs.data?.find((h) => h.numero === reserva.habitacion)

  return (
    <Drawer open onClose={onClose}
      title={<div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-ink-3">Check-in · ficha {reserva.ficha}</span>
        <div className="flex items-baseline gap-3"><span className="font-mono text-[28px] font-medium leading-8">{reserva.habitacion}</span><h2 className="text-lg font-semibold">{reserva.titular}</h2></div>
        <span className="text-[13px] text-ink-2">{hab ? habitacionesService.nombreCorto(hab.categoria.nombre) + ' · ' : ''}{fechaDia(reserva.entrada)} <span className="font-mono">{hora(reserva.entrada)}</span> → {fechaDia(reserva.salida)} <span className="font-mono">{hora(reserva.salida)}</span></span>
      </div>}
      footer={<Button variant="primary" size="lg" block icon="check" loading={ok.isPending} onClick={() => ok.mutate()}>Registrar ingreso</Button>}>
      <div className="flex flex-wrap gap-2">
        {hab && (hab.estado === 'limpia' ? <Tag tone="ok"><Icon name="check" size={13} stroke={2.4} />Habitación limpia</Tag> : <Tag tone="bad">Habitación {hab.estado.replace('_', ' ')}</Tag>)}
        <Tag tone="ok">Pagado {money(reserva.total)}</Tag>
        <Tag>{reserva.personas} personas</Tag>
      </div>
      {hab && hab.estado !== 'limpia' && <Notice tone="bad">La habitación debe estar limpia para el ingreso. Márquela en Habitaciones o reasigne la reserva.</Notice>}
      <HuespedForm titulo="Titular" valor={titular} onChange={setTitular} completo />
      {acomp ? (
        <div className="flex flex-col gap-2">
          <HuespedForm titulo="Segundo huésped" valor={acomp} onChange={setAcomp} />
          <Button variant="ghost" size="sm" onClick={() => setAcomp(null)}>Quitar segundo huésped</Button>
        </div>
      ) : reserva.personas > 1 && (
        <button type="button" onClick={() => setAcomp(huespedVacio())} className="flex items-center justify-between rounded-lg border border-dashed border-line px-3 py-2.5 text-[13px] text-ink-2 hover:border-ink-3">
          Segundo huésped (opcional)<span className="inline-flex items-center gap-1 font-semibold text-ink"><Icon name="plus" size={15} />Agregar documento</span>
        </button>
      )}
      <p className="text-xs text-ink-3">Al confirmar, la {reserva.habitacion} pasa a ocupada. Recepcionista: {turno.recepcionista}.</p>
      {ok.error && <ErrorBox error={ok.error} />}
    </Drawer>
  )
}

/** Formulario de ficha con búsqueda por documento. */
function HuespedForm({ titulo, valor, onChange, completo }: { titulo: string; valor: HuespedDTO; onChange: (h: HuespedDTO) => void; completo?: boolean }) {
  const [buscado, setBuscado] = useState<string | null>(null)
  const listo = valor.documento_tipo === 'DNI' ? /^\d{8}$/.test(valor.documento) : valor.documento.length >= 6
  const q = useQuery({ queryKey: ['huesped', valor.documento], queryFn: () => estadiasService.buscarHuesped(valor.documento), enabled: listo, staleTime: 60_000 })

  useEffect(() => {
    if (q.data && buscado !== valor.documento) {
      setBuscado(valor.documento)
      onChange({ ...q.data, documento_tipo: q.data.documento_tipo, fecha_nacimiento: q.data.fecha_nacimiento ?? null })
    }
  }, [q.data, valor.documento, buscado, onChange])

  const set = (k: keyof HuespedDTO) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...valor, [k]: e.target.value || (k === 'documento' || k === 'apellidos_nombres' ? '' : null) })
  const encontrado = q.data && buscado === valor.documento

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-[15px] font-semibold">{titulo}</h3>
      <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3">
        <SelectInput label="Documento" value={valor.documento_tipo} onChange={(e) => onChange({ ...valor, documento_tipo: e.target.value as TipoDocumento })}>
          <option value="DNI">DNI</option><option value="CE">C. extranjería</option><option value="PASAPORTE">Pasaporte</option>
        </SelectInput>
        <div className="relative">
          <TextInput label="Número" mono inputMode={valor.documento_tipo === 'DNI' ? 'numeric' : 'text'} value={valor.documento} autoFocus={completo}
            onChange={(e) => onChange({ ...valor, documento: (valor.documento_tipo === 'DNI' ? e.target.value.replace(/\D/g, '').slice(0, 8) : e.target.value.toUpperCase().slice(0, 15)) })}
            className={cx(encontrado && 'pr-36')} />
          {encontrado && <Tag tone="ok" className="absolute bottom-[9px] right-2">Huésped registrado</Tag>}
        </div>
      </div>
      {encontrado && <p className="-mt-1 text-xs text-ink-3">Datos completados desde su ficha del {fechaCorta(q.data!.actualizado_en!)}. Revise y continúe.</p>}
      <TextInput label="Apellidos y nombres" value={valor.apellidos_nombres} onChange={set('apellidos_nombres')} />
      <div className="grid grid-cols-3 gap-3">
        <TextInput label="Nacionalidad" value={valor.nacionalidad} onChange={set('nacionalidad')} />
        <TextInput label="Nacimiento" type="date" value={valor.fecha_nacimiento ?? ''} onChange={set('fecha_nacimiento')} />
        <SelectInput label="Estado civil" value={valor.estado_civil ?? ''} onChange={set('estado_civil')}>
          <option value="">—</option>{ESTADOS_CIVILES.map((e) => <option key={e}>{e}</option>)}
        </SelectInput>
      </div>
      {completo && (
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3">
          <TextInput label="Distrito de procedencia" value={valor.distrito ?? ''} onChange={set('distrito')} />
          <TextInput label="Dirección" value={valor.direccion ?? ''} onChange={set('direccion')} />
        </div>
      )}
    </section>
  )
}
