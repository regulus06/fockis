// ============================================================================
// DEV-ONLY MOCK DATA
// ----------------------------------------------------------------------------
// Everything in this folder is isolated from the real service layer
// (`meetingsApi`, `meetingsSocket`, etc.) on purpose. Nothing here is
// imported by those files. It exists only so the UI can be previewed and
// designed before the NestJS backend and AI provider exist.
//
// When the real backend is wired up, this file (and the `dev-mock` folder)
// can be deleted without touching any service contract.
// ============================================================================
import type {
  Meeting,
  RoomParticipant,
  ChatMessage,
  TranscriptLine,
  MeetingSummary,
  AttendanceRecord,
  WaitingRoomEntry,
} from '../../types';

export const mockCurrentUser = { id: 'u-elince', displayName: 'Elince' };

const security = {
  waitingRoomEnabled: true,
  allowJoinBeforeHost: false,
  muteParticipantsOnEntry: true,
  screenShareWhoCanShare: 'host_only' as const,
  locked: false,
};

const secretary = {
  enabled: true,
  takeNotes: true,
  generateTranscript: true,
  identifyMainPoints: true,
  identifyDecisions: true,
  identifyActionItems: true,
  identifyQuestions: true,
  generateSummary: true,
  generatePdfReport: true,
};

export const mockMeetings: Meeting[] = [
  {
    id: 'mtg-1001',
    topic: 'Project Planning',
    description: 'Q3 roadmap, budget review, and launch readiness.',
    hostId: 'u-elince',
    hostName: 'Elince',
    date: '2026-08-14',
    startTime: '2026-08-14T14:00:00',
    endTime: '2026-08-14T15:00:00',
    durationMinutes: 60,
    timezone: 'America/New_York',
    meetingCode: '123 456 789',
    passcode: '482913',
    joinLink: 'fockis.com/meet/ABC-123',
    status: 'live',
    participants: [
      { id: 'u-elince', displayName: 'Elince' },
      { id: 'u-sarah', displayName: 'Sarah Johnson' },
      { id: 'u-john', displayName: 'John Smith' },
      { id: 'u-maria', displayName: 'Maria Alves' },
      { id: 'u-daniel', displayName: 'Daniel Cho' },
    ],
    participantCount: 5,
    agenda: [
      { id: 'a1', order: 1, title: 'Project goals' },
      { id: 'a2', order: 2, title: 'Budget' },
      { id: 'a3', order: 3, title: 'Responsibilities' },
      { id: 'a4', order: 4, title: 'Deadline' },
      { id: 'a5', order: 5, title: 'Next steps' },
    ],
    security,
    secretary,
    recordingEnabled: true,
  },
  {
    id: 'mtg-1002',
    topic: 'Design Review — Marketplace v2',
    hostId: 'u-elince',
    hostName: 'Elince',
    date: '2026-08-14',
    startTime: '2026-08-14T16:30:00',
    endTime: '2026-08-14T17:15:00',
    durationMinutes: 45,
    timezone: 'America/New_York',
    meetingCode: '552 118 004',
    joinLink: 'fockis.com/meet/DXR-552',
    status: 'scheduled',
    participants: [
      { id: 'u-elince', displayName: 'Elince' },
      { id: 'u-priya', displayName: 'Priya Nair' },
      { id: 'u-marcus', displayName: 'Marcus Webb' },
    ],
    participantCount: 3,
    agenda: [
      { id: 'b1', order: 1, title: 'New listing flow' },
      { id: 'b2', order: 2, title: 'Trust & safety badges' },
    ],
    security: { ...security, waitingRoomEnabled: false },
    secretary: { ...secretary, generatePdfReport: false },
  },
  {
    id: 'mtg-1003',
    topic: 'Weekly Sync — Growth',
    hostId: 'u-sarah',
    hostName: 'Sarah Johnson',
    date: '2026-08-17',
    startTime: '2026-08-17T10:00:00',
    endTime: '2026-08-17T10:30:00',
    durationMinutes: 30,
    timezone: 'America/New_York',
    meetingCode: '778 220 441',
    joinLink: 'fockis.com/meet/GRW-778',
    status: 'scheduled',
    participants: [
      { id: 'u-elince', displayName: 'Elince' },
      { id: 'u-sarah', displayName: 'Sarah Johnson' },
    ],
    participantCount: 2,
    agenda: [],
    security,
    secretary,
  },
  {
    id: 'mtg-0991',
    topic: 'Marketing Meeting',
    hostId: 'u-elince',
    hostName: 'Elince',
    date: '2026-08-12',
    startTime: '2026-08-12T13:00:00',
    endTime: '2026-08-12T13:43:00',
    durationMinutes: 43,
    timezone: 'America/New_York',
    meetingCode: '990 221 336',
    joinLink: 'fockis.com/meet/MKT-990',
    status: 'ended',
    participants: [
      { id: 'u-elince', displayName: 'Elince' },
      { id: 'u-sarah', displayName: 'Sarah Johnson' },
      { id: 'u-john', displayName: 'John Smith' },
    ],
    participantCount: 7,
    agenda: [],
    security,
    secretary,
  },
];

