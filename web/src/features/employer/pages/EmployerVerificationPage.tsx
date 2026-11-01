import { useEffect, useState, type FormEvent } from 'react';
import { BadgeCheck, CircleCheck, Clock, FileUp, Info, ShieldCheck, Trash2, TriangleAlert } from 'lucide-react';
import ui from '../styles/EmployerShared.module.scss';
import formStyles from '../styles/EmployerJobForm.module.scss';
import { EmployerPageHeader } from '../components/EmployerPageHeader';
import { EmployerLoading } from '../components/shared/EmployerLoading';
import { EmployerError } from '../components/shared/EmployerError';
import { FormField } from '../components/shared/FormField';
import { ImageUpload } from '../components/shared/ImageUpload';
import { Badge } from '../components/shared/EmployerStatusBadge';
import { useEmployerVerification } from '../hooks/useEmployerVerification';
import { useEmployerPermissions } from '../hooks/useEmployerPermissions';
import { getErrorMessage } from '../hooks/useEmployerQuery';
import { useEmployerStore } from '../store/employerStore';
import { useNotify } from '../store/employerNotificationStore';
import { employerApi } from '../services/employerApi';
import type { EmployerVerificationDocument, EmployerVerificationStatus } from '../types';
import { formatEmployerDate, formatEmployerDateTime } from '../utils/employerFormatters';
import { isValidEmail, isValidHttpUrl, type FieldErrors } from '../utils/employerValidators';

const STATUS: Record<EmployerVerificationStatus, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral'; text: string }> = {
  not_submitted: { label: 'Not submitted', tone: 'neutral', text: 'Submit your business details to earn the verified badge.' },
  pending: { label: 'Under review', tone: 'warning', text: 'The Fockis team is reviewing your documents. You will see the result here.' },
  approved: { label: 'Verified', tone: 'success', text: 'Your company is verified. The badge appears on your profile and jobs.' },
  rejected: { label: 'Not approved', tone: 'danger', text: 'Your last request was not approved. Review the note below and resubmit.' },
};

const PROGRESS = ['Submit details', 'Under review', 'Verified'];

