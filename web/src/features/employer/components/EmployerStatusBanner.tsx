import { Link } from 'react-router-dom';
import { Ban, CheckCircle2, Clock, Info, XCircle } from 'lucide-react';
import ui from '../styles/EmployerShared.module.scss';
import type { EmployerMe } from '../types';

/**
 * Where the employer stands with Fockis. Jobs appear on Careers only after
 * Fockis approves the employer (Admin Center → Careers → Employers).
 */
export function EmployerStatusBanner({ me }: { me: EmployerMe }) {
  const c = me.company;
  if (c?.blocked) {
    return (
      <p className={ui.noticeError} role="status" style={{ margin: '0 0 16px' }}>
        <Ban size={16} />
        <span>
          <strong>Your employer account is blocked by Fockis.</strong> Your jobs are hidden from Careers and you can&apos;t post new ones.
          {c.blockedReason ? ` Reason: ${c.blockedReason}` : ''} Contact support@fockis.com.
        </span>
      </p>
    );
  }
  const status = c?.verificationStatus ?? 'not_submitted';
  if (status === 'approved') return null;
  if (status === 'pending') {
    return (
      <p className={ui.noticeWarning} role="status" style={{ margin: '0 0 16px' }}>
        <Clock size={16} />
        <span>
          <strong>Fockis is reviewing your employer form.</strong> You can post jobs now — they appear on Careers as soon as you&apos;re approved.
        </span>
      </p>
    );
  }
  if (status === 'rejected') {
    return (
      <p className={ui.noticeError} role="status" style={{ margin: '0 0 16px' }}>
        <XCircle size={16} />
        <span>
          <strong>Fockis didn&apos;t approve your employer form.</strong>
          {c?.reviewerNote ? ` Reason: ${c.reviewerNote}.` : ''} Your jobs stay hidden. <Link to="/careers/employer/verification">Fix and send it again</Link>.
        </span>
      </p>
    );
  }
  if (!me.isOwner) return null;
  return (
    <p className={ui.notice} role="status" style={{ margin: '0 0 16px' }}>
      <Info size={16} />
      <span>
        <strong>Become an approved employer.</strong> Send the employer form so Fockis can approve you — your jobs appear on Careers once you&apos;re approved.{' '}
        <Link to="/careers/employer/verification">Open the form</Link>
      </span>
    </p>
  );
}

/** Small "approved" marker some pages may show. */
export function EmployerApprovedMark() {
  return (
    <span className={ui.badgeSuccess}>
      <CheckCircle2 size={13} /> Approved by Fockis
    </span>
  );
}

export default EmployerStatusBanner;
