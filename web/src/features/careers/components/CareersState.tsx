import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import ui from '../../employer/styles/EmployerShared.module.scss';
import { EmployerError } from '../../employer/components/shared/EmployerError';
import { EmployerLoading } from '../../employer/components/shared/EmployerLoading';
import { hasCareerToken, useCareerUser } from '../hooks/useCareerUser';
import type { FockisUser } from '../types';

const UNAUTHORIZED = /unauthor|401|log ?in|sign ?in|authenticat/i;

/** Error state that offers sign-in when the API says the session is missing. */
export function CareersError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  if (UNAUTHORIZED.test(message)) {
    return (
      <div className={ui.state} role="alert">
        <span className={ui.stateIcon}><LogIn size={24} /></span>
        <h3>Sign in to continue</h3>
        <p>Sign in to your Fockis account to browse jobs, apply and track your applications.</p>
        <Link to="/login" className={ui.btnPrimary} style={{ marginTop: 8 }}>Sign in</Link>
      </div>
    );
  }
  return <EmployerError message={message} onRetry={onRetry} />;
}


/** Renders children only for a signed-in Fockis account (GET /users/me). */
export function SignedIn({ children }: { children: (user: FockisUser) => ReactNode }) {
  const { user, loading, failed, load } = useCareerUser();
  useEffect(() => {
    void load();
  }, [load]);
  if (user) return <>{children(user)}</>;
  if (loading || (!failed && hasCareerToken())) {
    return <div className={ui.card}><EmployerLoading label="Loading your account…" /></div>;
  }
  return <div className={ui.card}><CareersError message="Unauthorized" /></div>;
}

export default CareersError;
