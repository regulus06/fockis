import { FockisMark, Person, PEOPLE } from './Shared'

/** Original SVG illustrations standing in for the photography on the design board.
 *  Each accepts a className so pages can swap in real cover images (course.coverUrl) later. */

export function PastryArt({ className = '' }: { className?: string }) {
  // crescent of overlapping lobes, biggest in the middle
  const croissant = (x: number, y: number, s: number, r: number) => (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <ellipse cx="0" cy="8" rx="62" ry="10" fill="#4a280c" opacity=".35" />
      {[-3, -2, -1, 0, 1, 2, 3].map((k) => {
        const a = (k * 22 * Math.PI) / 180
        const rx = 15 - Math.abs(k) * 2.6
        const ry = 25 - Math.abs(k) * 4.2
        const cx = Math.sin(a) * 40
        const cy = -Math.cos(a) * 18 + 6
        return (
          <g key={k} transform={`translate(${cx} ${cy}) rotate(${k * 24})`}>
            <ellipse rx={rx} ry={ry} fill={Math.abs(k) % 2 ? '#c97a20' : '#dd902f'} stroke="#8a4a10" strokeWidth="1.5" />
            <ellipse rx={rx * 0.45} ry={ry * 0.6} cx={-rx * 0.25} cy={-ry * 0.2} fill="#f6c27a" opacity=".55" />
          </g>
        )
      })}
    </g>
  )
  return (
    <svg className={`fa-art ${className}`} viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="pBg" cx=".35" cy=".3" r="1">
          <stop offset="0" stopColor="#f8dcae" />
          <stop offset=".6" stopColor="#c4843c" />
          <stop offset="1" stopColor="#6b3d16" />
        </radialGradient>
      </defs>
      <rect width="400" height="240" fill="url(#pBg)" />
      <rect y="170" width="400" height="70" fill="#5a3412" opacity=".55" />
      {croissant(90, 150, 1.1, -12)}
      {croissant(230, 165, 1.25, 8)}
      {croissant(345, 140, 0.95, -20)}
      {croissant(160, 90, 0.8, 15)}
      {croissant(300, 75, 0.75, -5)}
    </svg>
  )
}

export function KitchenArt({ className = '' }: { className?: string }) {
  return (
    <svg className={`fa-art ${className}`} viewBox="0 0 300 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="300" height="220" fill="#f1e4d0" />
      <rect y="140" width="300" height="80" fill="#c9a77b" />
      <rect x="20" y="20" width="110" height="70" rx="6" fill="#e8d3b4" />
      <rect x="170" y="20" width="110" height="70" rx="6" fill="#e8d3b4" />
      <g transform="translate(40 52)"><Person look={PEOPLE.chef} size={110} bg="transparent" /></g>
      <g transform="translate(150 60)"><Person look={{ skin: 1, hair: 0, shirt: '#ffffff', style: 'chef' }} size={100} bg="transparent" /></g>
      <ellipse cx="150" cy="185" rx="70" ry="14" fill="#fff" />
      <circle cx="125" cy="178" r="10" fill="#d98a2b" /><circle cx="150" cy="176" r="11" fill="#c97a20" /><circle cx="176" cy="179" r="9" fill="#e09a3b" />
    </svg>
  )
}

export function CyberArt({ className = '' }: { className?: string }) {
  return (
    <svg className={`fa-art ${className}`} viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="cBg" cx=".5" cy=".5" r=".7">
          <stop offset="0" stopColor="#0d4fb8" />
          <stop offset="1" stopColor="#031335" />
        </radialGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="4" /></filter>
      </defs>
      <rect width="400" height="240" fill="url(#cBg)" />
      <g stroke="#2a8cff" strokeOpacity=".35" strokeWidth="1">
        {Array.from({ length: 14 }).map((_, i) => <path key={i} d={`M${i * 30} 0V240`} />)}
        {Array.from({ length: 9 }).map((_, i) => <path key={i} d={`M0 ${i * 30}H400`} />)}
      </g>
      <g stroke="#5fb4ff" strokeWidth="1.5" fill="none" opacity=".7">
        <path d="M20 60h60l20 20h40M380 50h-70l-20 30h-30M30 190h70l20-20h40M370 200h-60l-20-25h-30" />
        <circle cx="140" cy="80" r="3" fill="#5fb4ff" /><circle cx="260" cy="80" r="3" fill="#5fb4ff" />
        <circle cx="160" cy="170" r="3" fill="#5fb4ff" /><circle cx="260" cy="175" r="3" fill="#5fb4ff" />
      </g>
      <g transform="translate(200 122)">
        <path d="M0-78 58-56v38C58 22 32 52 0 66-32 52-58 22-58-18v-38z" fill="#2a8cff" opacity=".45" filter="url(#glow)" />
        <path d="M0-70 50-51v33C50 16 28 42 0 56-28 42-50 16-50-18v-33z" fill="#0b3a8c" stroke="#7cc4ff" strokeWidth="3" />
        <rect x="-20" y="-8" width="40" height="32" rx="5" fill="#9fd6ff" />
        <path d="M-12-8v-10a12 12 0 0 1 24 0v10" fill="none" stroke="#9fd6ff" strokeWidth="5" />
        <circle cx="0" cy="6" r="4.5" fill="#0b3a8c" /><rect x="-2" y="7" width="4" height="9" fill="#0b3a8c" />
      </g>
    </svg>
  )
}

