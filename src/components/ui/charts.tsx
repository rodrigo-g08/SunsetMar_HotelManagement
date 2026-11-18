/** Gráficos SVG livianos con la paleta del panel. Escalan al ancho del contenedor. */

const INK3 = '#6F7E83'
const GRID = '#EFEAE3'

function techo(v: number): number {
  if (v <= 0) return 100
  const p = 10 ** Math.floor(Math.log10(v))
  return Math.ceil(v / p) * p
}

export function BarrasApiladas({ datos, marca, ahoraIdx, alto = 164 }:
  { datos: { etiqueta: string; a: number; b: number }[]; marca?: { idx: number; texto: string }; ahoraIdx?: number; alto?: number }) {
  const w = 460, top = 16, bot = 26, left = 36
  const ch = alto - top - bot
  const max = techo(Math.max(...datos.map((d) => d.a + d.b), 0))
  const bw = (w - left) / datos.length
  const y = (v: number) => top + ch * (1 - v / max)
  return (
    <svg viewBox={`0 0 ${w} ${alto}`} width="100%" role="img" aria-label="Ventas del día por tramo horario">
      {[0, max / 2, max].map((g) => (
        <g key={g}><line x1={left} x2={w} y1={y(g)} y2={y(g)} stroke={GRID} />
          <text x={left - 6} y={y(g) + 4} textAnchor="end" fontSize="10.5" fill={INK3}>{Math.round(g)}</text></g>
      ))}
      {marca && (
        <g><line x1={left + marca.idx * bw} x2={left + marca.idx * bw} y1={top - 8} y2={top + ch} stroke={INK3} strokeDasharray="3 3" />
          <text x={left + marca.idx * bw - 5} y={top} textAnchor="end" fontSize="10.5" fill="#4A5A5F">{marca.texto}</text></g>
      )}
      {datos.map((d, i) => {
        const x = left + i * bw + bw * 0.2, bwi = bw * 0.6
        const futuro = ahoraIdx != null && i > ahoraIdx
        const ha = ch * (d.a / max), hb = ch * (d.b / max), t = d.a + d.b
        return (
          <g key={d.etiqueta}>
            {futuro ? <rect x={x} y={top + ch - 6} width={bwi} height={6} rx={2} fill="none" stroke="#C9D3D0" strokeDasharray="2 2" /> : <>
              {d.a > 0 && <rect x={x} y={top + ch - ha} width={bwi} height={ha} rx={3} fill="#153A43" />}
              {d.b > 0 && <rect x={x} y={top + ch - ha - hb} width={bwi} height={hb} rx={3} fill="#D9A37F" />}
              {t > 0 && <text x={x + bwi / 2} y={top + ch - ha - hb - 5} textAnchor="middle" fontSize="11" fontWeight={500} fill="#16252A">{Math.round(t)}</text>}
            </>}
            <text x={x + bwi / 2} y={alto - 8} textAnchor="middle" fontSize="11" fill={INK3} fontFamily="PlexMono, monospace">{d.etiqueta}</text>
          </g>
        )
      })}
    </svg>
  )
}

export function BarrasPorcentaje({ datos, resaltar, alto = 164 }: { datos: { etiqueta: string; pct: number }[]; resaltar?: number; alto?: number }) {
  const w = 380, top = 18, bot = 26, left = 36
  const ch = alto - top - bot
  const bw = (w - left) / datos.length
  return (
    <svg viewBox={`0 0 ${w} ${alto}`} width="100%" role="img" aria-label="Ocupación por noche">
      {[0, 50, 100].map((g) => {
        const y = top + ch * (1 - g / 100)
        return <g key={g}><line x1={left} x2={w} y1={y} y2={y} stroke={GRID} /><text x={left - 6} y={y + 4} textAnchor="end" fontSize="10.5" fill={INK3}>{g}%</text></g>
      })}
      {datos.map((d, i) => {
        const x = left + i * bw + bw * 0.22, bwi = bw * 0.56, h = ch * Math.min(d.pct, 100) / 100
        const on = i === resaltar
        return (
          <g key={d.etiqueta + i}>
            <rect x={x} y={top + ch - h} width={bwi} height={Math.max(h, 1)} rx={3} fill={on ? '#B46E4B' : '#9DB4B9'} />
            <text x={x + bwi / 2} y={top + ch - h - 5} textAnchor="middle" fontSize="11" fontWeight={on ? 600 : 500} fill={on ? '#16252A' : '#4A5A5F'}>{Math.round(d.pct)}</text>
            <text x={x + bwi / 2} y={alto - 8} textAnchor="middle" fontSize="11" fontWeight={on ? 600 : 400} fill={on ? '#16252A' : INK3}>{d.etiqueta}</text>
          </g>
        )
      })}
    </svg>
  )
}

export function Dona({ partes, centro, sub, size = 108 }: { partes: { valor: number; color: string }[]; centro: string; sub: string; size?: number }) {
  const th = 14, r = (size - th) / 2, c = size / 2, circ = 2 * Math.PI * r
  const tot = partes.reduce((s, p) => s + p.valor, 0)
  let off = 0
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={`Total ${centro}`}>
      <circle cx={c} cy={c} r={r} fill="none" stroke={GRID} strokeWidth={th} />
      {tot > 0 && partes.filter((p) => p.valor > 0).map((p, i) => {
        const L = (circ * p.valor) / tot
        const el = <circle key={i} cx={c} cy={c} r={r} fill="none" stroke={p.color} strokeWidth={th} strokeDasharray={`${Math.max(L - 2, 0.5)} ${circ}`} strokeDashoffset={-off} transform={`rotate(-90 ${c} ${c})`} />
        off += L
        return el
      })}
      <text x={c} y={c - 1} textAnchor="middle" fontSize="16" fontWeight={600} fill="#16252A">{centro}</text>
      <text x={c} y={c + 15} textAnchor="middle" fontSize="10.5" fill={INK3}>{sub}</text>
    </svg>
  )
}
