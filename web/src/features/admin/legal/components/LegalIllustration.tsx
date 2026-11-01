/**
 * Banner illustration for Legal & Evidence: document stack, a folder with
 * a shield and lock, and a gavel. Pure SVG, original artwork.
 */
export default function LegalIllustration({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 480 190" role="img" aria-label="Protected evidence folder and gavel">
      <defs>
        <linearGradient id="fkl-folder" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f97ff" />
          <stop offset="1" stopColor="#1546b8" />
        </linearGradient>
        <linearGradient id="fkl-folder-back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a6ae6" />
          <stop offset="1" stopColor="#1b49b0" />
        </linearGradient>
        <linearGradient id="fkl-shield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d3d8f" />
          <stop offset="1" stopColor="#0c1f55" />
        </linearGradient>
        <linearGradient id="fkl-wood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4a5f8f" />
          <stop offset="1" stopColor="#17264f" />
        </linearGradient>
        <linearGradient id="fkl-paper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dfe8fb" />
        </linearGradient>
        <linearGradient id="fkl-wave" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.75" />
        </linearGradient>
        <filter id="fkl-shadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#1d4fbf" floodOpacity="0.22" />
        </filter>
      </defs>

      <path d="M60 190 C 170 140, 300 200, 480 120 L480 190 Z" fill="url(#fkl-wave)" opacity="0.7" />

      {/* faded document on the left */}
      <g opacity="0.75" filter="url(#fkl-shadow)">
        <rect x="18" y="70" width="58" height="74" rx="8" fill="url(#fkl-paper)" />
        <rect x="28" y="86" width="38" height="5" rx="2.5" fill="#b9cdfa" />
        <rect x="28" y="98" width="30" height="5" rx="2.5" fill="#b9cdfa" />
        <rect x="28" y="110" width="36" height="5" rx="2.5" fill="#b9cdfa" />
      </g>

      {/* folder with papers */}
      <g filter="url(#fkl-shadow)">
        <path d="M96 30 h52 l12 12 h82 a10 10 0 0 1 10 10 v104 a10 10 0 0 1 -10 10 H96 a10 10 0 0 1 -10 -10 V40 a10 10 0 0 1 10 -10 Z" fill="url(#fkl-folder-back)" />
        <rect x="104" y="20" width="132" height="92" rx="6" fill="url(#fkl-paper)" transform="rotate(-4 170 66)" />
        <rect x="112" y="28" width="132" height="92" rx="6" fill="#ffffff" />
        <rect x="126" y="44" width="80" height="6" rx="3" fill="#b9cdfa" />
        <rect x="126" y="58" width="96" height="6" rx="3" fill="#d4e1fb" />
        <path d="M86 82 a10 10 0 0 1 10 -10 h160 a10 10 0 0 1 10 10 l-8 76 a10 10 0 0 1 -10 9 H100 a10 10 0 0 1 -10 -9 Z" fill="url(#fkl-folder)" />
        {/* shield + lock */}
        <path d="M176 80 L206 92 V116 C206 136 192 148 176 154 C160 148 146 136 146 116 V92 Z" fill="url(#fkl-shield)" stroke="#ffffff" strokeWidth="4" />
        <rect x="164" y="112" width="24" height="20" rx="4" fill="#ffffff" />
        <path d="M168 112 v-6 a8 8 0 0 1 16 0 v6" fill="none" stroke="#ffffff" strokeWidth="4" />
        <circle cx="176" cy="121" r="3" fill="#0c1f55" />
        <rect x="174.5" y="122" width="3" height="6" rx="1.5" fill="#0c1f55" />
      </g>

      {/* second document */}
      <g filter="url(#fkl-shadow)" opacity="0.9">
        <rect x="290" y="38" width="62" height="80" rx="8" fill="url(#fkl-paper)" />
        <rect x="300" y="54" width="42" height="5" rx="2.5" fill="#b9cdfa" />
        <rect x="300" y="66" width="34" height="5" rx="2.5" fill="#b9cdfa" />
        <rect x="300" y="78" width="40" height="5" rx="2.5" fill="#b9cdfa" />
        <rect x="300" y="90" width="28" height="5" rx="2.5" fill="#b9cdfa" />
      </g>

      {/* gavel */}
      <g filter="url(#fkl-shadow)">
        <rect x="350" y="166" width="96" height="12" rx="6" fill="url(#fkl-wood)" />
        <rect x="364" y="156" width="68" height="12" rx="5" fill="#2c3f72" />
        <g transform="rotate(-38 372 92)">
          <rect x="336" y="72" width="70" height="34" rx="9" fill="url(#fkl-wood)" />
          <rect x="330" y="68" width="10" height="42" rx="4" fill="#5b6f9f" />
          <rect x="402" y="68" width="10" height="42" rx="4" fill="#5b6f9f" />
          <rect x="366" y="104" width="10" height="70" rx="5" fill="#2c3f72" />
        </g>
      </g>
    </svg>
  );
}
