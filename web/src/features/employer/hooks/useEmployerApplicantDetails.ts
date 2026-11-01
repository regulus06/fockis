import { employerApi } from '../services/employerApi';
import { useEmployerQuery } from './useEmployerQuery';

export const useEmployerApplicantDetails = (applicationId?: string) =>
  useEmployerQuery(() => employerApi.getApplicant(applicationId ?? ''), [applicationId], {
    enabled: Boolean(applicationId),
  });

export default useEmployerApplicantDetails;
