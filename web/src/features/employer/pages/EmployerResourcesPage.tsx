import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ClipboardList,
  ExternalLink,
  FileText,
  LifeBuoy,
  Lightbulb,
  Mail,
  Newspaper,
  Scale,
} from 'lucide-react';
import ui from '../styles/EmployerShared.module.scss';
import styles from '../styles/EmployerResources.module.scss';
import { EmployerPageHeader } from '../components/EmployerPageHeader';
import { EmployerModal } from '../components/shared/EmployerModal';
import { useEmployerPermissions } from '../hooks/useEmployerPermissions';
import { HIRING_GUIDES, JOB_TEMPLATES, RECRUITMENT_TIPS, type ResourceArticle } from '../data/employerResources';
import { EMPLOYER_BASE_PATH, JOB_TYPE_LABELS } from '../utils/employerConstants';

const SUPPORT_EMAIL = 'support@fockis.com';

const GUIDE_ICONS: Record<string, typeof BookOpen> = {
  'hiring-guide': BookOpen,
  'interview-toolkit': ClipboardList,
  compliance: Scale,
};

export function EmployerResourcesPage() {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const { isOwner } = useEmployerPermissions();
  const [article, setArticle] = useState<ResourceArticle | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);

  return (
    <div className={ui.page}>
      <EmployerPageHeader title="Employer Resources" description="Guides, templates, and tools to help you hire better." />

      <div role="region" className={styles.grid} aria-label="Resources">
        {HIRING_GUIDES.map((guide) => {
          const Icon = GUIDE_ICONS[guide.id] ?? BookOpen;
          return (
            <div key={guide.id} className={styles.resource}>
              <span className={styles.icon}><Icon size={22} /></span>
              <h2>{guide.title}</h2>
              <p>{guide.summary}</p>
              <button type="button" className={`${ui.btnSecondary} ${ui.btnSm}`} onClick={() => setArticle(guide)}>
                {guide.id === 'interview-toolkit' ? 'Open Toolkit' : guide.id === 'compliance' ? 'Learn More' : 'View Guide'}
              </button>
            </div>
          );
        })}

        <div className={styles.resource}>
          <span className={styles.icon}><FileText size={22} /></span>
          <h2>Job Description Templates</h2>
          <p>Ready-to-use templates for common roles.</p>
          <button type="button" className={`${ui.btnSecondary} ${ui.btnSm}`} onClick={() => setTemplatesOpen(true)}>Browse Templates</button>
        </div>

        <div className={styles.resource}>
          <span className={styles.icon}><Newspaper size={22} /></span>
          <h2>Employer Articles</h2>
          <p>Trends, insights, and hiring strategies.</p>
          <button type="button" className={`${ui.btnSecondary} ${ui.btnSm}`} onClick={() => setArticle(RECRUITMENT_TIPS)}>Read Articles</button>
        </div>

        <div className={styles.resource} id="support">
          <span className={styles.icon}><LifeBuoy size={22} /></span>
          <h2>Support</h2>
          <p>Get help from the Fockis Employer team.</p>
          <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Employer Center support')}`} className={`${ui.btnSecondary} ${ui.btnSm}`}>
            <Mail size={14} /> Contact Support
          </a>
        </div>
      </div>

      <div className={ui.split}>
        <div className={ui.card}>
          <div className={ui.cardHeader}>
            <div>
              <h2><Lightbulb size={17} style={{ verticalAlign: -3 }} /> Recruitment tips</h2>
              <p>{RECRUITMENT_TIPS.summary}</p>
            </div>
          </div>
          {RECRUITMENT_TIPS.sections.map((section) => (
            <div key={section.heading} style={{ marginBottom: 14 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 14 }}>{section.heading}</h3>
              <ul className={styles.points}>{section.points.map((point) => <li key={point}>{point}</li>)}</ul>
            </div>
          ))}
        </div>

        <div className={ui.card}>
          <h2 className={ui.sectionTitle}>Support center</h2>
          <ul className={ui.list}>
            <li>
              <Mail size={16} color="#1677e8" />
              <span style={{ flex: 1, fontSize: 14 }}>Email the Employer team<span className={ui.cellSub}>{SUPPORT_EMAIL}</span></span>
              <a href={`mailto:${SUPPORT_EMAIL}`} className={ui.linkBtn}>Email</a>
            </li>
            <li>
              <BookOpen size={16} color="#1677e8" />
              <span style={{ flex: 1, fontSize: 14 }}>Job seeker resources<span className={ui.cellSub}>See what candidates read on Fockis Careers</span></span>
              <Link to="/careers/resources" className={ui.linkBtn}>Open <ExternalLink size={12} /></Link>
            </li>
            <li>
              <Scale size={16} color="#1677e8" />
              <span style={{ flex: 1, fontSize: 14 }}>Listing rules<span className={ui.cellSub}>What is allowed on Fockis Careers</span></span>
              <button type="button" className={ui.linkBtn} onClick={() => setArticle(HIRING_GUIDES[2])}>Read</button>
            </li>
          </ul>
        </div>
      </div>

      <EmployerModal open={Boolean(article)} onClose={() => setArticle(null)} title={article?.title ?? ''} description={article?.summary} wide>
        {article?.sections.map((section) => (
          <div key={section.heading} style={{ marginBottom: 18 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>{section.heading}</h3>
            <ul className={styles.points}>{section.points.map((point) => <li key={point}>{point}</li>)}</ul>
          </div>
        ))}
      </EmployerModal>

      <EmployerModal open={templatesOpen} onClose={() => setTemplatesOpen(false)} title="Job description templates" description="Start a new listing from a template and edit it to fit your role." wide>
        <div style={{ display: 'grid', gap: 12 }}>
          {JOB_TEMPLATES.map((template) => (
            <div key={template.id} className={styles.template}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3>{template.title}</h3>
                <p>{JOB_TYPE_LABELS[template.type]} · {template.summary}</p>
                <div className={ui.chips} style={{ marginTop: 8 }}>{template.skills.slice(0, 5).map((s) => <span key={s} className={ui.tag}>{s}</span>)}</div>
              </div>
              {isOwner ? (
                <button
                  type="button"
                  className={`${ui.btnPrimary} ${ui.btnSm}`}
                  onClick={() => navigate(`${EMPLOYER_BASE_PATH}/jobs/new`, { state: { templateId: template.id } })}
                >
                  Use template
                </button>
              ) : (
                <button type="button" className={`${ui.btnSecondary} ${ui.btnSm}`} onClick={() => void navigator.clipboard?.writeText(template.description)}>
                  Copy text
                </button>
              )}
            </div>
          ))}
        </div>
      </EmployerModal>
    </div>
  );
}

export default EmployerResourcesPage;
