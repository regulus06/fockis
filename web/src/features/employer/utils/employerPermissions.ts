import type { EmployerCapability, EmployerRole } from '../types/Employer';

/** Mirrors ROLE_CAPABILITIES in the backend EmployerService. UI helper only. */
const ROLE_CAPABILITIES: Record<EmployerRole, EmployerCapability[]> = {
  owner: ['read', 'manageApplicants', 'manageJobs', 'manageCompany', 'manageTeam', 'manageBilling'],
  admin: ['read', 'manageApplicants', 'manageJobs', 'manageCompany', 'manageTeam'],
  recruiter: ['read', 'manageApplicants', 'manageJobs'],
  hiring_manager: ['read', 'manageApplicants'],
};

export function canEmployer(role: EmployerRole | undefined | null, capability: EmployerCapability): boolean {
  if (!role) return false;
  return ROLE_CAPABILITIES[role]?.includes(capability) ?? false;
}

export const ROLE_LABELS: Record<EmployerRole, string> = {
  owner: 'Owner',
  admin: 'Administrator',
  recruiter: 'Recruiter',
  hiring_manager: 'Hiring Manager',
};

export const ROLE_DESCRIPTIONS: Record<EmployerRole, string> = {
  owner: 'Full access, including billing and ownership.',
  admin: 'Manage company profile, team, jobs and applicants.',
  recruiter: 'Pause or activate jobs and manage applicants and interviews.',
  hiring_manager: 'Review applicants, leave notes and run interviews.',
};
