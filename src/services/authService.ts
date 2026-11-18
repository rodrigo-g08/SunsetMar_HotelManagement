import { sesionRepo } from '@/repositories/sesionRepo'
import type { LoginDTO, SesionTurnoDTO } from '@/dto/sesion'

const KEY = 'sunsetmar.sesionTurno'

function traducirError(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'Correo o contraseña incorrectos.'
  if (/fetch/i.test(msg)) return 'No hay conexión con el servidor. Revise internet e intente de nuevo.'
  return msg
}

export const authService = {
  /** Inicia sesión y registra el turno con el nombre de quien atiende. */
  async ingresar(dto: LoginDTO): Promise<SesionTurnoDTO> {
    const nombre = dto.recepcionista.trim()
    if (nombre.length < 2) throw new Error('Escriba su nombre para registrar el turno.')
    try {
      await sesionRepo.signIn(dto.email.trim(), dto.password)
      const id = await sesionRepo.abrirSesion(dto.turno, nombre)
      const sesion: SesionTurnoDTO = { id, turno: dto.turno, recepcionista: nombre, inicio: new Date().toISOString() }
      localStorage.setItem(KEY, JSON.stringify(sesion))
      return sesion
    } catch (e) {
      throw new Error(traducirError((e as Error).message))
    }
  },

  async salir(sesion: SesionTurnoDTO | null) {
    if (sesion) await sesionRepo.cerrarSesion(sesion.id).catch(() => undefined)
    localStorage.removeItem(KEY)
    await sesionRepo.signOut()
  },

  sesionGuardada(): SesionTurnoDTO | null {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? (JSON.parse(raw) as SesionTurnoDTO) : null
    } catch {
      return null
    }
  },

  recepcionistasRecientes: () => sesionRepo.recepcionistasRecientes(),
}
