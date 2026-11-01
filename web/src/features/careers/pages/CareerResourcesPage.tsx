import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Award, BookOpen, Compass, FileText, GraduationCap, MessagesSquare, Search, type LucideIcon } from 'lucide-react';
import ui from '../../employer/styles/EmployerShared.module.scss';
import styles from '../styles/SeekerPages.module.scss';
import { CAREER_RESOURCES } from '../data/careerResources';
import type { CareerResource } from '../types';

const ICONS: Record<CareerResource['category'], LucideIcon> = {
  resume: FileText,
  interview: MessagesSquare,
  advice: Compass,
  certifications: Award,
  search: Search,
};

/** What each guide links to inside Fockis, so every resource ends in an action. */
const NEXT_STEP: Record<CareerResource['category'], { to: string; label: string }> = {
  resume: { to: '/careers/resume', label: 'Upload or update your resume' },
  interview: { to: '/careers/applications?status=interview', label: 'See your interviews' },
  advice: { to: '/careers/profile', label: 'Update your career profile' },
  certifications: { to: '/careers/profile', label: 'Add certifications to your profile' },
  search: { to: '/careers/alerts', label: 'Set up a job alert' },
};

export function CareerResourcesPage() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'start' });
  }, [hash]);

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h1>Career Resources</h1>
          <p>Practical guides to help you land your next role.</p>
        </div>
      </div>

      <nav className={styles.resourceNav} aria-label="Guides">
        {CAREER_RESOURCES.map((r) => (
          <a key={r.id} href={`#${r.id}`} className={ui.filterChip}>{r.title}</a>
        ))}
        <Link to="/careers/internships" className={ui.filterChip}><GraduationCap size={14} /> Internships</Link>
        <Link to="/careers/co-ops" className={ui.filterChip}><BookOpen size={14} /> Co-ops</Link>
      </nav>

      {CAREER_RESOURCES.map((resource) => {
        const Icon = ICONS[resource.category];
        const next = NEXT_STEP[resource.category];
        return (
          <div key={resource.id} id={resource.id} className={`${ui.card} ${styles.resourceSection}`}>
            <div className={styles.resourceHead}>
              <span className={ui.statIcon}><Icon size={18} /></span>
              <div>
                <h2>{resource.title}</h2>
                <p className={ui.muted} style={{ margin: 0 }}>{resource.summary}</p>
              </div>
            </div>
            {resource.sections.map((section) => (
              <div key={section.heading}>
                <h3>{section.heading}</h3>
                <ul>
                  {section.points.map((point) => <li key={point}>{point}</li>)}
                </ul>
              </div>
            ))}
            <Link to={next.to} className={ui.btnSecondary} style={{ marginTop: 16 }}>{next.label}</Link>
          </div>
        );
      })}
    </div>
  );
}

export default CareerResourcesPage;
