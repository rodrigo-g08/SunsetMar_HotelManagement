import { Link } from 'react-router-dom'
import { cx } from '@/components/ui'
import { ESTADOS_HABITACION, type EstadoHabitacion } from '@/dto/common'
import type { HabitacionDTO } from '@/dto/habitacion'
import { habitacionesService } from '@/services/habitacionesService'

const CELDA: Record<EstadoHabitacion, string> = {
  ocupada: 'bg-petrol text-white',
  limpia: 'bg-white text-ink shadow-[inset_0_0_0_1px_#C9D3D0]',
  sucia: 'bg-[#EBC98A] text-[#4F3407]',
  en_limpieza: 'bg-[#B9CFE6] text-[#1D3F63]',
  fuera_servicio: 'hatch-fuera text-bad',
}

/** Vista compacta de todas las habitaciones por piso, con leyenda. */
export function RoomRack({ habitaciones }: { habitaciones: HabitacionDTO[] }) {
  const conteo = habitacionesService.conteo(habitaciones)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        {habitacionesService.porPiso(habitaciones).map((p) => (
          <div key={p.piso} className="grid grid-cols-[40px_repeat(7,minmax(0,1fr))] items-center gap-1 sm:grid-cols-[44px_repeat(12,minmax(0,1fr))]">
            <span className="text-xs text-ink-3">Piso {p.piso}</span>
            {p.habitaciones.map((h) => (
              <Link key={h.numero} to="/habitaciones" title={`${h.numero} · ${ESTADOS_HABITACION[h.estado].nombre}`}
                className={cx('grid h-[26px] place-items-center rounded-[5px] font-mono text-[11.5px] font-medium', CELDA[h.estado])}>
                {h.numero}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {(Object.keys(ESTADOS_HABITACION) as EstadoHabitacion[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5 text-xs text-ink-2">
            <i className={cx('size-2.5 rounded-[3px]', CELDA[k])} />{ESTADOS_HABITACION[k].nombre}
            <b className="num font-semibold text-ink">{conteo[k]}</b>
          </span>
        ))}
      </div>
    </div>
  )
}
