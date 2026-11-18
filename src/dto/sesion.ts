import type { Turno } from './common'

/** Contexto del turno elegido al ingresar. */
export interface SesionTurnoDTO {
  id: string
  turno: Turno
  recepcionista: string
  inicio: string
}

export interface LoginDTO {
  email: string
  password: string
  turno: Turno
  recepcionista: string
}
