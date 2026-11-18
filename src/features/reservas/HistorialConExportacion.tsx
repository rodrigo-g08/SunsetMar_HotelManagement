import { useState } from 'react'
import { Button } from '@/components/ui'
import { HistorialPage } from './HistorialPage'
import { ExportarModal } from './ExportarModal'

export function HistorialConExportacion() {
  const [rango, setRango] = useState<{ desde: string; hasta: string } | null>(null)
  return (
    <>
      <HistorialPage extraAcciones={(f) => <Button size="sm" icon="download" onClick={() => setRango(f)}>Exportar CSV</Button>} />
      {rango && <ExportarModal open onClose={() => setRango(null)} desdeInicial={rango.desde} hastaInicial={rango.hasta} />}
    </>
  )
}