export function EmployerVerificationPage() {
  const notify = useNotify();
  const reloadMe = useEmployerStore((state) => state.load);
  const { can } = useEmployerPermissions();
  const { data, setData, loading, error, refetch } = useEmployerVerification();

  const [legalName, setLegalName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [documents, setDocuments] = useState<EmployerVerificationDocument[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!data) return;
    const v = data.verification;
    setLegalName(v.legalName ?? data.companyName ?? '');
    setBusinessEmail(v.businessEmail ?? '');
    setWebsite(v.website ?? data.website ?? '');
    setRegistrationNumber(v.registrationNumber ?? '');
    setDocuments(v.status === 'rejected' ? v.documents ?? [] : []);
  }, [data]);

  if (loading && !data) return <div className={ui.card}><EmployerLoading label="Loading verification…" /></div>;
  if (error && !data) return <div className={ui.card}><EmployerError message={error} onRetry={refetch} /></div>;
  if (!data) return null;

  const status = data.verification.status;
  const meta = STATUS[status];
  const canSubmit = can('manageCompany') && (status === 'not_submitted' || status === 'rejected');
  const progressIndex = status === 'approved' ? 2 : status === 'pending' ? 1 : 0;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found: FieldErrors = {};
    if (legalName.trim().length < 2) found.legalName = 'Enter the registered legal name.';
    if (!isValidEmail(businessEmail)) found.businessEmail = 'Enter a valid business email.';
    if (!isValidHttpUrl(website)) found.website = 'Enter a full URL starting with https://';
    if (!documents.length) found.documents = 'Upload at least one business document.';
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    setSubmitting(true);
    setServerError(null);
    try {
      const updated = await employerApi.submitVerification({
        legalName: legalName.trim(),
        businessEmail: businessEmail.trim(),
        website: website.trim(),
        registrationNumber: registrationNumber.trim() || undefined,
        documents,
      });
      setData(updated);
      notify('Verification submitted. We will review it shortly.');
      void reloadMe();
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={ui.page}>
      <EmployerPageHeader
        title="Company Verification"
        description="Verify your business to build trust with candidates."
        back={{ to: '/careers/employer/profile?tab=verification', label: 'Company profile' }}
      />

      <div className={ui.card}>
        <div className={ui.row} style={{ marginBottom: 18 }}>
          {status === 'approved' ? <BadgeCheck size={22} color="#15803d" /> : status === 'rejected' ? <TriangleAlert size={22} color="#b91c1c" /> : status === 'pending' ? <Clock size={22} color="#b45309" /> : <ShieldCheck size={22} color="#1677e8" />}
          <h2 style={{ margin: 0, fontSize: 17 }}>Verification status</h2>
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </div>
        <ol className={formStyles.stepper} aria-label="Verification progress" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          {PROGRESS.map((label, index) => (
            <li key={label} className={index < progressIndex ? formStyles.stepDone : index === progressIndex ? formStyles.stepCurrent : formStyles.step}>
              <button type="button" disabled aria-current={index === progressIndex ? 'step' : undefined}>
                {index < progressIndex ? <CircleCheck size={16} /> : index + 1}
              </button>
              {label}
            </li>
          ))}
        </ol>
        <p style={{ margin: 0, color: '#4a5272', fontSize: 14 }}>{meta.text}</p>
        {status === 'rejected' && data.verification.reviewerNote && (
          <p className={ui.noticeError} style={{ marginTop: 12 }}><Info size={16} /> {data.verification.reviewerNote}</p>
        )}
        {data.verification.submittedAt && (
          <p className={ui.muted} style={{ margin: '10px 0 0', fontSize: 12.5 }}>Last submitted {formatEmployerDate(data.verification.submittedAt)}</p>
        )}
      </div>

      <div className={ui.split}>
        {canSubmit ? (
          <form className={ui.card} onSubmit={submit} noValidate>
            <h2 className={ui.sectionTitle}>Business details</h2>
            <div className={ui.formGrid}>
              <FormField label="Company legal name" required error={errors.legalName}>
                <input className={ui.input} value={legalName} maxLength={200} onChange={(e) => setLegalName(e.target.value)} />
              </FormField>
              <FormField label="Business email" required error={errors.businessEmail} hint="Use an address on your company domain.">
                <input className={ui.input} type="email" value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} placeholder="hr@yourcompany.com" />
              </FormField>
              <FormField label="Company website" required error={errors.website}>
                <input className={ui.input} type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://www.yourcompany.com" />
              </FormField>
              <FormField label="Registration / tax number" hint="Optional (EIN, business number, etc.)">
                <input className={ui.input} value={registrationNumber} maxLength={100} onChange={(e) => setRegistrationNumber(e.target.value)} />
              </FormField>
            </div>

            <h2 className={ui.sectionTitle} style={{ marginTop: 22 }}>Business documents</h2>
            <p className={ui.hint} style={{ margin: '0 0 10px' }}>
              Upload a clear photo or scan (JPG, PNG or WEBP) of a business registration, license or tax document. Up to 10 files.
            </p>
            <ul className={ui.list} style={{ marginBottom: 10 }}>
              {documents.map((doc) => (
                <li key={doc.url}>
                  <FileUp size={16} color="#1677e8" />
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontSize: 13.5, overflowWrap: 'anywhere' }}>{doc.name}</a>
                  <button type="button" className={ui.iconBtn} aria-label={`Remove ${doc.name}`} onClick={() => setDocuments(documents.filter((d) => d.url !== doc.url))}>
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
            {documents.length < 10 && (
              <ImageUpload
                label="Upload business document"
                className={`${ui.btnSecondary} ${ui.btnSm}`}
                onUploaded={(url, file) => {
                  setDocuments((current) => [...current, { name: file.name, url }]);
                  setErrors((current) => ({ ...current, documents: undefined }));
                }}
                onError={(message) => notify(message, 'error')}
              >
                {({ uploading }) => <><FileUp size={14} /> {uploading ? 'Uploading…' : 'Upload document'}</>}
              </ImageUpload>
            )}
            {errors.documents && <p className={ui.fieldError} style={{ margin: '8px 0 0' }}>{errors.documents}</p>}
            <p className={ui.notice} style={{ marginTop: 14 }}>
              <Info size={16} /> Uploaded files are stored with your existing Fockis media storage. PDF upload isn't supported by the current upload service, so please photograph or export PDFs as images.
            </p>

            {serverError && <p className={ui.noticeError} role="alert" style={{ marginTop: 12 }}>{serverError}</p>}

            <div className={ui.formActions}>
              <button type="submit" className={ui.btnPrimary} disabled={submitting}>
                <ShieldCheck size={15} /> {submitting ? 'Submitting…' : 'Submit for verification'}
              </button>
            </div>
          </form>
        ) : (
          <div className={ui.card}>
            <h2 className={ui.sectionTitle}>Submitted details</h2>
            {status === 'not_submitted' ? (
              <p className={ui.muted} style={{ margin: 0, fontSize: 13.5 }}>Only the owner or an administrator can submit verification.</p>
            ) : (
              <dl className={ui.dl}>
                <div><dt>Legal name</dt><dd>{data.verification.legalName}</dd></div>
                <div><dt>Business email</dt><dd>{data.verification.businessEmail}</dd></div>
                <div><dt>Website</dt><dd>{data.verification.website}</dd></div>
                {data.verification.registrationNumber && <div><dt>Registration number</dt><dd>{data.verification.registrationNumber}</dd></div>}
                <div>
                  <dt>Documents</dt>
                  <dd>
                    {data.verification.documents.map((doc) => (
                      <a key={doc.url} href={doc.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>{doc.name}</a>
                    ))}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        )}

        <div className={ui.card}>
          <h2 className={ui.sectionTitle}>Verification history</h2>
          {data.history.length ? (
            <ul className={ui.list}>
              {data.history.map((entry, index) => (
                <li key={`${entry.at}-${index}`} style={{ alignItems: 'flex-start' }}>
                  <Badge tone={STATUS[entry.status as EmployerVerificationStatus]?.tone ?? 'neutral'}>
                    {STATUS[entry.status as EmployerVerificationStatus]?.label ?? entry.status}
                  </Badge>
                  <span style={{ flex: 1, fontSize: 13.5 }}>
                    {entry.note || '—'}
                    <span className={ui.cellSub}>{formatEmployerDateTime(entry.at)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={ui.muted} style={{ margin: 0, fontSize: 13.5 }}>No verification requests yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default EmployerVerificationPage;
