import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAcademyAdminAuth } from '../../../lib/academyAdminAuth';
import AcademyToast from '../../../components/academy/AcademyToast';
import '../../../styles/academy.scss';
import '../../../styles/academy-admin.scss';

export default function AcademyAdminLogin() {
  const { user, status, login } = useAcademyAdminAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated' && user) {
    return <Navigate to={location.state?.from ?? '/academy/admin'} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(location.state?.from ?? '/academy/admin', { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Sign in failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="academy">
      <div className="admin-login-shell">
        <div className="admin-login-card">
          <div className="logo-mark">
            <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
              <path d="M4 8L12 4L20 8L12 12L4 8Z" stroke="#E3A542" strokeWidth={1.6} strokeLinejoin="round" />
              <path d="M7 10.5V16C7 16 9 18 12 18C15 18 17 16 17 16V10.5" stroke="#E3A542" strokeWidth={1.6} />
            </svg>
          </div>
          <h2 style={{ marginBottom: 6 }}>Academy Admin</h2>
          <p style={{ fontSize: 13.5, marginBottom: 22 }}>Sign in to manage Fockis Academy content.</p>

          {error && <div className="admin-login-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            <div className="field" style={{ marginBottom: 20 }}>
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button className="btn btn-gold" style={{ width: '100%' }} type="submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
      <AcademyToast />
    </div>
  );
}
