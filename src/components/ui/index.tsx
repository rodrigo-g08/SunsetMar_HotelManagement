import { useEffect, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { ICONS, type IconName } from './icons'
import { ESTADOS_HABITACION, type EstadoHabitacion } from '@/dto/common'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export function Icon({ name, size = 18, stroke = 1.75, className }: { name: IconName; size?: number; stroke?: number; className?: string }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" className={cx('flex-none', className)}
      dangerouslySetInnerHTML={{ __html: ICONS[name] }} />
  )
}

type BtnVariant = 'primary' | 'dark' | 'secondary' | 'ghost' | 'danger'
const BTN: Record<BtnVariant, string> = {
  primary: 'bg-terra-btn border-terra-btn text-white hover:bg-[#8a4a2c]',
  dark: 'bg-petrol border-petrol text-white hover:bg-petrol-8',
  secondary: 'bg-white border-line text-ink hover:bg-canvas',
  ghost: 'bg-transparent border-transparent text-ink-2 hover:bg-line-2',
  danger: 'bg-white border-bad-1 text-bad hover:bg-bad-1',
}

export function Button({ variant = 'secondary', size = 'md', icon, block, loading, children, className, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg'; icon?: IconName; block?: boolean; loading?: boolean }) {
  const h = size === 'sm' ? 'h-8 px-3 text-[13px]' : size === 'lg' ? 'h-12 px-5 text-[15px]' : 'h-10 px-4 text-[13.5px]'
  return (
    <button type="button" {...rest} disabled={rest.disabled || loading}
      className={cx('inline-flex items-center justify-center gap-2 rounded-lg border font-semibold whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed', h, BTN[variant], block && 'w-full', className)}>
      {loading ? <span className="size-4 rounded-full border-2 border-current border-r-transparent animate-spin" /> : icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} />}
      {children}
    </button>
  )
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-ink-2">{label}</label>
      {children(id)}
      {error ? <span className="text-xs text-bad">{error}</span> : hint ? <span className="text-xs text-ink-3">{hint}</span> : null}
    </div>
  )
}

const INPUT = 'h-10 w-full min-w-0 rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-ink-3 focus:border-petrol focus:outline-none focus:ring-3 focus:ring-petrol-1 disabled:bg-canvas disabled:text-ink-2'

export function TextInput({ label, hint, error, mono, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string; mono?: boolean }) {
  return <Field label={label} hint={hint} error={error}>{(id) => <input id={id} {...rest} className={cx(INPUT, mono && 'font-mono num', rest.className)} />}</Field>
}

export function SelectInput({ label, hint, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string }) {
  return <Field label={label} hint={hint}>{(id) => <select id={id} {...rest} className={cx(INPUT, 'pr-8')}>{children}</select>}</Field>
}

