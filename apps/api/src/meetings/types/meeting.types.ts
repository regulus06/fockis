export type MeetingStatus =
  | "scheduled"
  | "starting_soon"
  | "late"
  | "live"
  | "ended"
  | "cancelled";

export type ParticipantRole =
  | "host"
  | "co-host"
  | "participant";

export type AttendanceStatus =
  | "present"
  | "late"
  | "absent"
  | "left_early"
  | "host"
  | "co_host";

export type ConnectionQuality =
  | "good"
  | "weak"
  | "poor"
  | "reconnecting";

export type SecretaryStatus =
  | "off"
  | "listening"
  | "processing"
  | "generating_summary"
  | "complete"
  | "error";

export type PdfGenerationStatus =
  | "idle"
  | "requested"
  | "generating"
  | "ready"
  | "error";

export interface MeetingSecuritySettings {
  waitingRoomEnabled: boolean;
  allowJoinBeforeHost: boolean;
  muteParticipantsOnEntry: boolean;
  screenShareWhoCanShare: "host_only" | "everyone";
  locked: boolean;
}

export interface AiSecretaryConfig {
  enabled: boolean;
  takeNotes: boolean;
  generateTranscript: boolean;
  identifyMainPoints: boolean;
  identifyDecisions: boolean;
  identifyActionItems: boolean;
  identifyQuestions: boolean;
  generateSummary: boolean;
  generatePdfReport: boolean;
}

export interface MeetingUser {
  id: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
}

export interface MeetingAgendaItem {
  id: string;
  order: number;
  title: string;
  completed: boolean;
}

export interface MeetingDecision {
  id: string;
  text: string;
}

export interface MeetingActionItem {
  id: string;
  assigneeId?: string;
  assigneeName?: string;
  task: string;
  dueDate?: string;
  completed: boolean;
}

export interface MeetingQuestion {
  id: string;
  text: string;
  answered: boolean;
}

export interface MeetingSummaryData {
  overview: string;
  mainPoints: string[];
  decisions: MeetingDecision[];
  actionItems: MeetingActionItem[];
  questions: MeetingQuestion[];
  nextSteps: string[];
}

export interface MeetingSocketUser {
  id: string;
  displayName: string;
}