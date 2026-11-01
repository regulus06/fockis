import type { ReactNode } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";

import { PERMISSIONS, type PermissionValue } from "../permissions/permission.constants";
import { PermissionRouteGuard } from "../routes/PermissionRouteGuard";
import SupportModLayout from "./layout/SupportModLayout";
import SmOverviewPage from "./pages/SmOverviewPage";
import { FeedbackDetailPage, FeedbackInboxPage } from "./pages/FeedbackPages";
import TicketsPage from "./pages/TicketsPage";
import TicketDetailPage from "./pages/TicketDetailPage";
import ContentReportsPage from "./pages/ContentReportsPage";
import { PostReviewPage, PostsPage } from "./pages/PostsPages";
import HistoryPage from "./pages/HistoryPage";
import { ArticleEditorPage, ArticlesPage } from "./pages/ArticlesPages";
import LiveSupportPage from "./pages/LiveSupportPage";

const P = PERMISSIONS;

function guard(anyOf: PermissionValue[], element: ReactNode) {
  return <PermissionRouteGuard requireAny={anyOf}>{element}</PermissionRouteGuard>;
}

/** Old Support Inbox links (/admin/support/cases/:id) keep working. */
function LegacyTicketRedirect() {
  const { ticketId = "" } = useParams();
  return <Navigate to={`/admin/support/tickets/${ticketId}`} replace />;
}

/** Admin Center → Support & Moderation (mounted at /admin/support/*). */
export default function SupportModRoutes() {
  return (
    <Routes>
      <Route path="cases" element={<Navigate to="/admin/support/tickets" replace />} />
      <Route path="cases/:ticketId" element={<LegacyTicketRedirect />} />

      <Route element={<SupportModLayout />}>
        <Route index element={<SmOverviewPage />} />
        <Route path="feedback" element={guard([P.SUPPORT_VIEW], <FeedbackInboxPage />)} />
        <Route path="feedback/:feedbackId" element={guard([P.SUPPORT_VIEW], <FeedbackDetailPage />)} />
        <Route path="tickets" element={guard([P.SUPPORT_VIEW], <TicketsPage />)} />
        <Route path="tickets/:ticketId" element={guard([P.SUPPORT_VIEW], <TicketDetailPage />)} />
        <Route path="reports" element={guard([P.MODERATION_VIEW], <ContentReportsPage />)} />
        <Route path="hidden-posts" element={guard([P.MODERATION_VIEW], <PostsPage />)} />
        <Route path="posts/:postId" element={guard([P.MODERATION_VIEW], <PostReviewPage />)} />
        <Route path="history" element={guard([P.MODERATION_VIEW], <HistoryPage />)} />
        <Route path="articles" element={guard([P.HELP_CONTENT_MANAGE], <ArticlesPage />)} />
        <Route path="articles/:articleId" element={guard([P.HELP_CONTENT_MANAGE], <ArticleEditorPage />)} />
        <Route path="live" element={guard([P.SUPPORT_VIEW], <LiveSupportPage />)} />
        <Route path="live/:chatId" element={guard([P.SUPPORT_VIEW], <LiveSupportPage />)} />
        <Route path="*" element={<Navigate to="/admin/support" replace />} />
      </Route>
    </Routes>
  );
}
