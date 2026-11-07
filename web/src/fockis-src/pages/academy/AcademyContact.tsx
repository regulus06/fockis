import { useState, type FormEvent } from 'react';
import PageHero from '../../components/academy/PageHero';
import { Icon } from '../../components/academy/market/Icon';
import { submitContactForm } from '../../lib/academyApi';
import { useAcademyToast } from '../../lib/academyToastStore';
import { useSiteInfo } from '../../lib/siteInfo';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-()\s]{7,}$/;
type Values = { name: string; email: string; phone: string; subject: string; message: string };
const EMPTY: Values = { name: '', email: '', phone: '', subject: 'General Inquiry', message: '' };


/**
 * /academy/contact — details come from Admin → Settings → Institution (useSiteInfo);
 * the form posts to POST /academy/contact (Admin → Contact Messages).
 */
export default function AcademyContact() {
  const [v, setV] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Values, boolean>>>({});
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useAcademyToast((s) => s.showToast);
  const { info } = useSiteInfo();
  const blocks = [
    { icon: 'building', title: info.name ? `${info.name} — Office` : 'Office', lines: info.address ? info.address.split(/\n/).map((l) => l.trim()).filter(Boolean) : [] },
    { icon: 'message', title: 'Phone & Email', lines: [info.phone, info.email].filter(Boolean) as string[] },
    { icon: 'clock', title: 'Office Hours', lines: info.office_hours ? [info.office_hours] : [] },
  ].filter((b) => b.lines.length);
  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next = { name: !v.name.trim(), email: !EMAIL_RE.test(v.email.trim()), phone: !!v.phone.trim() && !PHONE_RE.test(v.phone.trim()), message: !v.message.trim() };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setBusy(true);
    try {
      await submitContactForm({ ...v, phone: v.phone || undefined });
      setSent(true);
      setV(EMPTY);
      toast('Message sent to Fockis Academy.');
    } catch {
      toast('Something went wrong sending your message. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const field = (label: string, k: keyof Values, type = 'text', req = true, msg = '') => (
    <label className={`fa-field ${errors[k] ? 'is-invalid' : ''}`}>
      <span>
        {label}
        {req && <i>*</i>}
      </span>
      {type === 'area' ? <textarea rows={5} value={v[k]} onChange={set(k)} /> : <input type={type} value={v[k]} onChange={set(k)} />}
      {errors[k] && <em className="fa-field__err">{msg}</em>}
    </label>
  );

  return (
    <div className="fa-root fa-page">
      <PageHero crumb="Contact" title="Contact Fockis Academy" subtitle="Reach the admissions office, ask about courses, or get help with your account." icon="message" />
      <div className={`fa-container fa-section fa-contact${blocks.length ? '' : ' fa-contact--solo'}`}>
        {blocks.length > 0 && (
        <div className="fa-contact__info">
          {blocks.map((b, i) => (
            <div key={b.title} className="fa-card fa-feature">
              <span className={`fa-stat__ic tone-${['blue', 'green', 'amber'][i]}`}>
                <Icon name={b.icon} size={18} />
              </span>
              <b>{b.title}</b>
              <p>
                {b.lines.map((l) => (
                  <span key={l} style={{ display: 'block' }}>
                    {l.includes('@') ? <a className="fa-link" href={`mailto:${l}`}>{l}</a> : /^[+\d(][\d\s()+-]{6,}$/.test(l) ? <a className="fa-link" href={`tel:${l.replace(/[^\d+]/g, '')}`}>{l}</a> : l}
                  </span>
                ))}
              </p>
            </div>
          ))}
        </div>
        )}
        <form className="fa-card fa-pad fa-contact__form" onSubmit={submit} noValidate>
          <h3>Send us a message</h3>
          {sent && (
            <p className="fa-success" role="status">
              <Icon name="checkCircle" size={16} /> Thanks — your message has been sent. We&apos;ll follow up shortly.
            </p>
          )}
          <div className="fa-row2 fa-row2--even">
            {field('Name', 'name', 'text', true, 'Please enter your name.')}
            {field('Email', 'email', 'email', true, 'Please enter a valid email.')}
          </div>
          <div className="fa-row2 fa-row2--even">
            {field('Phone', 'phone', 'tel', false, 'Please enter a valid phone number.')}
            <label className="fa-field">
              <span>Subject</span>
              <select value={v.subject} onChange={set('subject')}>
                {['General Inquiry', 'Admissions', 'Financial Aid', 'Courses & Instructors', 'Career Center'].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
          </div>
          {field('Message', 'message', 'area', true, 'Please enter a message.')}
          <button className="fa-btn fa-btn--primary" type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Send Message'} <Icon name="send" size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
