import { EmployerPageHeader } from '../components/EmployerPageHeader';
import styles from '../styles/EmployerCenter.module.scss';

export function EmployerJobDetailsPage() {
  return (
    <main className={styles.page}>
      <EmployerPageHeader title="Job details" description="Manage your organization and hiring activity in Fockis Careers." />
      <section className={styles.content}>
        <p>This page scaffold is ready for its secured API integration.</p>
      </section>
    </main>
  );
}
