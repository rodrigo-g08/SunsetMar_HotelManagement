import { useQuery } from '@tanstack/react-query'
import { ErrorBox, Loading, PageHeader, Panel, Tag } from '@/components/ui'
import { habitacionesService } from '@/services/habitacionesService'
import { catalogoRepo } from '@/repositories/catalogoRepo'
import { money } from '@/lib/format'

export function TarifasPage() {
  const habs = useQuery({ queryKey: ['habitaciones'], queryFn: habitacionesService.listar })
  const cats = useQuery({ queryKey: ['categorias'], queryFn: habitacionesService.categorias })
  const cfg = useQuery({ queryKey: ['config'], queryFn: habitacionesService.config })
  const prods = useQuery({ queryKey: ['productos'], queryFn: catalogoRepo.productos })

  if (habs.isLoading || cats.isLoading || cfg.isLoading) return <Loading />
  if (habs.error || cats.error || cfg.error) return <ErrorBox error={habs.error ?? cats.error ?? cfg.error} />
  const c = cfg.data!

  return (
    <>
      <PageHeader title="Tarifas" subtitle="Configuración vigente" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Panel title="Habitaciones y tarifas" subtitle={`Por noche · adicional de ${money(c.adicional_persona)} por persona extra, en cualquier habitación`} className="lg:col-span-8" bodyClassName="pt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13.5px]">
            <thead><tr className="text-left text-xs text-ink-3">
              <th className="py-2 pl-5 font-medium">Categoría</th><th className="font-medium">Habitaciones</th><th className="font-medium">Base</th>
              <th className="text-right font-medium">Por noche</th><th className="pr-5 text-right font-medium">Promo {c.promo_horas} h</th></tr></thead>
            <tbody>
              {cats.data!.map((cat) => (
                <tr key={cat.id} className="border-t border-line-2">
                  <td className="py-2.5 pl-5 font-medium">{cat.nombre.replace(' · 508', '')}</td>
                  <td className="py-2.5">
                    <div className="flex flex-wrap gap-1">{habs.data!.filter((h) => h.categoria_id === cat.id).map((h) =>
                      <span key={h.numero} className="rounded border border-line-2 bg-canvas px-1.5 font-mono text-xs">{h.numero}</span>)}</div>
                  </td>
                  <td className="text-ink-2">{cat.capacidad_base} pers.</td>
                  <td className="num text-right font-medium">{money(cat.precio_noche)}</td>
                  <td className="pr-5 text-right">{cat.precio_promo ? <Tag tone="ok" className="num">{money(cat.precio_promo)}</Tag> : <span className="text-ink-3">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <div className="flex flex-col gap-4 lg:col-span-4">
          <Panel title="Reglas de la estadía">
            {[['Check-in', c.hora_checkin], ['Check-out', `${c.hora_checkout} mediodía`], [`Promo ${c.promo_horas} h`, 'Lunes a jueves'],
              ['Persona adicional', money(c.adicional_persona)], ['Pago', 'Total, al registrar']].map(([a, b]) => (
              <div key={a} className="flex justify-between border-b border-line-2 py-2 last:border-0"><span className="text-ink-2">{a}</span><b className="font-medium">{b}</b></div>
            ))}
            <p className="pt-2 text-xs text-ink-3">303 y 407 tienen 2 camas: se venden para 2 o 3 personas con un solo calendario. Tras cada salida, la habitación no se vende hasta marcarla limpia.</p>
          </Panel>
          <Panel title="Catálogo A&amp;B">
            {prods.data?.map((p) => (
              <div key={p.id} className="flex justify-between py-1 text-[13px]"><span className="text-ink-2">{p.nombre}</span><span className="num">{money(p.precio)}</span></div>
            ))}
          </Panel>
        </div>
      </div>
    </>
  )
}