export const mockWaitingRoom: WaitingRoomEntry[] = [
  { id: 'w1', user: { id: 'u-sarah', displayName: 'Sarah Johnson' }, requestedAt: '2026-08-14T14:01:12' },
  { id: 'w2', user: { id: 'u-john', displayName: 'John Smith' }, requestedAt: '2026-08-14T14:02:40' },
];

export const mockParticipants: RoomParticipant[] = [
  { id: 'p-elince', user: { id: 'u-elince', displayName: 'Elince' }, role: 'host', micOn: true, cameraOn: true, handRaised: false, isSpeaking: true, screenSharing: false, connectionQuality: 'good', joinedAt: '2026-08-14T14:00:02' },
  { id: 'p-sarah', user: { id: 'u-sarah', displayName: 'Sarah Johnson' }, role: 'participant', micOn: true, cameraOn: true, handRaised: false, isSpeaking: false, screenSharing: false, connectionQuality: 'good', joinedAt: '2026-08-14T14:03:10' },
  { id: 'p-john', user: { id: 'u-john', displayName: 'John Smith' }, role: 'participant', micOn: false, cameraOn: true, handRaised: true, isSpeaking: false, screenSharing: false, connectionQuality: 'weak', joinedAt: '2026-08-14T14:12:44' },
  { id: 'p-maria', user: { id: 'u-maria', displayName: 'Maria Alves' }, role: 'co-host', micOn: false, cameraOn: false, handRaised: false, isSpeaking: false, screenSharing: false, connectionQuality: 'good', joinedAt: '2026-08-14T14:04:02' },
];

export const mockChatMessages: ChatMessage[] = [
  { id: 'c1', authorId: 'u-sarah', authorName: 'Sarah Johnson', body: 'Can everyone see my screen ok?', sentAt: '2026-08-14T14:10:00' },
  { id: 'c2', authorId: 'u-john', authorName: 'John Smith', body: 'Yep, looks good on my end.', sentAt: '2026-08-14T14:10:22' },
  { id: 'c3', authorId: 'u-elince', authorName: 'Elince', body: 'Great — let’s move to the budget section.', sentAt: '2026-08-14T14:11:05' },
];

export const mockTranscript: TranscriptLine[] = [
  { id: 't1', speakerId: 'u-elince', speakerName: 'Elince', text: 'We need to finalize the project deadline.', timestamp: '2026-08-14T14:04:00' },
  { id: 't2', speakerId: 'u-sarah', speakerName: 'Sarah', text: 'I think September 1 works on our side.', timestamp: '2026-08-14T14:05:12' },
  { id: 't3', speakerId: 'u-john', speakerName: 'John', text: 'I can finish the website before then.', timestamp: '2026-08-14T14:05:40' },
  { id: 't4', speakerId: 'u-maria', speakerName: 'Maria', text: 'I’ll need two extra days for marketing assets.', timestamp: '2026-08-14T14:06:55' },
];

export const mockSummary: MeetingSummary = {
  meetingId: 'mtg-1001',
  overview:
    'The team discussed project goals, budget, responsibilities, and the expected launch date for the marketplace redesign.',
  mainPoints: [
    'Project launch target',
    'Budget allocation',
    'Website development timeline',
    'Marketing preparation',
  ],
  decisions: [
    { id: 'd1', text: 'Launch date set for September 1' },
    { id: 'd2', text: 'Budget approved at $5,000' },
  ],
  actionItems: [
    { id: 'ai1', assigneeName: 'John', task: 'Finish website', dueDate: '2026-08-21' },
    { id: 'ai2', assigneeName: 'Sarah', task: 'Prepare marketing materials', dueDate: '2026-08-20' },
  ],
  questions: [
    { id: 'q1', text: 'What is the final testing date?' },
  ],
  nextSteps: ['Share updated timeline with stakeholders', 'Confirm marketing budget with finance'],
  generatedAt: '2026-08-14T15:07:00',
};

export const mockAttendance: AttendanceRecord[] = [
  { userId: 'u-elince', userName: 'Elince', status: 'host', joinedAt: '2:00 PM', leftAt: '3:07 PM', minutesPresent: 67 },
  { userId: 'u-sarah', userName: 'Sarah', status: 'present', joinedAt: '2:03 PM', leftAt: '3:07 PM', minutesPresent: 64 },
  { userId: 'u-john', userName: 'John', status: 'late', joinedAt: '2:12 PM', leftAt: '3:07 PM', minutesPresent: 55 },
  { userId: 'u-maria', userName: 'Maria', status: 'absent' },
];
