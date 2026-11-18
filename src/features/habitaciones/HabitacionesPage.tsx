import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ErrorBox, Icon, Loading, PageHeader, cx } from '@/components/ui'
import { ESTADOS_HABITACION, type EstadoHabitacion } from '@/dto/common'
import { habitacionesService } from '@/services/habitacionesService'
import { RoomTile } from './RoomTile'
import { EstadoModal, useCambiarEstado } from './EstadoModal'
import type { HabitacionDTO } from '@/dto/habitacion'

export function HabitacionesPage() {
  const q = useQuery({ queryKey: ['habitaciones'], queryFn: habitacionesService.listar })
  const [filtro, setFiltro] = useState<EstadoHabitacion | 'todas'>('todas')
  const [abierta, setAbierta] = useState<HabitacionDTO | null>(null)
  const cambiar = useCambiarEstado()
  const rapida = (h: HabitacionDTO) => {
    const destino = h.estado === 'sucia' ? 'en_limpieza' : h.estado === 'en_limpieza' ? 'limpia' : null
    if (!destino) return undefined
    return { label: destino === 'limpia' ? 'Lista' : 'Limpiar', loading: cambiar.isPending && cambiar.variables?.numero === h.numero,
      onClick: () => cambiar.mutate({ numero: h.numero, estado: destino }) }
  }
  const habs = useMemo(() => q.data ?? [], [q.data])
  const conteo = habitacionesService.conteo(habs)
  const visibles = filtro === 'todas' ? habs : habs.filter((h) => h.estado === filtro)

  return (
    <>
      <PageHeader title="Habitaciones" subtitle={`${habs.length} habitaciones · pisos 2 a 5`}
        actions={<Link to="/habitaciones/tarifas" className="inline-flex h-8 items-center gap-2 rounded-lg border border-line bg-white px-3 text-[13px] font-semibold"><Icon name="tag" size={15} />Tarifas</Link>} />
      <div role="radiogroup" aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
        <Chip on={filtro === 'todas'} onClick={() => setFiltro('todas')}>Todas · {habs.length}</Chip>
        {(Object.keys(ESTADOS_HABITACION) as EstadoHabitacion[]).map((k) => (
          <Chip key={k} on={filtro === k} onClick={() => setFiltro(k)}>
            <span className="size-2 rounded-full" style={{ background: ESTADOS_HABITACION[k].color }} />
            {ESTADOS_HABITACION[k].nombre} · {conteo[k]}
          </Chip>
        ))}
      </div>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} /> : (
        <div className="flex flex-col gap-4">
          {habitacionesService.porPiso(visibles).map((p) => (
            <section key={p.piso} className="flex flex-col gap-2">
              <h2 className="text-[15px] font-semibold">Piso {p.piso} <span className="text-xs font-normal text-ink-3">{p.habitaciones.length}</span></h2>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-12">
                {p.habitaciones.map((h) => <RoomTile key={h.numero} h={h} onClick={() => setAbierta(h)} accion={rapida(h)} />)}
              </div>
            </section>
          ))}
        </div>
      )}
      {cambiar.error && <ErrorBox error={cambiar.error} />}
      <EstadoModal h={abierta ? habs.find((x) => x.numero === abierta.numero) ?? null : null} onClose={() => setAbierta(null)} />
    </>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onClick}
      className={cx('inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-[13px] font-semibold', on ? 'border-petrol bg-petrol text-white' : 'border-line bg-white text-ink')}>
      {children}
    </button>
  )
}
