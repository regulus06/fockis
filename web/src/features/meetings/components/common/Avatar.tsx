import '../../styles/components/common.scss';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  imageUrl?: string;
}

const COLORS = ['#4b56e8', '#1fc0a6', '#e0a13c', '#e5484d', '#8a5cf6', '#2e9be6'];

function colorFor(name: string) {
  const idx = name.charCodeAt(0) % COLORS.length;
  return COLORS[idx];
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.slice(0, 2) ?? '?';
}

export function Avatar({ name, size = 'md', imageUrl }: AvatarProps) {
  if (imageUrl) {
    return <img className={`fm-avatar fm-avatar--${size}`} src={imageUrl} alt={name} />;
  }
  return (
    <span
      className={`fm-avatar fm-avatar--${size} fm-avatar--initials`}
      style={{ background: colorFor(name) }}
      aria-label={name}
    >
      {initialsFor(name).toUpperCase()}
    </span>
  );
}
