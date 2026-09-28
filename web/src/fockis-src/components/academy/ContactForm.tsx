import { FormEvent, useState } from 'react';
import { ContactFormValues } from '../../types/academy';
import { submitContactForm } from '../../lib/academyApi';
import { useAcademyToast } from '../../lib/academyToastStore';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-()\s]{7,}$/;

const EMPTY: ContactFormValues = { name: '', email: '', phone: '', subject: 'General Inquiry', message: '' };

export default function ContactForm() {
  const [values, setValues] = useState<ContactFormValues>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormValues, boolean>>>({});
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const showToast = useAcademyToast((s) => s.showToast);

  function update<K extends keyof ContactFormValues>(key: K, value: ContactFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof ContactFormValues, boolean>> = {
      name: values.name.trim().length === 0,
      email: !EMAIL_RE.test(values.email.trim()),
      phone: !PHONE_RE.test(values.phone.trim()),
      message: values.message.trim().length === 0,
    };
    setErrors(next);
    return !Object.values(next).some(Boolean);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await submitContactForm(values);
      setSuccess(true);
      setValues(EMPTY);
      setErrors({});
      showToast('Message sent to Admissions.');
    } catch (err) {
      console.error('Failed to submit contact form', err);
      showToast('Something went wrong sending your message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className={`form-success${success ? ' show' : ''}`}>
        Thanks — your message has been sent. Admissions will follow up shortly.
      </div>
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <div className={`field${errors.name ? ' invalid' : ''}`}>
            <label>Name</label>
            <input type="text" value={values.name} onChange={(e) => update('name', e.target.value)} />
            <span className="error-msg">Please enter your name.</span>
          </div>
          <div className={`field${errors.email ? ' invalid' : ''}`}>
            <label>Email</label>
            <input type="email" value={values.email} onChange={(e) => update('email', e.target.value)} />
            <span className="error-msg">Please enter a valid email.</span>
          </div>
          <div className={`field${errors.phone ? ' invalid' : ''}`}>
            <label>Phone</label>
            <input type="tel" value={values.phone} onChange={(e) => update('phone', e.target.value)} />
            <span className="error-msg">Please enter a valid phone number.</span>
          </div>
          <div className="field">
            <label>Subject</label>
            <select value={values.subject} onChange={(e) => update('subject', e.target.value)}>
              <option>General Inquiry</option>
              <option>Admissions</option>
              <option>Financial Aid</option>
              <option>Career Center</option>
            </select>
          </div>
          <div className={`field full${errors.message ? ' invalid' : ''}`}>
            <label>Message</label>
            <textarea rows={5} value={values.message} onChange={(e) => update('message', e.target.value)} />
            <span className="error-msg">Please enter a message.</span>
          </div>
        </div>
        <button className="btn btn-gold" style={{ marginTop: 20 }} type="submit" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send Message'}
        </button>
      </form>
    </>
  );
}
