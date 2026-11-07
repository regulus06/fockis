import { Link } from 'react-router-dom';
import PageHero from '../../components/academy/PageHero';
import { FeatureCard, SectionHead, StateLine, asItems } from '../../components/academy/market/FaBlocks';
import { Icon } from '../../components/academy/market/Icon';
import { useContentSection } from '../../lib/useContentSection';

/** /academy/financial-aid — CMS sections "tuition-rates" and "financial-aid-options". */
export default function AcademyFinancialAid() {
  const tuition = useContentSection('tuition-rates');
  const options = useContentSection('financial-aid-options');
  const rates = asItems(tuition.items);
  const ways = asItems(options.items);

  return (
    <div className="fa-root fa-page">
      <PageHero
        crumb="Admissions"
        title="Tuition & Financial Aid"
        subtitle="Understand the true cost of your education and the aid available to make it affordable."
        icon="wallet"
        actions={<Link className="fa-btn fa-btn--primary" to="/academy/contact">Talk to Financial Aid</Link>}
      />
      <div className="fa-container fa-section">
        <SectionHead eyebrow="Tuition" title="Tuition rates" />
        <StateLine loading={tuition.loading} error={!tuition.loading && tuition.error} empty={!tuition.loading && !tuition.error && rates.length === 0} />
        {!tuition.loading && !tuition.error && (
          <div className="fa-fgrid fa-fgrid--3">
            {rates.map((t, i) => (
              <div key={t._id ?? t.title} className={`fa-card fa-price-card ${i === 1 ? 'is-featured' : ''}`}>
                <span className="fa-price-card__label">{t.title}</span>
                <div className="fa-price-card__value">{t.meta?.price ?? '—'}</div>
                {t.description && <p>{t.description}</p>}
                <small className="fa-muted">Example rate — confirm with Financial Aid.</small>
              </div>
            ))}
          </div>
        )}

        <div className="fa-section">
          <SectionHead eyebrow="Aid options" title="Ways to pay for Fockis Academy" />
          <StateLine loading={options.loading} error={!options.loading && options.error} empty={!options.loading && !options.error && ways.length === 0} />
          {!options.loading && !options.error && (
            <div className="fa-fgrid fa-fgrid--4">
              {ways.map((t, i) => (
                <FeatureCard key={t._id ?? t.title} index={i + 2} icon={['wallet', 'award', 'briefcase', 'dollar'][i % 4]} title={t.title} text={t.description ?? `Learn how ${t.title.toLowerCase()} can reduce your out-of-pocket cost.`} />
              ))}
            </div>
          )}
        </div>

        <div className="fa-band">
          <div>
            <b>
              <Icon name="help" size={16} /> Questions about cost?
            </b>
            <p>Our financial aid team can walk you through tuition, scholarships and payment plans.</p>
          </div>
          <div className="fa-band__btns">
            <Link className="fa-btn fa-btn--primary" to="/academy/contact">Contact Financial Aid</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
