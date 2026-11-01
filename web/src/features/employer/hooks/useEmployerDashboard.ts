import { employerApi } from '../services/employerApi';
import { useEmployerQuery } from './useEmployerQuery';

export const useEmployerDashboard = (days = 30) =>
  useEmployerQuery(() => employerApi.dashboard(days), [days]);

export default useEmployerDashboard;
