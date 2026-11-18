import type { Turno } from '@/dto/common'

/** Perú no usa horario de verano: la hora operativa es siempre UTC−05:00. */
export const LIMA_OFFSET = '-05:00'
const TZ = 'America/Lima'

/** Partes de fecha y hora en Lima para un instante dado. */
export function limaParts(d: Date = new Date()) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short',
  })
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]))
  const hour = Number(p.hour) % 24
  const iso = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday) + 1
  return { date: `${p.year}-${p.month}-${p.day}`, hour, minute: Number(p.minute), isoWeekday: iso }
}

/** Convierte fecha (AAAA-MM-DD) y hora (HH:MM) de Lima en ISO con zona. */
export function limaISO(date: string, time: string): string {
  return `${date}T${time}:00${LIMA_OFFSET}`
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00${LIMA_OFFSET}`)
  d.setUTCDate(d.getUTCDate() + days)
  return limaParts(d).date
}

export function addHours(iso: string, hours: number): string {
  return new Date(new Date(iso).getTime() + hours * 3_600_000).toISOString()
}

/** Turno operativo por hora: 22–08 noche, 08–14 mañana, 14–22 tarde (los cobros de 14 a 17 son de la tarde). */
export function turnoPorHora(hour: number): Turno {
  if (hour >= 22 || hour < 8) return 'noche'
  if (hour < 14) return 'manana'
  return 'tarde'
}

export const TURNOS: { id: Turno; nombre: string; horario: string }[] = [
  { id: 'noche', nombre: 'Noche', horario: '22:00 – 08:00' },
  { id: 'manana', nombre: 'Mañana', horario: '08:00 – 17:00' },
  { id: 'tarde', nombre: 'Tarde', horario: '14:00 – 22:00' },
]

export function nombreTurno(t: Turno): string {
  return TURNOS.find((x) => x.id === t)?.nombre ?? t
}
