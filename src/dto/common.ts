export type Turno = 'noche' | 'manana' | 'tarde'

export type EstadoHabitacion = 'limpia' | 'ocupada' | 'sucia' | 'en_limpieza' | 'fuera_servicio'

export type MetodoPago = 'efectivo' | 'yape' | 'tarjeta'

export const METODOS: { id: MetodoPago; nombre: string }[] = [
  { id: 'efectivo', nombre: 'Efectivo' },
  { id: 'yape', nombre: 'Yape' },
  { id: 'tarjeta', nombre: 'Tarjeta' },
]

export const ESTADOS_HABITACION: Record<EstadoHabitacion, { nombre: string; color: string }> = {
  ocupada: { nombre: 'Ocupada', color: 'var(--color-st-ocupada)' },
  limpia: { nombre: 'Limpia', color: 'var(--color-st-limpia)' },
  sucia: { nombre: 'Sucia', color: 'var(--color-st-sucia)' },
  en_limpieza: { nombre: 'En limpieza', color: 'var(--color-st-limpieza)' },
  fuera_servicio: { nombre: 'Fuera de servicio', color: 'var(--color-st-fuera)' },
}
