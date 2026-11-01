import { employerApi } from '../services/employerApi';
import { useEmployerQuery } from './useEmployerQuery';

export const useEmployerInterviews = (view = 'upcoming') =>
  useEmployerQuery(() => employerApi.listInterviews(view), [view]);

export default useEmployerInterviews;
