import { useQuery } from '@tanstack/react-query'
import { ErrorBox, Kpi, Loading, PageHeader, Panel } from '@/components/ui'
import { habitacionesService } from '@/services/habitacionesService'
import { fechaLarga } from '@/lib/format'
import { useTurno } from '@/context/SessionContext'
import { nombreTurno } from '@/lib/time'
import { RoomRack } from './RoomRack'
import { MovimientosHoy } from '@/features/estadias/MovimientosHoy'

export function InicioPage() {
  const turno = useTurno()
  const q = useQuery({ queryKey: ['habitaciones'], queryFn: habitacionesService.listar })
  if (q.isLoading) return <Loading />
  if (q.error) return <ErrorBox error={q.error} />
  const habs = q.data!
  const occ = habitacionesService.ocupacion(habs)
  const c = habitacionesService.conteo(habs)

  return (
    <>
      <PageHeader title={fechaLarga(new Date().toISOString())} subtitle={`Turno ${nombreTurno(turno.turno).toLowerCase()} · ${turno.recepcionista}`} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Ocupación ahora" value={`${occ.pct} %`} detail={`${occ.ocupadas} de ${occ.operativas} operativas`} />
        <Kpi label="Libres y limpias" value={c.limpia} detail="Listas para vender" />
        <Kpi label="Por limpiar" value={c.sucia} detail={`${c.en_limpieza} en limpieza`} />
        <Kpi label="Fuera de servicio" value={c.fuera_servicio} detail="Bloqueadas" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <MovimientosHoy className="lg:col-span-7" />
        <Panel title={`Estado de las ${habs.length} habitaciones`} className="lg:col-span-5"><RoomRack habitaciones={habs} /></Panel>
      </div>
    </>
  )
}
