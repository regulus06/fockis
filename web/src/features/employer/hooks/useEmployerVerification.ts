import { employerApi } from '../services/employerApi';
import { useEmployerQuery } from './useEmployerQuery';

export const useEmployerVerification = () => useEmployerQuery(() => employerApi.getVerification(), []);

export default useEmployerVerification;
