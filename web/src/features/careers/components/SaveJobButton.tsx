import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ui from '../../employer/styles/EmployerShared.module.scss';
import styles from '../styles/JobCard.module.scss';
import { useSavedJobs } from '../hooks/useSavedJobs';
import { useCareerUser } from '../hooks/useCareerUser';
import { useNotify } from '../../employer/store/employerNotificationStore';
import { getErrorMessage } from '../../employer/hooks/useEmployerQuery';

/** Bookmark toggle (POST/DELETE /careers/saved-jobs/:jobId). */
export function SaveJobButton({ jobId, title, variant = 'icon' }: { jobId: string; title: string; variant?: 'icon' | 'button' }) {
  const navigate = useNavigate();
  const notify = useNotify();
  const user = useCareerUser((state) => state.user);
  const saved = useSavedJobs((state) => state.savedJobIds.has(jobId));
  const toggleSave = useSavedJobs((state) => state.toggleSave);

  const toggle = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }
    try {
      const now = await toggleSave(jobId);
      notify(now ? `Saved "${title}".` : `Removed "${title}" from saved jobs.`);
    } catch (error) {
      notify(getErrorMessage(error, 'Could not update saved jobs.'), 'error');
    }
  };

  if (variant === 'button') {
    return (
      <button type="button" className={ui.btnSecondary} onClick={toggle} aria-pressed={saved}>
        {saved ? <BookmarkCheck size={16} color="#1677e8" /> : <Bookmark size={16} />} {saved ? 'Saved' : 'Save Job'}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`${ui.iconBtn} ${styles.save} ${saved ? styles.saved : ''}`}
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? `Unsave ${title}` : `Save ${title}`}
      title={saved ? 'Saved' : 'Save job'}
    >
      {saved ? <BookmarkCheck size={19} /> : <Bookmark size={19} />}
    </button>
  );
}

export default SaveJobButton;
