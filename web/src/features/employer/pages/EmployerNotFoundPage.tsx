import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import ui from '../styles/EmployerShared.module.scss';
import { EmployerEmptyState } from '../components/shared/EmployerEmptyState';
import { EMPLOYER_BASE_PATH } from '../utils/employerConstants';

export function EmployerNotFoundPage() {
  return (
    <div className={ui.card}>
      <EmployerEmptyState
        icon={<Compass size={24} />}
        title="Page not found"
        description="This Employer Center page doesn't exist or has moved."
        action={<Link to={EMPLOYER_BASE_PATH} className={ui.btnPrimary}>Go to dashboard</Link>}
      />
    </div>
  );
}

export default EmployerNotFoundPage;
