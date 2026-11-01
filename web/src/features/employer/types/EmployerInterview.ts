export type InterviewType = 'video' | 'phone' | 'onsite';
export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled';
export type InterviewRecommendation = 'strong_yes' | 'yes' | 'no' | 'strong_no';

export interface EmployerInterview {
  id: string;
  applicationId: string;
  jobId: string;
  candidateName: string;
  candidateEmail: string | null;
  jobTitle: string;
  startsAt: string;
  durationMinutes: number;
  timezone: string;
  type: InterviewType;
  meetingUrl: string | null;
  location: string | null;
  notes: string | null;
  status: InterviewStatus;
  feedback: {
    rating: number;
    recommendation: InterviewRecommendation;
    comments: string | null;
    submittedAt: string;
  } | null;
  createdAt: string | null;
}

export interface EmployerInterviewList {
  items: EmployerInterview[];
  counts: { upcoming: number } & Partial<Record<InterviewStatus, number>>;
}

export interface ScheduleInterviewPayload {
  applicationId: string;
  startsAt: string;
  durationMinutes: number;
  timezone: string;
  type: InterviewType;
  meetingUrl?: string;
  location?: string;
  notes?: string;
}
