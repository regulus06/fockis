export const MEETING_ROUTES = {
  root: "/meetings",

  schedule: "/meetings/schedule",

  join: "/meetings/join",

  invitations: "/meetings/invitations",

  // Overall meeting history
  history: "/meetings/history",

  // Individual meeting details
  details: (id: string) => `/meetings/${encodeURIComponent(id)}`,

  // Individual meeting lobby
  lobby: (id: string) =>
    `/meetings/${encodeURIComponent(id)}/lobby`,

  // Individual meeting room
  room: (id: string) =>
    `/meetings/${encodeURIComponent(id)}/room`,

  // Individual meeting history
  meetingHistory: (id: string) =>
    `/meetings/${encodeURIComponent(id)}/history`,

  // Edit meeting
  edit: (id: string) =>
    `/meetings/${encodeURIComponent(id)}/edit`,

  // Transcript
  transcript: (id: string) =>
    `/meetings/${encodeURIComponent(id)}/transcript`,

  // AI summary
  summary: (id: string) =>
    `/meetings/${encodeURIComponent(id)}/summary`,

  // Attendance
  attendance: (id: string) =>
    `/meetings/${encodeURIComponent(id)}/attendance`,
} as const;


// ============================================================================
// Late meeting settings
// ============================================================================

export const LATE_THRESHOLD_MINUTES = 1;

export const LATE_NOTICE_OPTIONS_MIN = [
  5,
  10,
  15,
  20,
  30,
] as const;


// ============================================================================
// Meeting room right panel
// ============================================================================

export const RIGHT_PANEL_TABS = [
  "participants",
  "chat",
  "secretary",
] as const;

export type RightPanelTab =
  (typeof RIGHT_PANEL_TABS)[number];


// ============================================================================
// Reactions
// ============================================================================

export const REACTION_EMOJIS = [
  "👍",
  "🎉",
  "❤️",
  "😂",
  "👏",
  "✋",
] as const;