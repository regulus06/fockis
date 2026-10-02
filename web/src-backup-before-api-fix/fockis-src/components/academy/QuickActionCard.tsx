import { Link } from 'react-router-dom';
import { QuickActionIcon } from './icons';

export default function QuickActionCard({
  title,
  sub,
  href,
  icon,
}: {
  title: string;
  sub: string;
  href: string;
  icon: 'doc' | 'pin' | 'book' | 'coin' | 'grid' | 'mail';
}) {
  return (
    <Link className="qa-card" to={href}>
      <QuickActionIcon icon={icon} />
      <strong>{title}</strong>
      <small>{sub}</small>
    </Link>
  );
}
