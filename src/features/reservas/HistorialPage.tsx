import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ErrorBox, Icon, Loading, PageHeader, Panel, Tag, TextInput } from '@/components/ui'
import { reservasService } from '@/services/reservasService'
import type { ReservaDTO } from '@/dto/reserva'
import { addDays, limaISO, limaParts } from '@/lib/time'
import { fechaCorta, hora, money } from '@/lib/format'
import { ReservaDrawer } from './ReservaDrawer'

const ESTADO: Record<ReservaDTO['estado'], [string, 'ok' | 'petrol' | 'mute' | 'bad']> = {
  confirmada: ['Pagada', 'ok'], en_casa: ['En casa', 'petrol'], finalizada: ['Finalizada', 'mute'], cancelada: ['Cancelada', 'bad'],
}

export function HistorialPage({ extraAcciones }: { extraAcciones?: (filtro: { desde: string; hasta: string }) => React.ReactNode }) {
  const hoy = limaParts().date
  const [desde, setDesde] = useState(hoy.slice(0, 8) + '01')
  const [hasta, setHasta] = useState(hoy)
  const [texto, setTexto] = useState('')
  const [abierta, setAbierta] = useState<ReservaDTO | null>(null)
  const q = useQuery({
    queryKey: ['reservas', 'historial', desde, hasta, texto],
    queryFn: () => reservasService.historial(limaISO(desde, '00:00'), limaISO(addDays(hasta, 1), '00:00'), texto),
  })
  const total = (q.data ?? []).filter((r) => r.estado !== 'cancelada').reduce((s, r) => s + Number(r.total), 0)

  return (
    <>
      <PageHeader title="Historial de reservas" subtitle="Consulta por fecha de entrada, titular, ficha o habitación" actions={extraAcciones?.({ desde, hasta })} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40"><TextInput label="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></div>
        <div className="w-40"><TextInput label="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></div>
        <div className="w-72"><TextInput label="Buscar" placeholder="Titular, ficha o habitación" value={texto} onChange={(e) => setTexto(e.target.value)} /></div>
      </div>
      <Panel title={`${q.data?.length ?? 0} reservas`} subtitle={`Cobrado en el periodo: ${money(total)}`} bodyClassName="pt-3 overflow-x-auto">
        {q.isLoading ? <div className="px-5"><Loading /></div> : q.error ? <div className="px-5 pb-4"><ErrorBox error={q.error} /></div> : (
          <table className="w-full min-w-[720px] text-[13.5px]">
            <thead><tr className="border-b border-line text-left text-xs text-ink-3">
              {['Ficha', 'Titular', 'Hab.', 'Modalidad', 'Entrada', 'Estado', 'Total'].map((h, i) => <th key={h} className={`py-2 font-medium ${i === 0 ? 'pl-5' : ''} ${i === 6 ? 'pr-5 text-right' : ''}`}>{h}</th>)}
            </tr></thead>
            <tbody>
              {q.data!.map((r) => (
                <tr key={r.id} className="cursor-pointer border-b border-line-2 hover:bg-canvas" onClick={() => setAbierta(r)}>
                  <td className="py-2.5 pl-5 font-mono">{r.ficha}</td>
                  <td>{r.titular}{r.historica && <Icon name="history" size={13} className="ml-1.5 inline text-ink-3" />}</td>
                  <td className="font-mono">{r.habitacion}</td>
                  <td>{r.modalidad === 'promo5h' ? 'Promo 5 h' : 'Por noche'}{r.personas > 2 ? ` · ${r.personas} pers.` : ''}</td>
                  <td className="font-mono">{fechaCorta(r.entrada)} {hora(r.entrada)}</td>
                  <td><Tag tone={ESTADO[r.estado][1]}>{ESTADO[r.estado][0]}</Tag></td>
                  <td className="num pr-5 text-right font-medium">{money(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      <ReservaDrawer reserva={abierta} onClose={() => setAbierta(null)} />
    </>
  )
}
