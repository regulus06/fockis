import { employerApi } from '../services/employerApi';
import { useEmployerQuery } from './useEmployerQuery';

export const useEmployerProfile = () => useEmployerQuery(() => employerApi.getProfile(), []);

export default useEmployerProfile;
