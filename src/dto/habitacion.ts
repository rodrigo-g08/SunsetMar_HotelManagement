import type { EstadoHabitacion } from './common'

export interface CategoriaDTO {
  id: number
  nombre: string
  precio_noche: number
  precio_promo: number | null
  capacidad_base: number
  capacidad_max: number
  orden: number
}

export interface HabitacionDTO {
  numero: string
  piso: number
  categoria_id: number
  estado: EstadoHabitacion
  motivo_fuera: string | null
  actualizado_en: string
  categoria: CategoriaDTO
}

export interface ProductoDTO {
  id: number
  grupo: 'Bebidas' | 'Otros'
  nombre: string
  precio: number
  activo: boolean
  orden: number
}

export interface ConfigDTO {
  adicional_persona: number
  hora_checkin: string
  hora_checkout: string
  promo_horas: number
  promo_dias_iso: number[]
  fondo_fijo: number
}
