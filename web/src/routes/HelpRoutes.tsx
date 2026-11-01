import { Navigate, Route } from "react-router-dom";

import HelpSupportPage from "../features/support/pages/HelpSupportPage";
import HelpCenterPage from "../features/support/pages/HelpCenterPage";
import HelpArticlePage from "../features/support/pages/HelpArticlePage";
import { HelpTopicPage, HelpTopicsPage } from "../features/support/pages/HelpTopicsPage";
import FaqPage from "../features/support/pages/FaqPage";
import { ContactSupportPage, ReportProblemPage } from "../features/support/pages/ContactSupportPage";
import { MyTicketsPage, TicketDetailPage } from "../features/support/pages/MyTicketsPage";
import SafetyCenterPage from "../features/support/pages/SafetyCenterPage";
import LiveChatPage from "../features/support/pages/LiveChatPage";
import SystemStatusPage from "../features/support/pages/SystemStatusPage";
import { FeedbackDetailPage, FeedbackPage } from "../features/support/pages/FeedbackPages";

/**
 * Fockis Help & Support (/help/*). The sidebar "Help & Support" link and the
 * Shop / Seller footer links (/help, /help/contact, /help/returns,
 * /help/shipping) all land here.
 */
export function HelpRoutes() {
  return (
    <>
      <Route path="/help" element={<HelpSupportPage />} />
      <Route path="/help/articles" element={<HelpCenterPage />} />
      <Route path="/help/articles/:articleId" element={<HelpArticlePage />} />
      <Route path="/help/topics" element={<HelpTopicsPage />} />
      <Route path="/help/topics/:topicId" element={<HelpTopicPage />} />
      <Route path="/help/faq" element={<FaqPage />} />
      <Route path="/help/contact" element={<ContactSupportPage />} />
      <Route path="/help/report-problem" element={<ReportProblemPage />} />
      <Route path="/help/tickets" element={<MyTicketsPage />} />
      <Route path="/help/tickets/:ticketId" element={<TicketDetailPage />} />
      <Route path="/help/safety" element={<SafetyCenterPage />} />
      <Route path="/help/chat" element={<LiveChatPage />} />
      <Route path="/help/status" element={<SystemStatusPage />} />
      <Route path="/help/feedback" element={<FeedbackPage />} />
      <Route path="/help/feedback/:feedbackId" element={<FeedbackDetailPage />} />

      {/* Existing links from the Shop and Seller footers */}
      <Route path="/help/returns" element={<HelpArticlePage articleId="shop-returns" />} />
      <Route path="/help/shipping" element={<HelpArticlePage articleId="shop-shipping" />} />

      {/* Older / alternative addresses */}
      <Route path="/support" element={<Navigate to="/help" replace />} />
      <Route path="/help/*" element={<Navigate to="/help" replace />} />
    </>
  );
}

export default HelpRoutes;