export function LibraryArt({ className = '' }: { className?: string }) {
  const shelf = (y: number) => (
    <g key={y}>
      <rect x="0" y={y + 34} width="300" height="5" fill="#5b3a1d" />
      {Array.from({ length: 22 }).map((_, i) => (
        <rect key={i} x={6 + i * 13.4} y={y + (i % 3) * 3} width={10} height={34 - (i % 3) * 3} fill={['#8b2d2d', '#2d4f8b', '#3b7a4a', '#b0842f', '#6a3d8a', '#a0522d'][i % 6]} />
      ))}
    </g>
  )
  return (
    <svg className={`fa-art ${className}`} viewBox="0 0 300 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="300" height="220" fill="#3b2614" />
      {[6, 48, 90].map(shelf)}
      <rect y="150" width="300" height="70" fill="#6b4524" />
      <g transform="translate(40 108)"><Person look={{ skin: 3, hair: 2, shirt: '#2f5e9e', style: 'short' }} size={86} bg="transparent" /></g>
      <g transform="translate(150 112)"><Person look={{ skin: 1, hair: 0, shirt: '#8a3a3a', style: 'long' }} size={82} bg="transparent" /></g>
      <rect x="60" y="182" width="64" height="6" rx="2" fill="#f2e6cf" /><rect x="168" y="184" width="58" height="6" rx="2" fill="#f2e6cf" />
      <rect y="150" width="300" height="70" fill="url(#none)" />
    </svg>
  )
}

/** Big marketplace hero: instructor with laptop + chef. */
export function HeroDuo({ className = '' }: { className?: string }) {
  return (
    <svg className={`fa-art ${className}`} viewBox="0 0 420 280" aria-hidden="true">
      <circle cx="140" cy="150" r="120" fill="#ffffff" opacity=".08" />
      <circle cx="300" cy="140" r="110" fill="#ffffff" opacity=".08" />
      <g transform="translate(20 50)"><Person look={{ ...PEOPLE.elince, shirt: '#1d4fcf' }} size={230} bg="transparent" /></g>
      <rect x="70" y="232" width="150" height="48" rx="6" fill="#c9d3e3" />
      <rect x="78" y="238" width="134" height="34" rx="3" fill="#e8eef8" />
      <g transform="translate(130 252)"><FockisMark size={14} /></g>
      <g transform="translate(200 40)"><Person look={{ skin: 2, hair: 0, shirt: '#ffffff', style: 'chef' }} size={230} bg="transparent" /></g>
      <path d="M268 262h70" stroke="#1d5ee8" strokeWidth="6" />
      <g transform="translate(330 220)"><FockisMark size={22} /></g>
    </svg>
  )
}

export function Certificate({ name = 'James Peterson', course = 'Cybersecurity Fundamentals', date = 'Nov 15, 2026', id = 'FA-2026-00045', compact = false }: { name?: string; course?: string; date?: string; id?: string; compact?: boolean }) {
  return (
    <div className={`fa-cert ${compact ? 'is-compact' : ''}`}>
      <div className="fa-cert__inner">
        <div className="fa-cert__brand"><FockisMark size={compact ? 22 : 34} /><div><b>Fockis</b><span>Academy</span></div></div>
        <small className="fa-cert__lead">This is to certify that</small>
        <div className="fa-cert__name">{name}</div>
        <small className="fa-cert__lead">has successfully completed</small>
        <div className="fa-cert__course">{course}</div>
        <div className="fa-cert__meta"><span>Issued on: {date}</span><span>Cert. No: {id}</span></div>
        <svg className="fa-cert__seal" viewBox="0 0 60 70" aria-hidden="true">
          <path d="M18 40 10 68l12-6 8 8 3-26zM42 40l8 28-12-6-8 8-3-26z" fill="#1d5ee8" />
          <circle cx="30" cy="28" r="22" fill="#e9b23c" stroke="#b9831a" strokeWidth="2" />
          <circle cx="30" cy="28" r="15" fill="none" stroke="#fff4d6" strokeWidth="1.5" strokeDasharray="2 2" />
          <path d="M23 28l5 5 9-10" stroke="#fff" strokeWidth="3" fill="none" />
        </svg>
      </div>
    </div>
  )
}
