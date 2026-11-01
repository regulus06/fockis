import { employerApi } from '../services/employerApi';
import { useEmployerQuery } from './useEmployerQuery';

export const useEmployerBilling = () => useEmployerQuery(() => employerApi.billing(), []);

export default useEmployerBilling;
