import type { MetodoPago } from './common'

export interface DashboardDTO {
  fecha: string
  ventas_por_tramo: { t: number; alojamiento: number; ab: number }[]
  alojamiento: number
  ab: number
  egresos: number
  por_metodo: Record<MetodoPago, number>
  semana: { fecha: string; pct: number }[]
}
