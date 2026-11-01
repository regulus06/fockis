import { employerApi } from '../services/employerApi';
import { useEmployerQuery } from './useEmployerQuery';

export const useEmployerAnalytics = (from: string, to: string) =>
  useEmployerQuery(() => employerApi.analytics({ from, to }), [from, to]);

export default useEmployerAnalytics;
