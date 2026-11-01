import { employerApi } from '../services/employerApi';
import { useEmployerQuery } from './useEmployerQuery';

export const useEmployerTeam = () => useEmployerQuery(() => employerApi.getTeam(), []);

export default useEmployerTeam;
