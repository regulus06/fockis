export interface EmployerInterview {
  id: string;
  applicationId: string;
  candidateName: string;
  jobTitle: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  location?: string;
  meetingUrl?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}
