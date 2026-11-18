import { cx, EstadoDot } from '@/components/ui'
import type { EstadoHabitacion } from '@/dto/common'
import { hora } from '@/lib/format'

export type BarKind = 'casa' | 'pagada' | 'promo' | 'pasada' | 'limpieza' | 'fuera'

export interface TapeBar {
  key: string
  inicio: number
  fin: number
  kind: BarKind
  titulo: string
  detalle?: string
  onClick?: () => void
}

export interface TapeRow { numero: string; categoria: string; estado: EstadoHabitacion; bars: TapeBar[] }

const BAR: Record<BarKind, string> = {
  casa: 'bg-petrol text-white',
  pagada: 'bg-petrol-1 text-petrol shadow-[inset_0_0_0_1px_#B9CDD1]',
  promo: 'bg-terra text-white',
  pasada: 'bg-[#C9D6D9] text-[#2C4A52]',
  limpieza: 'hatch-sucia text-warn shadow-[inset_0_0_0_1px_#E8CF9C]',
  fuera: 'hatch-fuera text-bad shadow-[inset_0_0_0_1px_#E3C3BE]',
}

export const LEYENDA: [BarKind, string][] = [
  ['casa', 'En casa'], ['pagada', 'Reserva pagada'], ['promo', 'Promo 5 h'], ['pasada', 'Estadía terminada'],
  ['limpieza', 'Bloqueo hasta limpieza'], ['fuera', 'Fuera de servicio'],
]

/** Cinta de reservas por habitación. Rango en milisegundos; columnas de igual ancho. */
export function Tape({ rows, desde, hasta, columnas, hoyCol, ahora }:
  { rows: TapeRow[]; desde: number; hasta: number; columnas: string[]; hoyCol?: number; ahora?: number }) {
  const span = hasta - desde
  const pct = (t: number) => Math.max(0, Math.min(100, ((t - desde) / span) * 100))
  const n = columnas.length
  const ahoraPct = ahora && ahora > desde && ahora < hasta ? pct(ahora) : null

  return (
    <div className="overflow-hidden rounded-panel border border-line bg-white">
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="flex border-b border-line bg-canvas">
            <div className="w-44 flex-none px-4 py-2 text-xs font-medium text-ink-3">Habitación</div>
            <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
              {columnas.map((c, i) => (
                <div key={c} className={cx('border-l border-line-2 px-2 py-2 text-xs', i === hoyCol ? 'bg-terra-1 font-semibold text-ink' : 'font-medium text-ink-3')}>{c}</div>
              ))}
            </div>
          </div>
          <div className="relative">
            {rows.map((r) => (
              <div key={r.numero} className="flex h-14 border-b border-line-2 last:border-0">
                <div className="flex w-44 flex-none items-center gap-3 px-4">
                  <span className="font-mono text-sm font-medium">{r.numero}</span>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-xs text-ink-3">{r.categoria}</span>
                    <EstadoDot estado={r.estado} />
                  </div>
                </div>
                <div className="relative flex-1 border-l border-line-2">
                  {Array.from({ length: n - 1 }, (_, i) => (
                    <div key={i} className="absolute inset-y-0 w-px bg-line-2" style={{ left: `${((i + 1) / n) * 100}%` }} />
                  ))}
                  {hoyCol != null && <div className="absolute inset-y-0 bg-terra-1/50" style={{ left: `${(hoyCol / n) * 100}%`, width: `${100 / n}%` }} />}
                  {r.bars.map((b) => {
                    const l = pct(b.inicio), w = pct(b.fin) - l
                    if (w <= 0) return null
                    const estrecha = w < 7
                    return (
                      <div key={b.key}>
                        <button type="button" onClick={b.onClick} disabled={!b.onClick} title={`${b.titulo}${b.detalle ? ' · ' + b.detalle : ''}`}
                          className={cx('absolute inset-y-2 overflow-hidden rounded-md px-2 py-1 text-left whitespace-nowrap disabled:cursor-default', BAR[b.kind])}
                          style={{ left: `calc(${l}% + 1px)`, width: `calc(${w}% - 2px)` }}>
                          {!estrecha && <><div className="truncate text-xs font-semibold leading-4">{b.titulo}</div>
                            {b.detalle && <div className="truncate text-[11.5px] leading-[15px] opacity-85">{b.detalle}</div>}</>}
                        </button>
                        {estrecha && b.titulo && (
                          <div className="pointer-events-none absolute top-2 whitespace-nowrap" style={{ left: `calc(${l + w}% + 6px)` }}>
                            <b className="block text-xs font-semibold leading-4">{b.titulo}</b>
                            {b.detalle && <span className="text-[11.5px] text-ink-3">{b.detalle}</span>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            {ahoraPct != null && (
              <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-0.5 bg-terra" style={{ left: `calc(176px + (100% - 176px) * ${ahoraPct / 100})` }}>
                <span className="absolute bottom-1 left-1 rounded bg-terra px-1.5 font-mono text-[11px] text-white">{hora(new Date(ahora!).toISOString())}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function TapeLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {LEYENDA.map(([k, l]) => (
        <span key={k} className="inline-flex items-center gap-1.5 text-xs text-ink-2"><i className={cx('h-2.5 w-4 rounded-sm', BAR[k])} />{l}</span>
      ))}
    </div>
  )
}
