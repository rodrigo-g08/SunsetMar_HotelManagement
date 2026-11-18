import type { MetodoPago } from './common'

export type Modalidad = 'noche' | 'promo5h'
export type EstadoReserva = 'confirmada' | 'en_casa' | 'finalizada' | 'cancelada'
export type Canal = 'recepcion' | 'whatsapp' | 'telefono' | 'booking'

export const CANALES: { id: Canal; nombre: string }[] = [
  { id: 'recepcion', nombre: 'Atención directa' },
  { id: 'whatsapp', nombre: 'WhatsApp' },
  { id: 'telefono', nombre: 'Teléfono' },
  { id: 'booking', nombre: 'Booking' },
]

export interface ReservaDTO {
  id: string
  ficha: string
  habitacion: string
  modalidad: Modalidad
  entrada: string
  salida: string
  personas: number
  titular: string
  documento: string | null
  canal: Canal
  tarifa_base: number
  adicional: number
  total: number
  estado: EstadoReserva
  historica: boolean
  checkin_en: string | null
  checkout_en: string | null
  recepcionista: string | null
  creado_en: string
}

export interface CotizacionDTO {
  tarifa_base: number
  adicional: number
  total: number
  salida: string
  noches: number
}

export interface NuevaReservaDTO {
  habitacion: string
  modalidad: Modalidad
  entrada: string
  noches: number
  personas: number
  titular: string
  documento?: string
  canal: Canal
  ficha: string
  metodo: MetodoPago
  historica: boolean
  forzar_limpieza?: boolean
}

export type Disponibilidad =
  | { estado: 'libre' }
  | { estado: 'limpieza'; motivo: string }
  | { estado: 'no'; motivo: string }
