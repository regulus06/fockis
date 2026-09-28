import PageHero from '../../components/academy/PageHero';
import StepCard from '../../components/academy/StepCard';
import { useContentSection } from '../../lib/useContentSection';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EVENT_DAYS: Record<number, string> = { 5: 'Registration', 25: 'Classes Begin', 8: 'Drop Deadline' };
const DAYS = Array.from({ length: 30 }, (_, i) => i + 1);

export default function AcademyCalendar() {
  const { items, loading, error } = useContentSection('calendar-milestones');

  return (
    <>
      <PageHero crumb="Academics" title="Academic Calendar" subtitle="Fall 2026 key dates and milestones." />
      <section className="section">
        <div className="wrap">
          {loading && <p>Loading…</p>}
          {!loading && error && <p>Couldn&apos;t load this section right now.</p>}
          {!loading && !error && (
            <div className="steps-row" style={{ marginBottom: 48 }}>
              {items.map((m) => (
                <StepCard key={m._id ?? m.title} step={m.meta?.date ?? ''} title={m.title} desc="" />
              ))}
            </div>
          )}

          <div className="section-head">
            <div className="eyebrow">August 2026</div>
            <h2>Calendar View</h2>
          </div>
          <div className="cal-grid">
            {DAY_LABELS.map((d) => (
              <div className="cal-head" key={d}>{d}</div>
            ))}
            {DAYS.map((d) => (
              <div className={`cal-day${EVENT_DAYS[d] ? ' has-event' : ''}`} key={d}>
                <div className="d">{d}</div>
                {EVENT_DAYS[d] && <span className="evt">{EVENT_DAYS[d]}</span>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
