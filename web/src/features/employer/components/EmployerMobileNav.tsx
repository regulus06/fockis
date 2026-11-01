import layout from '../styles/EmployerLayout.module.scss';

/** Backdrop shown behind the slide-in sidebar on tablet and phone. */
export function EmployerMobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <button type="button" className={layout.scrim} aria-label="Close menu" onClick={onClose} />;
}

export default EmployerMobileNav;
