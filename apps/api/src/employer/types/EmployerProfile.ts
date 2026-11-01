import type { EmployerProfile } from './Employer';
export type { EmployerProfile };
export type EmployerProfileInput = Pick<EmployerProfile, 'companyName' | 'country' | 'city'> &
  Partial<Pick<EmployerProfile, 'description' | 'website' | 'industry' | 'companySize' | 'logoUrl' | 'coverImageUrl' | 'stateProvince'>>;
