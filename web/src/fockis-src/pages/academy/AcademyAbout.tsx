import { Link } from 'react-router-dom';
import PageHero from '../../components/academy/PageHero';
import { FeatureCard, SectionHead, StateLine, asItems } from '../../components/academy/market/FaBlocks';
import { Person } from '../../components/academy/market/Shared';
import { useContentSection } from '../../lib/useContentSection';

/** /academy/about — CMS sections "about-pillars", "about-facts", "about-leadership". */
export default function AcademyAbout() {
  const pillars = useContentSection('about-pillars');
  const facts = useContentSection('about-facts');
  const leadership = useContentSection('about-leadership');
  const p = asItems(pillars.items);
  const f = asItems(facts.items);
  const l = asItems(leadership.items);

  return (
    <div className="fa-root fa-page">
      <PageHero
        crumb="About"
        title="About Fockis Academy"
        subtitle="A modern, career-focused institution and learning marketplace built for a changing workforce."
        icon="building"
        actions={<Link className="fa-btn fa-btn--primary" to="/academy/teach">Teach With Us</Link>}
      />
      <div className="fa-container fa-section">
        <StateLine loading={pillars.loading} error={!pillars.loading && pillars.error} />
        {!pillars.loading && !pillars.error && (
          <div className="fa-fgrid fa-fgrid--2">
            {p.map((x, i) => (
              <FeatureCard key={x._id ?? x.title} index={i} icon={['globe', 'heart'][i % 2]} title={x.title} text={x.description} />
            ))}
          </div>
        )}

        {!facts.loading && !facts.error && f.length > 0 && (
          <div className="fa-section">
            <SectionHead eyebrow="At a glance" title="Facts about Fockis Academy" />
            <div className="fa-fgrid fa-fgrid--3">
              {f.map((x, i) => (
                <FeatureCard key={x._id ?? x.title} index={i + 2} title={x.title} text={x.description} />
              ))}
            </div>
          </div>
        )}

        <div className="fa-section">
          <SectionHead eyebrow="Leadership" title="Institutional Leadership" />
          <StateLine loading={leadership.loading} error={!leadership.loading && leadership.error} empty={!leadership.loading && !leadership.error && l.length === 0} />
          {!leadership.loading && !leadership.error && (
            <div className="fa-fgrid fa-fgrid--3">
              {l.map((x, i) => (
                <div key={x._id ?? x.title} className="fa-card fa-person-card">
                  <Person look={{ skin: (i * 2) % 6, hair: i % 6, shirt: ['#1d5ee8', '#0b1f4d', '#7c3aed'][i % 3], style: i % 2 ? 'long' : 'short', glasses: i % 3 === 0 }} size={72} />
                  <b>{x.title}</b>
                  {x.description && <p>{x.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
