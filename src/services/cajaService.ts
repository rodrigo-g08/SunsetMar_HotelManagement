import { cajaRepo } from '@/repositories/cajaRepo'
import type { MovimientoDTO, TipoMovimiento } from '@/dto/caja'
import type { ProductoDTO } from '@/dto/habitacion'
import { toCSV, type CsvColumn } from '@/lib/csv'
import { fechaCorta, hora } from '@/lib/format'
import { nombreTurno } from '@/lib/time'

export const TIPO_MOV: Record<TipoMovimiento, { nombre: string; signo: 1 | -1 }> = {
  alojamiento: { nombre: 'Alojamiento', signo: 1 },
  ab: { nombre: 'A&B', signo: 1 },
  egreso: { nombre: 'Egreso', signo: -1 },
  devolucion: { nombre: 'Devolución', signo: -1 },
}

/** Suma del conteo por denominación, sin errores de redondeo con céntimos. */
export function totalContado(cantidades: Record<string, number>): number {
  const centimos = Object.entries(cantidades).reduce((s, [valor, n]) => s + Math.round(Number(valor) * 100) * (Number(n) || 0), 0)
  return centimos / 100
}

/** Reparte lo contado: queda el fondo fijo y se entrega el resto. */
export function repartir(contado: number, fondoFijo: number) {
  const queda = Math.min(fondoFijo, contado)
  return { queda, entrega: Math.round((contado - queda) * 100) / 100 }
}

export function totalVenta(items: { producto: ProductoDTO; cantidad: number }[]): number {
  return Math.round(items.reduce((s, i) => s + i.producto.precio * i.cantidad * 100, 0)) / 100
}

const COLUMNAS_MOV: CsvColumn<MovimientoDTO>[] = [
  { header: 'fecha', value: (m) => fechaCorta(m.fecha_operacion) },
  { header: 'hora', value: (m) => hora(m.fecha_operacion) },
  { header: 'turno', value: (m) => nombreTurno(m.turno) },
  { header: 'tipo', value: (m) => TIPO_MOV[m.tipo].nombre },
  { header: 'concepto', value: (m) => m.concepto },
  { header: 'metodo', value: (m) => m.metodo },
  { header: 'importe', value: (m) => (TIPO_MOV[m.tipo].signo * Number(m.importe)).toFixed(2) },
  { header: 'recepcionista', value: (m) => m.recepcionista ?? '' },
  { header: 'historico', value: (m) => (m.historico ? 'si' : 'no') },
]

export const cajaService = {
  ...cajaRepo,
  csvMovimientos: (rows: MovimientoDTO[]) => toCSV(rows, COLUMNAS_MOV),
}
