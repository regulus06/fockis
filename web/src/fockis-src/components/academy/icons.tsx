import { Program } from '../../types/academy';

const PROGRAM_ICON_PATHS: Record<Program['icon'], string> = {
  shield: 'M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z',
  server: 'M4 5h16v6H4z M4 13h16v6H4z',
  code: 'M8 9l-4 3 4 3M16 9l4 3-4 3M13 6l-2 12',
  briefcase: 'M3 8h18v11H3z M8 8V6a2 2 0 012-2h4a2 2 0 012 2v2',
  health: 'M12 4v16M4 12h16',
  wrench: 'M14 7a4 4 0 10-5.6 5.6L4 17l3 3 4.4-4.4A4 4 0 1014 7z',
  media: 'M3 5h18v13H3z M9 11a2 2 0 104 0 2 2 0 00-4 0z M14 15l2-2 4 4',
};

export function ProgramIcon({ icon }: { icon: Program['icon'] }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d={PROGRAM_ICON_PATHS[icon]} />
    </svg>
  );
}

const QUICK_ACTION_PATHS: Record<string, string> = {
  doc: 'M8 3h6l4 4v14H8V3z M14 3v4h4',
  pin: 'M12 21s7-6.5 7-11a7 7 0 10-14 0c0 4.5 7 11 7 11z',
  book: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5z',
  coin: 'M12 21a9 9 0 100-18 9 9 0 000 18z M12 7v10 M9 9.5c0-1 1-1.5 2.5-1.5s2.5.6 2.5 1.5c0 2-5 1-5 3s1 1.5 2.5 1.5 2.5-.6 2.5-1.5',
  grid: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  mail: 'M4 5h16v14H4z M4 5l8 7 8-7',
};

export function QuickActionIcon({ icon }: { icon: keyof typeof QUICK_ACTION_PATHS }) {
  return (
    <svg className="qa-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d={QUICK_ACTION_PATHS[icon]} />
    </svg>
  );
}

export function NetworkMotif() {
  return (
    <div className="net-lines" aria-hidden="true">
      <svg viewBox="0 0 800 500" preserveAspectRatio="none">
        <line className="edge" x1={40} y1={60} x2={220} y2={150} />
        <line className="edge" x1={220} y1={150} x2={120} y2={300} />
        <line className="edge" x1={220} y1={150} x2={400} y2={90} />
        <line className="edge" x1={400} y1={90} x2={560} y2={200} />
        <line className="edge" x1={120} y1={300} x2={300} y2={380} />
        <line className="edge" x1={560} y1={200} x2={700} y2={120} />
        <line className="edge" x1={300} y1={380} x2={500} y2={420} />
        <circle className="node" cx={40} cy={60} r={3} />
        <circle className="node" cx={220} cy={150} r={3.5} />
        <circle className="node" cx={120} cy={300} r={3} />
        <circle className="node" cx={400} cy={90} r={3} />
        <circle className="node" cx={560} cy={200} r={3.5} />
        <circle className="node" cx={700} cy={120} r={3} />
        <circle className="node" cx={300} cy={380} r={3} />
        <circle className="node" cx={500} cy={420} r={3} />
      </svg>
    </div>
  );
}
