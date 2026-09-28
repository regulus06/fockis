import { useAcademyToast } from '../../lib/academyToastStore';

export default function AcademyToast() {
  const { message, visible } = useAcademyToast();
  return (
    <div className={`toast${visible ? ' show' : ''}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}
