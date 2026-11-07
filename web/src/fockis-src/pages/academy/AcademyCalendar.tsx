import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../../components/academy/PageHero';
import { SectionHead, StateLine, asItems } from '../../components/academy/market/FaBlocks';
import { Icon } from '../../components/academy/market/Icon';
import { useContentSection } from '../../lib/useContentSection';
import { useAcademyLoad } from '../../lib/useAcademyLoad';
import { getEvents, type AcademyEvent } from '../../lib/academyApi';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const startOf = (e: AcademyEvent) => new Date(e.startDate || e.date || '');

/**
 * /academy/calendar — a real month calendar of GET /academy/events (seminars,
 * workshops, deadlines) plus the CMS "calendar-milestones" key dates.
 */
export default function AcademyCalendar() {
  const milestones = useContentSection('calendar-milestones');
  const events = useAcademyLoad(getEvents);
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [picked, setPicked] = useState<string | null>(null);

  const all = events.state.status === 'ready' ? events.state.data.filter((e) => e.isActive !== false) : [];
  const byDay = useMemo(() => {
    const m = new Map<string, AcademyEvent[]>();
    all.forEach((e) => {
      const d = startOf(e);
      if (Number.isNaN(d.getTime())) return;
      const k = dayKey(d);
      m.set(k, [...(m.get(k) ?? []), e]);
    });
    return m;
  }, [all]);

  const cells = useMemo(() => {
    const first = month.getDay();
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  }, [month]);

  const todayKey = dayKey(new Date());
  const monthEvents = all
    .filter((e) => {
      const d = startOf(e);
      return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth();
    })
    .sort((a, b) => startOf(a).getTime() - startOf(b).getTime());
  const listed = picked ? byDay.get(picked) ?? [] : monthEvents;
  const keyDates = asItems(milestones.items);

  return (
    <div className="fa-root fa-page">
      <PageHero crumb="Seminars & Events" title="Academic Calendar" subtitle="Seminars, workshops, live classes and key academic dates — all in one place." icon="calendar" />
      <div className="fa-container fa-section">
        {!milestones.loading && !milestones.error && keyDates.length > 0 && (
          <div className="fa-milestones">
            {keyDates.map((m) => (
              <div key={m._id ?? m.title} className="fa-card">
                <span>{m.meta?.date ?? ''}</span>
                <b>{m.title}</b>
              </div>
            ))}
          </div>
        )}

        <div className="fa-cal-layout">
          <div className="fa-card fa-cal">
            <div className="fa-cal__head">
              <button className="fa-icon-btn" aria-label="Previous month" onClick={() => { setPicked(null); setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1)); }}>
                <Icon name="left" size={16} />
              </button>
              <h3>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
              <button className="fa-icon-btn" aria-label="Next month" onClick={() => { setPicked(null); setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1)); }}>
                <Icon name="right" size={16} />
              </button>
            </div>
            <div className="fa-cal__grid">
              {DAY_LABELS.map((d) => (
                <span key={d} className="fa-cal__dow">{d}</span>
              ))}
              {cells.map((d, i) => {
                if (!d) return <span key={`x${i}`} />;
                const k = dayKey(d);
                const evs = byDay.get(k) ?? [];
                return (
                  <button key={k} className={`fa-cal__day ${k === todayKey ? 'is-today' : ''} ${evs.length ? 'has-ev' : ''} ${picked === k ? 'is-picked' : ''}`} onClick={() => setPicked(picked === k ? null : k)}>
                    <span>{d.getDate()}</span>
                    {evs.slice(0, 2).map((e) => (
                      <em key={String(e._id || e.id || e.title)}>{e.title}</em>
                    ))}
                    {evs.length > 2 && <small>+{evs.length - 2} more</small>}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <SectionHead title={picked ? 'Events on this day' : 'This month'} action={picked ? <button className="fa-link" onClick={() => setPicked(null)}>Show all</button> : undefined} />
            <StateLine loading={events.state.status === 'loading'} error={events.state.status === 'error' ? events.state.error : false} onRetry={events.reload} />
            {events.state.status === 'ready' && listed.length === 0 && <div className="fa-state">No events scheduled.</div>}
            <ul className="fa-evlist">
              {listed.map((e) => {
                const id = String(e._id || e.id || '');
                const d = startOf(e);
                return (
                  <li key={id || e.title}>
                    <Link className="fa-card fa-evrow" to={id ? `/academy/events/${encodeURIComponent(id)}` : '/academy/calendar'}>
                      <span className="fa-evrow__date">
                        <b>{Number.isNaN(d.getTime()) ? '–' : d.getDate()}</b>
                        <small>{Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short' })}</small>
                      </span>
                      <span>
                        <b>{e.title}</b>
                        <small>
                          {[e.startTime, (e.location || (e.loc as string | undefined))].filter(Boolean).join(' · ') || 'Details inside'}
                        </small>
                      </span>
                      <Icon name="right" size={15} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
