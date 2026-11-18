import type { MetodoPago, Turno } from './common'

export type TipoMovimiento = 'alojamiento' | 'ab' | 'egreso' | 'devolucion'

export interface CajaTurnoDTO {
  id: string
  turno: Turno
  recepcionista: string
  apertura_en: string
  fondo_inicial: number
  estado: 'abierta' | 'cerrada'
  cierre_en: string | null
  contado: number | null
  esperado: number | null
  diferencia: number | null
  queda_fondo: number | null
  entregado: number | null
  recibe: string | null
  observaciones: string | null
  cerrado_por: string | null
}

export interface ResumenCajaDTO {
  fondo: number
  ingresos_efectivo: number
  egresos_efectivo: number
  esperado: number
  yape: number
  tarjeta: number
  movimientos: number
}

export interface MovimientoDTO {
  id: string
  tipo: TipoMovimiento
  concepto: string
  metodo: MetodoPago
  importe: number
  turno: Turno
  fecha_operacion: string
  recepcionista: string | null
  historico: boolean
}

export interface VentaItemDTO { producto_id: number; cantidad: number }

export interface ReporteDiarioDTO {
  fecha: string
  alojamiento: number
  ab: number
  egresos: number
  balance: number
  por_metodo: Record<MetodoPago, number>
  por_turno: Partial<Record<Turno, number>>
  movimientos: (Omit<MovimientoDTO, 'id'> & { fecha: string; ficha: string | null })[]
  cajas: CajaTurnoDTO[]
}

/** Billetes y monedas en circulación en Perú. */
export const DENOMINACIONES: { valor: number; tipo: 'Billete' | 'Moneda' }[] = [
  { valor: 200, tipo: 'Billete' }, { valor: 100, tipo: 'Billete' }, { valor: 50, tipo: 'Billete' }, { valor: 20, tipo: 'Billete' }, { valor: 10, tipo: 'Billete' },
  { valor: 5, tipo: 'Moneda' }, { valor: 2, tipo: 'Moneda' }, { valor: 1, tipo: 'Moneda' }, { valor: 0.5, tipo: 'Moneda' }, { valor: 0.2, tipo: 'Moneda' }, { valor: 0.1, tipo: 'Moneda' },
]
