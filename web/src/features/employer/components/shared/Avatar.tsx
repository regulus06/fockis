import { useState } from 'react';
import ui from '../../styles/EmployerShared.module.scss';
import { initials } from '../../utils/employerFormatters';

export function Avatar({ name, src, size = 34 }: { name: string; src?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={ui.avatar} style={{ width: size, height: size, fontSize: Math.max(11, size * 0.36) }} aria-hidden="true">
      {src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} /> : initials(name)}
    </span>
  );
}

export default Avatar;
