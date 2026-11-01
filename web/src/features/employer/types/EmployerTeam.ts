import type { EmployerRole } from './Employer';

export type EmployerTeamRole = Exclude<EmployerRole, 'owner'>;

export interface EmployerTeamMember {
  id: string;
  email: string;
  name: string | null;
  role: EmployerTeamRole;
  status: 'invited' | 'active';
  invitedAt: string;
  joinedAt: string | null;
  isYou: boolean;
}

export interface EmployerTeam {
  owner: { userId: string; isYou: boolean };
  yourRole: EmployerRole;
  members: EmployerTeamMember[];
}
