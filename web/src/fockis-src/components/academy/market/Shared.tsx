import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './Icon'

/* ------------------------------------------------------------------ */
/* Brand                                                               */
/* ------------------------------------------------------------------ */

export function FockisMark({ size = 30, color = '#1d5ee8' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M8 6h26l-4 7H16l-1.6 5H28l-3.6 6.5H12.4L9 34H2z" fill={color} />
      <path d="M30 6h6l-4 7h-6z" fill={color} opacity=".55" />
    </svg>
  )
}

export function Logo({ light = false, sub }: { light?: boolean; sub?: string }) {
  return (
    <Link to="/academy" className={`fa-logo ${light ? 'is-light' : ''}`}>
      <FockisMark color={light ? '#fff' : '#1d5ee8'} />
      <span className="fa-logo__text">
        <b>Fockis</b>
        <span>Academy</span>
        {sub && <em>{sub}</em>}
      </span>
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/* Illustrated people (no stock photos)                               */
/* ------------------------------------------------------------------ */

const SKIN = ['#8d5524', '#c68642', '#e0ac69', '#f1c27d', '#ffdbac', '#6b3e1f']
const HAIR = ['#1b1b1b', '#3b2416', '#5a3825', '#2a1a10', '#7a4a2a', '#111']

export type PersonLook = {
  skin?: number
  hair?: number
  shirt?: string
  style?: 'short' | 'long' | 'bun' | 'curly' | 'bald' | 'chef'
  glasses?: boolean
  beard?: boolean
}

export function Person({ look = {}, size = 40, bg = '#dbe7ff', round = true }: { look?: PersonLook; size?: number; bg?: string; round?: boolean }) {
  const skin = SKIN[look.skin ?? 2]
  const hair = HAIR[look.hair ?? 0]
  const shirt = look.shirt ?? '#1d5ee8'
  const st = look.style ?? 'short'
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="fa-person" style={{ borderRadius: round ? '50%' : 12, background: bg }} aria-hidden="true">
      {st === 'long' && <path d="M17 30c0-14 6-20 15-20s15 6 15 20v18H17z" fill={hair} />}
      {st === 'curly' && <circle cx="32" cy="24" r="16" fill={hair} />}
      <path d="M10 64c1-12 10-18 22-18s21 6 22 18z" fill={shirt} />
      <path d="M27 40h10v8a5 5 0 0 1-10 0z" fill={skin} />
      <ellipse cx="32" cy="29" rx="11" ry="12.5" fill={skin} />
      {st === 'short' && <path d="M21 27c0-9 5-13 11-13s11 4 11 13c-2-4-6-6-11-6s-9 2-11 6z" fill={hair} />}
      {st === 'long' && <path d="M21 27c0-9 5-13 11-13s11 4 11 13c-3-5-7-7-11-7s-8 2-11 7z" fill={hair} />}
      {st === 'bun' && (<><circle cx="32" cy="11" r="5" fill={hair} /><path d="M21 27c0-9 5-13 11-13s11 4 11 13c-2-4-6-6-11-6s-9 2-11 6z" fill={hair} /></>)}
      {st === 'curly' && <path d="M21 25c1-6 5-10 11-10s10 4 11 10c-3-3-6-4-11-4s-8 1-11 4z" fill={hair} />}
      {st === 'chef' && (<><path d="M20 22h24v-4a6 6 0 0 0-3-5 6 6 0 0 0-9-3 6 6 0 0 0-9 3 6 6 0 0 0-3 5z" fill="#fff" stroke="#e6e9f2" /><rect x="20" y="20" width="24" height="4" fill="#f4f6fb" /></>)}
      {look.beard && <path d="M22 31c1 8 5 11 10 11s9-3 10-11c-2 3-5 4-10 4s-8-1-10-4z" fill={hair} opacity=".9" />}
      {look.glasses && (<g fill="none" stroke="#1b1b1b" strokeWidth="1.4"><circle cx="27.5" cy="29" r="3.4" /><circle cx="36.5" cy="29" r="3.4" /><path d="M30.9 29h2.2" /></g>)}
      <circle cx="27.5" cy="29.5" r="1.1" fill="#1b1b1b" />
      <circle cx="36.5" cy="29.5" r="1.1" fill="#1b1b1b" />
      <path d="M28.5 35c2 1.6 5 1.6 7 0" stroke="#7a2e1e" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export const PEOPLE = {
  maria: { skin: 1, hair: 1, shirt: '#ffffff', style: 'curly' } as PersonLook,
  elince: { skin: 0, hair: 0, shirt: '#0b2a6b', style: 'short', glasses: true, beard: true } as PersonLook,
  james: { skin: 3, hair: 2, shirt: '#2f6fed', style: 'short' } as PersonLook,
  chef: { skin: 4, hair: 4, shirt: '#ffffff', style: 'chef' } as PersonLook,
  linda: { skin: 4, hair: 4, shirt: '#e05d7a', style: 'long' } as PersonLook,
  david: { skin: 2, hair: 0, shirt: '#3a4a63', style: 'short', beard: true } as PersonLook,
  sofia: { skin: 3, hair: 1, shirt: '#8b5cf6', style: 'long' } as PersonLook,
  chris: { skin: 4, hair: 3, shirt: '#0ea5a4', style: 'short' } as PersonLook,
  daniel: { skin: 4, hair: 5, shirt: '#334155', style: 'short', glasses: true } as PersonLook,
  amina: { skin: 0, hair: 0, shirt: '#f59e0b', style: 'bun' } as PersonLook,
}

/* ------------------------------------------------------------------ */
/* Dashboard shell (instructor / student / admin)                     */
/* ------------------------------------------------------------------ */

export type SideItem = { label: string; icon: string; to?: string; badge?: string }

export function DashShell({ items, active, sub, children, footer }: { items: SideItem[]; active: string; sub: string; children: ReactNode; footer?: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="fa-dash">
      <aside className={`fa-side ${open ? 'is-open' : ''}`}>
        <div className="fa-side__brand"><Logo light sub={sub} /></div>
        <nav>
          {items.map((it) => (
            <Link key={it.label} to={it.to ?? '#'} className={`fa-side__item ${it.label === active ? 'is-active' : ''}`} onClick={() => setOpen(false)}>
              <Icon name={it.icon} size={16} />
              <span>{it.label}</span>
              {it.badge && <em>{it.badge}</em>}
            </Link>
          ))}
        </nav>
        {footer}
      </aside>
      <button className="fa-side__toggle" onClick={() => setOpen(!open)} aria-label="Toggle sidebar"><Icon name="list" /></button>
      <main className="fa-dash__main">{children}</main>
    </div>
  )
}

export function Stat({ icon, value, label, tone = 'blue' }: { icon: string; value: string; label: string; tone?: string }) {
  return (
    <div className="fa-stat">
      <span className={`fa-stat__ic tone-${tone}`}><Icon name={icon} size={18} /></span>
      <div>
        <b>{value}</b>
        <small>{label}</small>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Area / line chart                                                   */
/* ------------------------------------------------------------------ */

export function AreaChart({ data, labels, height = 190, highlight, max }: { data: number[]; labels: string[]; height?: number; highlight?: { index: number; title: string; value: string }; max?: number }) {
  const W = 560
  const H = height
  const pad = { l: 36, r: 12, t: 14, b: 26 }
  const top = max ?? Math.ceil(Math.max(...data) / 100) * 100
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / (data.length - 1)
  const y = (v: number) => pad.t + (1 - v / top) * (H - pad.t - pad.b)
  const pts = data.map((v, i) => [x(i), y(v)] as const)
  const line = pts.map((p, i) => {
    if (i === 0) return `M${p[0]},${p[1]}`
    const [px, py] = pts[i - 1]
    const cx = (px + p[0]) / 2
    return `C${cx},${py} ${cx},${p[1]} ${p[0]},${p[1]}`
  }).join(' ')
  const area = `${line} L${x(data.length - 1)},${H - pad.b} L${x(0)},${H - pad.b} Z`
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(top * t))
  const [hover, setHover] = useState<number | null>(highlight?.index ?? null)
  return (
    <div className="fa-chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" onMouseLeave={() => setHover(highlight?.index ?? null)}>
        <defs>
          <linearGradient id="faArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#2f6fed" stopOpacity=".28" />
            <stop offset="1" stopColor="#2f6fed" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e8edf6" />
            <text x={pad.l - 8} y={y(t) + 3} textAnchor="end" className="fa-chart__tick">{t}</text>
          </g>
        ))}
        {labels.map((l, i) => (
          <text key={l} x={x(i)} y={H - 6} textAnchor="middle" className="fa-chart__tick">{l}</text>
        ))}
        <path d={area} fill="url(#faArea)" />
        <path d={line} fill="none" stroke="#2f6fed" strokeWidth="2.4" />
        {pts.map((p, i) => (
          <g key={i} onMouseEnter={() => setHover(i)}>
            <circle cx={p[0]} cy={p[1]} r={14} fill="transparent" />
            <circle cx={p[0]} cy={p[1]} r={hover === i ? 5 : 3.5} fill="#fff" stroke="#2f6fed" strokeWidth="2.2" />
          </g>
        ))}
      </svg>
      {hover !== null && (
        <div className="fa-chart__tip" style={{ left: `${(pts[hover][0] / W) * 100}%`, top: `${(pts[hover][1] / H) * 100}%` }}>
          <small>{highlight && hover === highlight.index ? highlight.title : labels[hover]}</small>
          <b>{highlight && hover === highlight.index ? highlight.value : `${data[hover].toLocaleString()}`}</b>
        </div>
      )}
    </div>
  )
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="fa-progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${value}%` }} />
    </div>
  )
}

export function Badge({ tone, children }: { tone: 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'gray'; children: ReactNode }) {
  return <span className={`fa-badge tone-${tone}`}>{children}</span>
}

export function Toast({ msg, onClose }: { msg: string | null; onClose: () => void }) {
  if (!msg) return null
  return (
    <div className="fa-toast" role="status" onClick={onClose}>
      <Icon name="checkCircle" size={16} /> {msg}
    </div>
  )
}

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null)
  const show = (m: string) => {
    setMsg(m)
    window.setTimeout(() => setMsg(null), 2600)
  }
  return { msg, show, clear: () => setMsg(null) }
}