export function Segmented<T extends string>({ value, onChange, options, block, size = 'md', label }:
  { value: T; onChange: (v: T) => void; options: { id: T; label: ReactNode; disabled?: boolean }[]; block?: boolean; size?: 'sm' | 'md'; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cx('inline-flex gap-0.5 rounded-lg border border-line bg-canvas p-0.5', block && 'flex w-full')}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={o.id === value} disabled={o.disabled} onClick={() => onChange(o.id)}
          className={cx('rounded-md px-3 font-medium whitespace-nowrap disabled:opacity-40', size === 'sm' ? 'h-7 text-[12.5px]' : 'h-8 text-[13px]', block && 'flex-1',
            o.id === value ? 'bg-white text-ink font-semibold shadow-[0_1px_2px_rgba(22,37,42,.12)]' : 'text-ink-2 hover:text-ink')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Panel({ title, subtitle, actions, children, className, bodyClassName }:
  { title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cx('min-w-0 rounded-panel border border-line bg-white', className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 px-5 pt-4">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold leading-5">{title}</h2>}
            {subtitle && <p className="text-xs text-ink-3">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={cx(bodyClassName ?? 'px-5 py-4')}>{children}</div>
    </section>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold leading-7 tracking-tight">{title}</h1>
        {subtitle && <p className="text-[13px] text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

type TagTone = 'ok' | 'warn' | 'bad' | 'info' | 'petrol' | 'terra' | 'mute'
const TAG: Record<TagTone, string> = {
  ok: 'bg-ok-1 text-ok', warn: 'bg-warn-1 text-warn', bad: 'bg-bad-1 text-bad', info: 'bg-info-1 text-info',
  petrol: 'bg-petrol-1 text-petrol', terra: 'bg-terra-1 text-terra-btn', mute: 'bg-line-2 text-ink-2',
}
export function Tag({ tone = 'mute', children, className }: { tone?: TagTone; children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex h-[22px] items-center gap-1.5 rounded-md px-2 text-xs font-medium whitespace-nowrap', TAG[tone], className)}>{children}</span>
}

export function EstadoDot({ estado, label = true }: { estado: EstadoHabitacion; label?: boolean }) {
  const e = ESTADOS_HABITACION[estado]
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-2 whitespace-nowrap">
      <span className="size-2 flex-none rounded-full" style={{ background: e.color }} />
      {label && e.nombre}
    </span>
  )
}

export function Notice({ tone = 'info', icon = 'alert', children }: { tone?: 'ok' | 'warn' | 'bad' | 'info'; icon?: IconName; children: ReactNode }) {
  const c = { ok: 'bg-ok-1 text-ok', warn: 'bg-warn-1 text-warn', bad: 'bg-bad-1 text-bad', info: 'bg-petrol-1 text-petrol' }[tone]
  return <div role={tone === 'bad' ? 'alert' : 'status'} className={cx('flex items-start gap-2.5 rounded-lg px-3.5 py-2.5 text-[13px] leading-[18px]', c)}><Icon name={icon} size={17} className="mt-px" /><div>{children}</div></div>
}

export function Drawer({ open, onClose, title, children, footer, width = 480 }:
  { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; width?: number }) {
  useEscape(open, onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-[rgba(16,32,37,.38)]" onClick={onClose} />
      <aside role="dialog" aria-modal="true" style={{ width }} className="absolute inset-x-0 bottom-0 top-10 flex max-w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:inset-x-auto sm:right-0 sm:top-0 sm:rounded-none">
        <header className="flex items-start justify-between gap-3 border-b border-line px-6 py-5">
          <div className="min-w-0">{title}</div>
          <Button variant="ghost" size="sm" icon="x" aria-label="Cerrar" onClick={onClose} />
        </header>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="flex items-center gap-2 border-t border-line px-6 py-4">{footer}</footer>}
      </aside>
    </div>
  )
}

export function Modal({ open, onClose, title, subtitle, children, footer, width = 600 }:
  { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; width?: number }) {
  useEscape(open, onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 grid place-items-center p-4">
      <div className="absolute inset-0 bg-[rgba(16,32,37,.38)]" onClick={onClose} />
      <div role="dialog" aria-modal="true" style={{ width }} className="relative max-h-[calc(100vh-32px)] max-w-full overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 px-6 pt-5">
          <div><h2 className="text-lg font-semibold">{title}</h2>{subtitle && <p className="text-[13px] text-ink-2">{subtitle}</p>}</div>
          <Button variant="ghost" size="sm" icon="x" aria-label="Cerrar" onClick={onClose} />
        </header>
        <div className="flex flex-col gap-4 px-6 py-5">{children}</div>
        {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-6 py-4">{footer}</footer>}
      </div>
    </div>
  )
}

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const f = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [open, onClose])
}

export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return <div className="flex items-center gap-2 py-8 text-[13px] text-ink-3"><span className="size-4 rounded-full border-2 border-petrol border-r-transparent animate-spin" />{label}</div>
}

export function ErrorBox({ error }: { error: unknown }) {
  return <Notice tone="bad">{error instanceof Error ? error.message : 'Ocurrió un error inesperado.'}</Notice>
}

export function Kpi({ label, value, detail, dark }: { label: string; value: ReactNode; detail?: ReactNode; dark?: boolean }) {
  return (
    <section className={cx('flex min-w-0 flex-col gap-1 rounded-panel border px-5 py-3.5', dark ? 'border-petrol bg-petrol text-white' : 'border-line bg-white')}>
      <span className={cx('text-xs font-medium', dark ? 'text-[#B5C8CC]' : 'text-ink-3')}>{label}</span>
      <span className="num text-[24px] font-semibold leading-8 tracking-tight">{value}</span>
      {detail && <span className={cx('text-[12.5px]', dark ? 'text-petrol-2' : 'text-ink-2')}>{detail}</span>}
    </section>
  )
}

export { cx }
