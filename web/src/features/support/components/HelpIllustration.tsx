/**
 * Support illustration for the Help & Support banner: headset, laptop with
 * the Fockis mark, and chat bubbles. Pure SVG, scales with its container.
 */
const BASE = import.meta.env.BASE_URL || "/";

export default function HelpIllustration({ className = "fk-help-hero__art" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 480 190" role="img" aria-label="Fockis support headset and laptop">
      <defs>
        <linearGradient id="fkh-wave" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.75" />
        </linearGradient>
        <linearGradient id="fkh-band" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3d8bff" />
          <stop offset="1" stopColor="#0f4fd1" />
        </linearGradient>
        <linearGradient id="fkh-cup" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f97ff" />
          <stop offset="1" stopColor="#1546b8" />
        </linearGradient>
        <linearGradient id="fkh-screen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5aa2ff" />
          <stop offset="0.55" stopColor="#2168f0" />
          <stop offset="1" stopColor="#1240b4" />
        </linearGradient>
        <linearGradient id="fkh-frame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d2f6b" />
          <stop offset="1" stopColor="#0c1838" />
        </linearGradient>
        <linearGradient id="fkh-base" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c9d8f5" />
          <stop offset="1" stopColor="#8fa9de" />
        </linearGradient>
        <linearGradient id="fkh-bubble" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7fb2ff" />
          <stop offset="1" stopColor="#2f7bf5" />
        </linearGradient>
        <linearGradient id="fkh-bubble-soft" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b9cdfa" />
          <stop offset="1" stopColor="#8aa7ef" />
        </linearGradient>
        <filter id="fkh-shadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#1d4fbf" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* soft background waves */}
      <path d="M90 190 C 190 140, 300 200, 480 120 L480 190 Z" fill="url(#fkh-wave)" opacity="0.7" />
      <path d="M150 190 C 250 160, 360 190, 480 150 L480 190 Z" fill="#ffffff" opacity="0.45" />

      {/* left chat bubble */}
      <g filter="url(#fkh-shadow)">
        <rect x="14" y="76" width="58" height="42" rx="12" fill="url(#fkh-bubble-soft)" />
        <path d="M52 116 L62 128 L62 116 Z" fill="#8aa7ef" />
        <rect x="26" y="90" width="34" height="5" rx="2.5" fill="#ffffff" />
        <rect x="26" y="100" width="22" height="5" rx="2.5" fill="#ffffff" />
      </g>

      {/* headset */}
      <g filter="url(#fkh-shadow)">
        <path
          d="M96 74 C 96 30, 128 8, 150 8 C 176 8, 204 30, 200 76"
          fill="none"
          stroke="url(#fkh-band)"
          strokeWidth="11"
          strokeLinecap="round"
        />
        <path d="M100 66 C 102 34, 126 16, 150 16" fill="none" stroke="#9cc4ff" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
        <rect x="80" y="60" width="28" height="44" rx="12" fill="url(#fkh-cup)" transform="rotate(-12 94 82)" />
        <rect x="84" y="64" width="10" height="34" rx="5" fill="#7fb2ff" opacity="0.55" transform="rotate(-12 89 81)" />
        <rect x="188" y="62" width="28" height="44" rx="12" fill="url(#fkh-cup)" transform="rotate(10 202 84)" />
        <path d="M96 104 C 98 122, 112 132, 132 132" fill="none" stroke="#1546b8" strokeWidth="5" strokeLinecap="round" />
        <rect x="128" y="126" width="18" height="11" rx="5.5" fill="#0f2f86" />
      </g>

      {/* top chat bubble */}
      <g filter="url(#fkh-shadow)">
        <rect x="214" y="24" width="56" height="40" rx="11" fill="url(#fkh-bubble)" />
        <path d="M226 62 L224 76 L238 62 Z" fill="#3a82f5" />
        <rect x="226" y="36" width="32" height="5" rx="2.5" fill="#ffffff" />
        <rect x="226" y="46" width="20" height="5" rx="2.5" fill="#ffffff" />
      </g>

      {/* laptop */}
      <g filter="url(#fkh-shadow)">
        <path d="M188 80 L334 74 L318 166 L172 170 Z" fill="url(#fkh-frame)" />
        <path d="M196 87 L325 82 L311 159 L181 163 Z" fill="url(#fkh-screen)" />
        <path d="M196 87 L262 84 L225 162 L181 163 Z" fill="#ffffff" opacity="0.08" />
        <image href={`${BASE}brand/fockis-icon-192.png`} x="230" y="102" width="44" height="44" transform="skewX(-8) translate(18 0)" />
        <path d="M128 172 L330 166 L346 178 L146 184 Z" fill="url(#fkh-base)" />
        <path d="M146 184 L346 178 L346 181 L148 187 Z" fill="#6f8fd2" />
      </g>
    </svg>
  );
}
