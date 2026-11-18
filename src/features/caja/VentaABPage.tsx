import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, ErrorBox, Icon, Loading, Notice, Panel, Segmented, SelectInput, TextInput, cx } from '@/components/ui'
import { METODOS, type MetodoPago } from '@/dto/common'
import type { ProductoDTO } from '@/dto/habitacion'
import { useTurno } from '@/context/SessionContext'
import { catalogoRepo } from '@/repositories/catalogoRepo'
import { habitacionesService } from '@/services/habitacionesService'
import { cajaService, totalVenta } from '@/services/cajaService'
import { digits, money } from '@/lib/format'
import { useCajaAbierta } from './CajaLayout'

export function VentaABPage() {
  const turno = useTurno()
  const qc = useQueryClient()
  const [params] = useSearchParams()
  const caja = useCajaAbierta()
  const prods = useQuery({ queryKey: ['productos'], queryFn: catalogoRepo.productos })
  const habs = useQuery({ queryKey: ['habitaciones'], queryFn: habitacionesService.listar })
  const sugerida = useQuery({ queryKey: ['siguiente-ficha-ab'], queryFn: cajaService.siguienteFichaAB })
  const [carrito, setCarrito] = useState<Record<number, number>>({})
  const [hab, setHab] = useState(params.get('hab') ?? '')
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo')
  const [ficha, setFicha] = useState('')
  const [buscar, setBuscar] = useState('')
  const [hecho, setHecho] = useState<string | null>(null)

  const items = useMemo(() => Object.entries(carrito).filter(([, n]) => n > 0)
    .map(([id, cantidad]) => ({ producto: prods.data!.find((p) => p.id === Number(id))!, cantidad })).filter((i) => i.producto), [carrito, prods.data])
  const total = totalVenta(items)
  const add = (p: ProductoDTO, d: number) => setCarrito((c) => ({ ...c, [p.id]: Math.max(0, (c[p.id] ?? 0) + d) }))

  const vender = useMutation({
    mutationFn: () => cajaService.venta(ficha || sugerida.data || '', hab || null, items.map((i) => ({ producto_id: i.producto.id, cantidad: i.cantidad })), metodo, turno),
    onSuccess: () => {
      setHecho(`Venta ${ficha || sugerida.data} registrada: ${money(total)}.`); setCarrito({}); setFicha('')
      ;['caja', 'movimientos', 'siguiente-ficha-ab'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
    },
  })

  if (prods.isLoading || caja.isLoading) return <Loading />
  if (prods.error) return <ErrorBox error={prods.error} />
  const ocupadas = (habs.data ?? []).filter((h) => h.estado === 'ocupada')
  const filtrados = (prods.data ?? []).filter((p) => p.nombre.toLowerCase().includes(buscar.toLowerCase()))

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <Panel title="Catálogo" subtitle="Toque para agregar · sin control de stock en esta etapa" className="lg:col-span-8"
        actions={<div className="w-56"><input aria-label="Buscar producto" placeholder="Buscar producto" value={buscar} onChange={(e) => setBuscar(e.target.value)}
          className="h-8 w-full rounded-lg border border-line px-3 text-[13px] focus:border-petrol focus:outline-none" /></div>}>
        {(['Bebidas', 'Otros'] as const).map((g) => (
          <div key={g} className="mb-4 flex flex-col gap-2 last:mb-0">
            <span className="text-xs font-medium text-ink-3">{g === 'Otros' ? 'Otros productos' : g}</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6">
              {filtrados.filter((p) => p.grupo === g).map((p) => {
                const n = carrito[p.id] ?? 0
                return (
                  <button key={p.id} type="button" onClick={() => add(p, 1)}
                    className={cx('relative flex min-h-16 flex-col justify-between gap-1.5 rounded-xl border bg-white px-3 py-2.5 text-left', n ? 'border-petrol ring-1 ring-petrol' : 'border-line hover:border-ink-3')}>
                    <span className="pr-5 text-[13px] font-medium leading-4">{p.nombre}</span>
                    <span className="num text-[13.5px] font-semibold">{money(p.precio)}</span>
                    {n > 0 && <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-petrol font-mono text-[11px] text-white">{n}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </Panel>
      <Panel title="Venta" className="lg:col-span-4" bodyClassName="flex flex-col gap-3 px-5 py-4">
        {!caja.data && <Notice tone="warn">Abra la caja del turno para registrar ventas.</Notice>}
        <SelectInput label="Cargar a" value={hab} onChange={(e) => setHab(e.target.value)}>
          <option value="">Venta directa</option>
          {ocupadas.map((h) => <option key={h.numero} value={h.numero}>Habitación {h.numero}</option>)}
        </SelectInput>
        <div className="flex flex-col">
          {items.length === 0 ? <p className="py-3 text-[13px] text-ink-3">Aún no hay productos.</p> : items.map(({ producto: p, cantidad }) => (
            <div key={p.id} className="flex items-center gap-3 border-b border-line-2 py-2.5">
              <div className="flex min-w-0 flex-1 flex-col"><b className="truncate text-[13.5px] font-medium">{p.nombre}</b><span className="num text-xs text-ink-3">{money(p.precio)} c/u</span></div>
              <div className="flex items-center rounded-lg border border-line">
                <button type="button" aria-label="Quitar uno" className="grid size-8 place-items-center" onClick={() => add(p, -1)}><Icon name="minus" size={14} /></button>
                <span className="w-6 text-center font-mono text-[13px]">{cantidad}</span>
                <button type="button" aria-label="Agregar uno" className="grid size-8 place-items-center" onClick={() => add(p, 1)}><Icon name="plus" size={14} /></button>
              </div>
              <span className="num w-16 text-right font-semibold">{money(p.precio * cantidad)}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1"><span className="text-xs font-medium text-ink-2">Pago</span>
          <Segmented block value={metodo} onChange={setMetodo} options={METODOS.map((m) => ({ id: m.id, label: m.nombre }))} /></div>
        <TextInput label="N.º de ficha A&B" mono inputMode="numeric" value={ficha} placeholder={sugerida.data ?? ''} onChange={(e) => setFicha(digits(e.target.value).slice(0, 8))}
          hint={`Digite el número de la ficha de papel${sugerida.data ? ` (siguiente: ${sugerida.data})` : ''}.`} />
        <div className="flex items-baseline justify-between"><span className="text-[13px] text-ink-2">Total</span><b className="num text-2xl font-semibold">{money(total)}</b></div>
        {hecho && <Notice tone="ok" icon="check">{hecho}</Notice>}
        {vender.error && <ErrorBox error={vender.error} />}
        <Button variant="primary" size="lg" block disabled={!items.length || !caja.data} loading={vender.isPending} onClick={() => vender.mutate()}>Cobrar {money(total)}</Button>
      </Panel>
    </div>
  )
}
