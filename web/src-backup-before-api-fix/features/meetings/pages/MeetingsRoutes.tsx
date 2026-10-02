import { Route, Routes } from "react-router-dom";

import MeetingsPage from "./MeetingsPage";
import MeetingJoinPage from "./MeetingJoinPage";
import { ScheduleMeetingPage } from "./ScheduleMeetingPage";
import { MeetingDetailsPage } from "./MeetingDetailsPage";
import { MeetingEditPage } from "./MeetingEditPage";
import { MeetingLobbyPage } from "./MeetingLobbyPage";
import { MeetingRoomPage } from "./MeetingRoomPage";
import { MeetingHistoryPage } from "./MeetingHistoryPage";
import { MeetingTranscriptPage } from "./MeetingTranscriptPage";
import { MeetingSummaryPage } from "./MeetingSummaryPage";
import { MeetingAttendancePage } from "./MeetingAttendancePage";
import { MeetingInvitationsPage } from "./MeetingInvitationsPage";

export function MeetingsRoutes() {
  return (
    <Routes>
      {/* Meetings dashboard */}
      <Route
        index
        element={<MeetingsPage />}
      />

      {/* Standalone join page */}
      <Route
        path="join"
        element={<MeetingJoinPage />}
      />

      {/* Schedule */}
      <Route
        path="schedule"
        element={<ScheduleMeetingPage />}
      />

      {/* Invitations */}
      <Route
        path="invitations"
        element={<MeetingInvitationsPage />}
      />

      {/* Overall meeting history */}
      <Route
        path="history"
        element={<MeetingHistoryPage />}
      />

      {/* Meeting edit */}
      <Route
        path=":id/edit"
        element={<MeetingEditPage />}
      />

      {/* Meeting lobby */}
      <Route
        path=":id/lobby"
        element={<MeetingLobbyPage />}
      />

      {/* Live meeting room */}
      <Route
        path=":id/room"
        element={<MeetingRoomPage />}
      />

      {/* Individual meeting history */}
      <Route
        path=":id/history"
        element={<MeetingHistoryPage />}
      />

      {/* Transcript */}
      <Route
        path=":id/transcript"
        element={<MeetingTranscriptPage />}
      />

      {/* Summary */}
      <Route
        path=":id/summary"
        element={<MeetingSummaryPage />}
      />

      {/* Attendance */}
      <Route
        path=":id/attendance"
        element={<MeetingAttendancePage />}
      />

      {/* Meeting details — keep last */}
      <Route
        path=":id"
        element={<MeetingDetailsPage />}
      />
    </Routes>
  );
}

export default MeetingsRoutes;