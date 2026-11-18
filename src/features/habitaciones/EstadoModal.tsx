import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, EstadoDot, ErrorBox, Modal, Notice, TextInput } from '@/components/ui'
import { ESTADOS_HABITACION, type EstadoHabitacion } from '@/dto/common'
import type { HabitacionDTO } from '@/dto/habitacion'
import { habitacionesRepo } from '@/repositories/habitacionesRepo'
import { useTurno } from '@/context/SessionContext'
import { fechaCorta, hora, money } from '@/lib/format'

/** Siguientes estados posibles. «Ocupada» solo llega con el check-in. */
export const SIGUIENTES: Record<EstadoHabitacion, EstadoHabitacion[]> = {
  sucia: ['en_limpieza', 'limpia'],
  en_limpieza: ['limpia', 'sucia'],
  limpia: ['sucia', 'en_limpieza'],
  fuera_servicio: ['limpia', 'sucia'],
  ocupada: [],
}

const ETIQUETA: Partial<Record<EstadoHabitacion, string>> = { en_limpieza: 'Iniciar limpieza', limpia: 'Marcar limpia', sucia: 'Marcar sucia' }

export function useCambiarEstado() {
  const turno = useTurno()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ numero, estado, motivo }: { numero: string; estado: EstadoHabitacion; motivo?: string | null }) =>
      habitacionesRepo.cambiarEstado(numero, estado, motivo ?? null, turno),
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ['habitaciones'] }); qc.invalidateQueries({ queryKey: ['historial-hab', v.numero] }) },
  })
}

export function EstadoModal({ h, onClose }: { h: HabitacionDTO | null; onClose: () => void }) {
  const [motivo, setMotivo] = useState('')
  const [fuera, setFuera] = useState(false)
  const cambiar = useCambiarEstado()
  const hist = useQuery({ queryKey: ['historial-hab', h?.numero], queryFn: () => habitacionesRepo.historial(h!.numero), enabled: !!h })
  if (!h) return null
  const aplicar = (estado: EstadoHabitacion) => cambiar.mutate({ numero: h.numero, estado, motivo }, { onSuccess: () => { setFuera(false); setMotivo(''); onClose() } })

  return (
    <Modal open onClose={onClose} width={440}
      title={<span className="flex items-baseline gap-3"><span className="font-mono text-2xl font-medium">{h.numero}</span><EstadoDot estado={h.estado} /></span>}
      subtitle={`Piso ${h.piso} · ${h.categoria.nombre.replace(' · 508', '')} · ${money(h.categoria.precio_noche)} por noche`}>
      {h.estado === 'ocupada' ? <Notice>La habitación está ocupada. Cambia a sucia al registrar el check-out.</Notice> : (
        <div className="flex flex-col gap-2">
          {SIGUIENTES[h.estado].map((e) => (
            <Button key={e} block variant={e === SIGUIENTES[h.estado][0] ? 'dark' : 'secondary'} loading={cambiar.isPending && cambiar.variables?.estado === e} onClick={() => aplicar(e)}>
              <span className="size-2 rounded-full" style={{ background: ESTADOS_HABITACION[e].color }} />{ETIQUETA[e] ?? ESTADOS_HABITACION[e].nombre}
            </Button>
          ))}
          {h.estado !== 'fuera_servicio' && (fuera ? (
            <div className="flex flex-col gap-2 rounded-lg border border-line p-3">
              <TextInput label="Motivo de la avería" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. sin agua caliente" autoFocus />
              <Button variant="danger" block disabled={motivo.trim().length < 3} onClick={() => aplicar('fuera_servicio')}>Marcar fuera de servicio</Button>
            </div>
          ) : <Button variant="ghost" icon="tool" onClick={() => setFuera(true)}>Reportar avería…</Button>)}
        </div>
      )}
      {cambiar.error && <ErrorBox error={cambiar.error} />}
      {!!hist.data?.length && (
        <div className="flex flex-col">
          <span className="mb-1 text-xs font-medium text-ink-3">Historial</span>
          {hist.data.map((c, i) => (
            <div key={i} className="grid grid-cols-[96px_minmax(0,1fr)] gap-2 border-t border-line-2 py-1.5 text-[12.5px]">
              <span className="font-mono text-ink-3">{fechaCorta(c.ts)} {hora(c.ts)}</span>
              <span>{ESTADOS_HABITACION[c.de]?.nombre} → {ESTADOS_HABITACION[c.a]?.nombre} <span className="text-ink-3">· {c.recepcionista}{c.motivo ? ` · ${c.motivo}` : ''}</span></span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
