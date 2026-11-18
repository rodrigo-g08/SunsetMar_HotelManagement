export interface CsvColumn<T> { header: string; value: (row: T) => unknown }

function celda(v: unknown): string {
  if (v == null) return ''
  const s = String(v)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** CSV con BOM UTF-8 para que Excel muestre bien tildes y eñes. */
export function toCSV<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const head = columns.map((c) => celda(c.header)).join(',')
  const body = rows.map((r) => columns.map((c) => celda(c.value(r))).join(','))
  return '﻿' + [head, ...body].join('\r\n')
}

export function descargar(nombre: string, contenido: string, tipo = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }))
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre })
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
