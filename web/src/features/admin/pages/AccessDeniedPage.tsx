import { useNavigate } from 'react-router-dom';

export function AccessDeniedPage() {
  const navigate = useNavigate();
  return (
    <div className="fk-denied">
      <div className="fk-denied__code">403</div>
      <h2>Access Denied</h2>
      <p style={{ color: 'var(--fk-text-secondary)', maxWidth: '42ch' }}>
        You do not have permission to access this administration area. Switch to an
        authorized role, or contact a SUPER_ADMIN if you believe this is a mistake.
      </p>
      <button className="fk-btn fk-btn--primary" onClick={() => navigate('/admin/dashboard')}>
        Return to Dashboard
      </button>
    </div>
  );
}
