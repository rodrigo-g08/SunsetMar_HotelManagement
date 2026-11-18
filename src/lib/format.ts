const TZ = 'America/Lima'

const soles = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** S/ 1,234.50 */
export function money(n: number | string | null | undefined): string {
  const v = Number(n ?? 0)
  return `${v < 0 ? '− ' : ''}S/ ${soles.format(Math.abs(v))}`
}

export function hora(iso: string): string {
  return new Intl.DateTimeFormat('es-PE', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
}

/** 17/11 */
export function fechaCorta(iso: string): string {
  return new Intl.DateTimeFormat('es-PE', { timeZone: TZ, day: '2-digit', month: '2-digit' }).format(new Date(iso))
}

/** mar 17 nov */
export function fechaDia(iso: string): string {
  return new Intl.DateTimeFormat('es-PE', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' })
    .format(new Date(iso)).replace(/[.,]/g, '')
}

/** Martes 17 de noviembre de 2026 */
export function fechaLarga(iso: string): string {
  const s = new Intl.DateTimeFormat('es-PE', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function pad(n: number | string, width: number): string {
  return String(n).padStart(width, '0')
}

/** Solo dígitos, para fichas y documentos. */
export function digits(s: string): string {
  return s.replace(/\D/g, '')
}
