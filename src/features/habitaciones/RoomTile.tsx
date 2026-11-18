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

/** Ficha de habitación para la grilla por piso. */
export function RoomTile({ h, footer, onClick, selected }: { h: HabitacionDTO; footer?: ReactNode; onClick?: () => void; selected?: boolean }) {
  const e = ESTILO[h.estado]
  const contexto = h.estado === 'fuera_servicio' ? h.motivo_fuera : h.estado === 'limpia' ? 'Libre' : h.estado === 'ocupada' ? 'En casa' : ''
  return (
    <button type="button" onClick={onClick} aria-label={`Habitación ${h.numero}, ${h.estado.replace('_', ' ')}`}
      className={cx('flex min-h-24 min-w-0 flex-col gap-1.5 rounded-xl border px-3 py-2.5 text-left', e.box, selected && 'ring-3 ring-terra')}>
      <span className="flex items-center justify-between">
        <span className="font-mono text-[17px] font-medium leading-5">{h.numero}</span>
        <span className={cx('size-2 rounded-full', e.dot)} />
      </span>
      <span className={cx('truncate text-[11.5px] leading-[14px]', e.sub)}>{habitacionesService.nombreCorto(h.categoria.nombre)}</span>
      <span className="mt-auto truncate text-xs font-medium">{footer ?? contexto}</span>
    </button>
  )
}
