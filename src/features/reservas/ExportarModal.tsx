import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button, ErrorBox, Modal, Notice, Segmented, TextInput } from '@/components/ui'
import { cajaService } from '@/services/cajaService'
import { addDays, limaISO } from '@/lib/time'
import { descargar, toCSV, type CsvColumn } from '@/lib/csv'
import { fechaCorta, hora } from '@/lib/format'

type Row = Record<string, unknown>
const f = (k: string): CsvColumn<Row>['value'] => (r) => r[k]
const fh = (k: string): CsvColumn<Row>['value'] => (r) => (r[k] ? `${fechaCorta(String(r[k]))} ${hora(String(r[k]))}` : '')

const GRUPOS: { id: string; nombre: string; detalle: string; cols: CsvColumn<Row>[] }[] = [
  { id: 'estadia', nombre: 'Reserva y estadía', detalle: 'Ficha, habitación, modalidad, entrada, salida', cols: [
    { header: 'ficha', value: f('ficha') }, { header: 'habitacion', value: f('habitacion') }, { header: 'modalidad', value: f('modalidad') },
    { header: 'entrada', value: fh('entrada') }, { header: 'salida', value: fh('salida') }, { header: 'personas', value: f('personas') }] },
  { id: 'huespedes', nombre: 'Huéspedes', detalle: 'Nombres, nacionalidad, documento, nacimiento, estado civil', cols: [
    { header: 'titular', value: f('titular') }, { header: 'tipo_documento', value: f('titular_doc_tipo') }, { header: 'documento', value: f('titular_documento') },
    { header: 'nacionalidad', value: f('titular_nacionalidad') }, { header: 'nacimiento', value: f('titular_nacimiento') }, { header: 'estado_civil', value: f('titular_estado_civil') },
    { header: 'acompanante', value: f('acomp_nombre') }, { header: 'acompanante_documento', value: f('acomp_documento') }, { header: 'acompanante_nacionalidad', value: f('acomp_nacionalidad') },
    { header: 'acompanante_nacimiento', value: f('acomp_nacimiento') }, { header: 'acompanante_estado_civil', value: f('acomp_estado_civil') }] },
  { id: 'procedencia', nombre: 'Procedencia del titular', detalle: 'Distrito y dirección', cols: [
    { header: 'distrito', value: f('titular_distrito') }, { header: 'direccion', value: f('titular_direccion') }] },
  { id: 'pago', nombre: 'Pago', detalle: 'Tarifa, adicional, total, método', cols: [
    { header: 'tarifa', value: f('tarifa') }, { header: 'adicional', value: f('adicional') }, { header: 'total', value: f('total') }, { header: 'metodo', value: f('metodo') }] },
  { id: 'operacion', nombre: 'Operación', detalle: 'Recepcionista, canal, estado', cols: [
    { header: 'recepcionista', value: f('recepcionista') }, { header: 'canal', value: f('canal') }, { header: 'estado', value: f('estado') }] },
]

export function ExportarModal({ open, onClose, desdeInicial, hastaInicial }: { open: boolean; onClose: () => void; desdeInicial: string; hastaInicial: string }) {
  const [datos, setDatos] = useState<'reservas' | 'caja'>('reservas')
  const [desde, setDesde] = useState(desdeInicial)
  const [hasta, setHasta] = useState(hastaInicial)
  const [grupos, setGrupos] = useState<string[]>(GRUPOS.map((g) => g.id))
  const d0 = limaISO(desde, '00:00'), d1 = limaISO(addDays(hasta, 1), '00:00')

  const exp = useMutation({
    mutationFn: async () => {
      if (datos === 'caja') {
        descargar(`sunsetmar-caja-${desde}_${hasta}.csv`, cajaService.csvMovimientos(await cajaService.movimientosRango(d0, d1)))
        return
      }
      const rows = await cajaService.exportarReservas(d0, d1)
      const cols = GRUPOS.filter((g) => grupos.includes(g.id)).flatMap((g) => g.cols)
      descargar(`sunsetmar-reservas-${desde}_${hasta}.csv`, toCSV(rows, cols))
    },
    onSuccess: onClose,
  })

  return (
    <Modal open={open} onClose={onClose} title="Exportar CSV" subtitle="Para respaldo o contabilidad. Abre en Excel."
      footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" icon="download" loading={exp.isPending} disabled={datos === 'reservas' && !grupos.length} onClick={() => exp.mutate()}>Descargar CSV</Button></>}>
      <Segmented block value={datos} onChange={setDatos} options={[{ id: 'reservas', label: 'Reservas y huéspedes' }, { id: 'caja', label: 'Movimientos de caja' }]} />
      <div className="grid grid-cols-2 gap-3">
        <TextInput label="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        <TextInput label="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
      </div>
      {datos === 'reservas' && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {GRUPOS.map((g) => (
            <label key={g.id} className="flex items-start gap-3 rounded-lg border border-line px-3 py-2.5">
              <input type="checkbox" className="mt-0.5 size-4 accent-petrol" checked={grupos.includes(g.id)}
                onChange={(e) => setGrupos((x) => (e.target.checked ? [...x, g.id] : x.filter((y) => y !== g.id)))} />
              <span><b className="block text-[13px] font-semibold">{g.nombre}</b><span className="text-xs text-ink-3">{g.detalle}</span></span>
            </label>
          ))}
        </div>
      )}
      {datos === 'reservas' && grupos.some((g) => g === 'huespedes' || g === 'procedencia') && (
        <Notice tone="warn" icon="lock">Incluye datos personales de huéspedes (Ley N.° 29733). Guárdelo en un equipo con acceso restringido.</Notice>
      )}
      {exp.error && <ErrorBox error={exp.error} />}
    </Modal>
  )
}
