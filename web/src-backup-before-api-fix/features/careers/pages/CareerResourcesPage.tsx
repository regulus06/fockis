import { ResourceCard } from '../components';
import type { CareerResource } from '../types';
import styles from '../styles/CareerResourcesPage.module.scss';

const RESOURCES: CareerResource[] = [
  { id: 'resume-builder', icon: '📄', title: 'Resume Builder', description: 'Build an ATS-friendly resume in minutes.', href: '/careers/resources/resume-builder' },
  { id: 'resume-tips', icon: '✎', title: 'Resume Tips', description: 'What recruiters actually look for first.', href: '/careers/resources/resume-tips' },
  { id: 'interview-prep', icon: '🎤', title: 'Interview Preparation', description: 'Practice with real behavioral prompts.', href: '/careers/resources/interview-prep' },
  { id: 'cover-letter', icon: '✉', title: 'Cover Letter Builder', description: 'Generate a tailored letter per role.', href: '/careers/resources/cover-letter' },
  { id: 'career-advice', icon: '🧭', title: 'Career Advice', description: 'Guidance from Fockis mentors and alumni.', href: '/careers/resources/career-advice' },
  { id: 'salary-guide', icon: '💰', title: 'Salary Guide', description: 'Benchmark offers by role and city.', href: '/careers/resources/salary-guide' },
  { id: 'internship-guide', icon: '🎓', title: 'Internship Guide', description: 'Everything to land your first internship.', href: '/careers/resources/internship-guide' },
  { id: 'coop-guide', icon: '🔁', title: 'Co-op Guide', description: 'How co-op terms and credit typically work.', href: '/careers/resources/coop-guide' },
  { id: 'cybersecurity-careers', icon: '🛡', title: 'Cybersecurity Careers', description: 'Entry paths into security roles.', href: '/careers/resources/cybersecurity-careers' },
  { id: 'it-careers', icon: '💻', title: 'IT Careers', description: 'Roles, certs, and growth paths in IT.', href: '/careers/resources/it-careers' },
  { id: 'student-guide', icon: '🧑‍🎓', title: 'Student Career Guide', description: 'A full roadmap from freshman to offer.', href: '/careers/resources/student-guide' },
];

export function CareerResourcesPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Career resources</h1>
        <p>Guides and tools to help you apply with confidence.</p>
      </div>
      <div className={styles.grid}>
        {RESOURCES.map((r) => (
          <ResourceCard key={r.id} resource={r} onOpen={(res) => { window.location.href = res.href; }} />
        ))}
      </div>
    </div>
  );
}
