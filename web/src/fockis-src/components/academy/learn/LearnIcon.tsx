/** Line icons for the Academy learning UI (24×24, stroke = currentColor). */
const P: Record<string, string> = {
  cap: 'M2 9l10-5 10 5-10 5L2 9z M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5 M22 9v6',
  live: 'M3 6h14v12H3z M17 10l4-2v8l-4-2 M8 12a2 2 0 104 0 2 2 0 00-4 0',
  calendar: 'M4 6h16v14H4z M4 10h16 M8 3v5 M16 3v5 M8 14h2 M12 14h2 M16 14h0',
  tools: 'M14 7a4 4 0 10-5.6 5.6L4 17l3 3 4.4-4.4A4 4 0 1014 7z M16 16l4 4',
  badge: 'M12 3l2.4 1.6 2.9-.1.9 2.7 2.3 1.8-.9 2.7.9 2.7-2.3 1.8-.9 2.7-2.9-.1L12 21l-2.4-1.6-2.9.1-.9-2.7-2.3-1.8.9-2.7-.9-2.7 2.3-1.8.9-2.7 2.9.1z M9 12l2 2 4-4',
  briefcase: 'M3 8h18v11H3z M8 8V6a2 2 0 012-2h4a2 2 0 012 2v2 M3 13h18',
  teach: 'M9 8a3 3 0 100-6 3 3 0 000 6z M3 20c0-4 3-6 6-6s6 2 6 6 M17 8h5 M19.5 5.5v5',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14z M21 21l-5-5',
  bell: 'M6 16V11a6 6 0 0112 0v5l2 2H4l2-2z M10 20a2 2 0 004 0',
  chat: 'M4 5h16v11H8l-4 4V5z',
  chevronDown: 'M6 9l6 6 6-6',
  arrowRight: 'M5 12h14 M13 6l6 6-6 6',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.5-7 10-7 10z',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  check: 'M5 12l5 5 9-10',
  lock: 'M6 11h12v9H6z M8 11V8a4 4 0 018 0v3',
  plus: 'M12 5v14 M5 12h14',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 15a3 3 0 100-6 3 3 0 000 6z',
  eyeOff: 'M3 3l18 18 M10.6 6.1A10 10 0 0112 6c6 0 10 6 10 6a17 17 0 01-3.2 3.8 M6.6 6.6C3.8 8.4 2 12 2 12s4 7 10 7a9.6 9.6 0 004.5-1.1',
  draft: 'M4 20h4L19 9l-4-4L4 16v4z M13 7l4 4',
  more: 'M5 12h.01 M12 12h.01 M19 12h.01',
  grid: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  book: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5z M8 7h7',
  users: 'M9 11a3 3 0 100-6 3 3 0 000 6z M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6 M16 5a3 3 0 010 6 M18 14c2 .8 3 3 3 6',
  enroll: 'M5 4h14v16H5z M9 9h6 M9 13h6 M9 17h3',
  money: 'M12 21a9 9 0 100-18 9 9 0 000 18z M12 7v10 M15 9.5c0-1-1.3-1.5-3-1.5s-3 .6-3 1.6c0 2.2 6 1.2 6 3.6 0 1-1.3 1.8-3 1.8s-3-.7-3-1.7',
  folder: 'M3 6h6l2 2h10v11H3z',
  quiz: 'M9 9a3 3 0 115 2.2c-1 .7-2 1.3-2 2.8 M12 18h.01 M12 22a10 10 0 100-20 10 10 0 000 20z',
  assignment: 'M8 3h8v4H8z M6 5H4v16h16V5h-2 M8 12h8 M8 16h5',
  chart: 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  home: 'M3 11l9-8 9 8 M5 9v12h14V9',
  mic: 'M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3z M5 11a7 7 0 0014 0 M12 18v3',
  micOff: 'M3 3l18 18 M9 9v3a3 3 0 005.1 2.1 M15 9.3V6a3 3 0 00-5.9-.8 M5 11a7 7 0 0011.8 5 M19 11a7 7 0 01-.6 2.8 M12 18v3',
  camera: 'M3 7h12v10H3z M15 10l6-3v10l-6-3',
  cameraOff: 'M3 3l18 18 M15 10l6-3v10l-6-3 M3 7h4 M15 17H3V7',
  screen: 'M3 4h18v12H3z M8 20h8 M12 16v4 M12 13V7 M9 10l3-3 3 3',
  file: 'M7 3h7l5 5v13H7z M14 3v5h5 M12 11v6 M9 14l3 3 3-3',
  board: 'M3 4h18v12H3z M7 20l2-4 M17 20l-2-4 M7 12l3-3 2 2 4-4',
  poll: 'M5 20V12 M12 20V5 M19 20v-6',
  breakout: 'M3 3h8v8H3z M13 3h8v8h-8z M3 13h8v8H3z M13 13h8v8h-8z',
  hand: 'M8 13V5.5a1.5 1.5 0 013 0V12 M11 11V4.5a1.5 1.5 0 013 0V12 M14 11V6a1.5 1.5 0 013 0v8c0 4-2.5 7-6 7-2.6 0-4-1.2-5.6-3.6L3.7 14.2a1.5 1.5 0 012.5-1.6L8 15',
  record: 'M12 17a5 5 0 100-10 5 5 0 000 10z M12 22a10 10 0 100-20 10 10 0 000 20z',
  attendance: 'M9 11a3 3 0 100-6 3 3 0 000 6z M3 20c0-3.5 2.7-6 6-6 1.6 0 3 .5 4 1.4 M15 18l2 2 4-4',
  notes: 'M5 3h14v18H5z M9 8h6 M9 12h6 M9 16h3',
  send: 'M4 12l16-8-6 16-2-6-8-2z',
  close: 'M6 6l12 12 M18 6L6 18',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  signal: 'M4 20v-3 M9 20v-7 M14 20v-11 M19 20V5',
  pin: 'M12 21s7-6.5 7-11a7 7 0 10-14 0c0 4.5 7 11 7 11z M12 12a2 2 0 100-4 2 2 0 000 4z',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18z M12 7v5l3 2',
  globe: 'M12 21a9 9 0 100-18 9 9 0 000 18z M3 12h18 M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z',
  palette: 'M12 3a9 9 0 000 18c1 0 1.5-.7 1.5-1.5 0-1.2-1-1.5-1-2.5 0-.8.7-1.5 1.5-1.5H17a4 4 0 004-4c0-4.7-4-8.5-9-8.5z M7.5 11.5h.01 M10 7.5h.01 M14.5 7.5h.01',
  pulse: 'M3 12h4l2-5 4 10 2-5h6',
  chef: 'M7 14v6h10v-6 M6 14a4 4 0 01-.6-7.9A5 5 0 0112 3a5 5 0 016.6 3.1A4 4 0 0118 14H6z',
  code: 'M8 9l-4 3 4 3 M16 9l4 3-4 3 M13 6l-2 12',
  shield: 'M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z',
  language: 'M4 5h9 M8.5 3v2 M6 5c.5 3 2.5 5.5 5 7 M11 5c-.5 3-3 6-6.5 7.5 M13 21l4-9 4 9 M14.3 18h5.4',
  music: 'M9 18V5l11-2v13 M9 18a3 3 0 11-6 0 3 3 0 016 0z M20 16a3 3 0 11-6 0 3 3 0 016 0z',
  photo: 'M3 7h4l2-3h6l2 3h4v13H3z M12 17a4 4 0 100-8 4 4 0 000 8z',
  hammer: 'M14 4l6 6-3 3-6-6z M11 7L3 15l3 3 8-8',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  smile: 'M12 21a9 9 0 100-18 9 9 0 000 18z M8.5 14a4 4 0 007 0 M9 9.5h.01 M15 9.5h.01',
  paperclip: 'M20 11l-8.5 8.5a5 5 0 01-7-7L13 4a3.5 3.5 0 015 5l-8.5 8.5a2 2 0 01-3-3L14 7',
  upload: 'M12 16V4 M7 9l5-5 5 5 M4 20h16',
  external: 'M14 4h6v6 M20 4l-9 9 M18 14v6H4V6h6',
  trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13',
  copy: 'M8 8h12v12H8z M4 16V4h12',
  archive: 'M3 4h18v4H3z M5 8v12h14V8 M10 12h4',
  logout: 'M15 4h4v16h-4 M10 8l-4 4 4 4 M6 12h10',
};

export type LearnIconName = keyof typeof P;

export default function LearnIcon({ name, size = 20, className, strokeWidth = 1.7 }: { name: string; size?: number; className?: string; strokeWidth?: number }) {
  const d = P[name] ?? P.book;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {d.split(' M').map((seg, i) => (
        <path key={i} d={i === 0 ? seg : `M${seg}`} />
      ))}
    </svg>
  );
}

/** Maps a category slug to an icon; extensible — unknown slugs fall back to "book". */
export const CATEGORY_ICONS: Record<string, string> = {
  technology: 'code',
  cybersecurity: 'shield',
  business: 'chart',
  'culinary-arts': 'chef',
  'pastry-and-baking': 'chef',
  'health-and-wellness': 'pulse',
  'design-and-arts': 'palette',
  languages: 'language',
  education: 'book',
  'professional-skills': 'briefcase',
  construction: 'hammer',
  beauty: 'sparkle',
  music: 'music',
  photography: 'photo',
};
