import type { CSSProperties } from 'react';

interface IconProps {
  id: string;
  className?: string;
  style?: CSSProperties;
}

export default function Icon({ id, className = 'icon', style }: IconProps) {
  return (
    <svg className={className} style={style} aria-hidden="true">
      <use href={`#${id}`} />
    </svg>
  );
}
