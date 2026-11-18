import type { ReactNode } from 'react'
import { cx } from '@/components/ui'
import type { HabitacionDTO } from '@/dto/habitacion'
import { habitacionesService } from '@/services/habitacionesService'

const ESTILO: Record<HabitacionDTO['estado'], { box: string; sub: string; dot: string }> = {
  ocupada: { box: 'bg-petrol text-white border-transparent', sub: 'text-[#B5C8CC]', dot: 'bg-[#7FCBA8]' },
  limpia: { box: 'bg-white text-ink border-line', sub: 'text-ink-3', dot: 'bg-st-limpia' },
  sucia: { box: 'bg-[#FBF1DD] text-[#5E4210] border-transparent', sub: 'text-[#8A6A2E]', dot: 'bg-st-sucia' },
  en_limpieza: { box: 'bg-[#E9F0F8] text-[#1D3F63] border-transparent', sub: 'text-[#4C6E92]', dot: 'bg-st-limpieza' },
  fuera_servicio: { box: 'hatch-fuera text-bad border-transparent', sub: 'text-bad', dot: 'bg-st-fuera' },
}

/** Ficha de habitación para la grilla por piso. `accion` agrega un botón rápido (p. ej. «Lista»). */
export function RoomTile({ h, footer, onClick, selected, accion }:
  { h: HabitacionDTO; footer?: ReactNode; onClick?: () => void; selected?: boolean; accion?: { label: string; onClick: () => void; loading?: boolean } }) {
  const e = ESTILO[h.estado]
  const contexto = h.estado === 'fuera_servicio' ? h.motivo_fuera : h.estado === 'limpia' ? 'Libre' : h.estado === 'ocupada' ? 'En casa' : ''
  return (
    <div className={cx('flex min-h-24 min-w-0 flex-col rounded-xl border', e.box, selected && 'ring-3 ring-terra')}>
      <button type="button" onClick={onClick} aria-label={`Habitación ${h.numero}, ${h.estado.replace('_', ' ')}`}
        className="flex flex-1 flex-col gap-1.5 px-3 pb-1.5 pt-2.5 text-left">
        <span className="flex w-full items-center justify-between">
          <span className="font-mono text-[17px] font-medium leading-5">{h.numero}</span>
          <span className={cx('size-2 rounded-full', e.dot)} />
        </span>
        <span className={cx('w-full truncate text-[11.5px] leading-[14px]', e.sub)}>{habitacionesService.nombreCorto(h.categoria.nombre)}</span>
        {!accion && <span className="mt-auto w-full truncate text-xs font-medium">{footer ?? contexto}</span>}
      </button>
      {accion && (
        <button type="button" onClick={accion.onClick} disabled={accion.loading}
          className="mx-2 mb-2 h-7 rounded-md border border-current/25 bg-white text-xs font-semibold disabled:opacity-60">
          {accion.loading ? '…' : accion.label}
        </button>
      )}
    </div>
  )
}
