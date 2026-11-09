import type { EmployerRole } from './Employer';
export interface EmployerTeamMember {
  id: string;
  name: string;
  email: string;
  role: EmployerRole;
  status: 'invited' | 'active' | 'suspended';
}
