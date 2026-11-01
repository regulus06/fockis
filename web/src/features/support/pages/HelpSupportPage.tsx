import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Bug,
  ChevronRight,
  CircleHelp,
  Layers,
  LifeBuoy,
  MessageCircleMore,
  ShieldCheck,
  Ticket,
  type LucideIcon,
} from "lucide-react";

import HelpShell from "../components/HelpShell";
import HelpIllustration from "../components/HelpIllustration";
import HelpSearch from "../components/HelpSearch";
import { LiveChatPanel, SystemStatusPanel } from "../components/SupportPanels";
import { TOPIC_ICONS } from "../components/helpIcons";
import { HELP_TOPICS } from "../data/helpTopics";
import { useHelpQuery } from "../hooks/useHelpQuery";
import { useHelpUser } from "../hooks/useHelpUser";
import { supportApi } from "../services/supportApi";

interface SupportCard {
  to: string;
  title: string;
  text: string;
  icon: LucideIcon;
  tone: "blue" | "green" | "red" | "purple" | "amber";
}

const CARDS: SupportCard[] = [
  { to: "/help/articles", title: "Help Center", text: "Guides, tutorials, and how-to articles.", icon: BookOpen, tone: "blue" },
  { to: "/help/contact", title: "Contact Support", text: "Chat or send a message to our support team.", icon: MessageCircleMore, tone: "green" },
  { to: "/help/report-problem", title: "Report a Problem", text: "Report bugs, errors, or something that isn't working.", icon: Bug, tone: "red" },
  { to: "/help/tickets", title: "My Support Tickets", text: "View and track your support requests.", icon: Ticket, tone: "purple" },
  { to: "/help/safety", title: "Safety & Security", text: "Report abuse, scams, or policy violations.", icon: ShieldCheck, tone: "amber" },
  { to: "/help/faq", title: "Frequently Asked Questions", text: "Quick answers to common questions.", icon: CircleHelp, tone: "blue" },
];

/** /help — Fockis Help & Support home. */
export default function HelpSupportPage() {
  const { user } = useHelpUser();
  const overview = useHelpQuery(() => supportApi.overview(), [user?.username], { enabled: Boolean(user) });
  const unread = overview.data?.unreadTickets ?? 0;

  return (
    <HelpShell>
      <div className="fk-help-home">
        <div className="fk-help-hero">
          <div className="fk-help-hero__copy">
            <span className="fk-help-hero__buoy" aria-hidden="true">
              <LifeBuoy size={76} strokeWidth={2.1} />
            </span>
            <div>
              <h1>Fockis Help &amp; Support</h1>
              <p>Get help, find answers, and contact the Fockis support team.</p>
            </div>
          </div>
          <HelpIllustration />
          <HelpSearch className="fk-help-hero__search" />
        </div>

        <div className="fk-help-cards">
          {CARDS.map((card) => (
            <Link key={card.to} to={card.to} className="fk-help-card-link">
              <span className={`fk-help-icon fk-help-icon--${card.tone}`}>
                <card.icon size={34} strokeWidth={1.9} />
              </span>
              <span className="fk-help-card-link__text">
                <strong>
                  {card.title}
                  {card.to === "/help/tickets" && unread > 0 && (
                    <span className="fk-help-count" aria-label={`${unread} new replies`}>{unread}</span>
                  )}
                </strong>
                <span>{card.text}</span>
              </span>
              <ChevronRight className="fk-help-chevron" size={22} aria-hidden="true" />
            </Link>
          ))}
        </div>

        <div className="fk-help-lower">
          <div className="fk-help-panel fk-help-topics">
            <div className="fk-help-topics__head">
              <h2>
                <Layers size={28} strokeWidth={2} aria-hidden="true" /> Browse Help Topics
              </h2>
              <Link to="/help/topics" className="fk-help-link">
                View All Topics <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <div className="fk-help-topics__grid">
              {HELP_TOPICS.map((topic) => {
                const Icon = TOPIC_ICONS[topic.id];
                return (
                  <Link key={topic.id} to={`/help/topics/${topic.id}`} className="fk-help-topic">
                    <span className="fk-help-topic__icon"><Icon size={26} strokeWidth={1.9} /></span>
                    <span className="fk-help-topic__text">
                      <strong>{topic.title}</strong>
                      <span>{topic.description}</span>
                    </span>
                    <ChevronRight className="fk-help-chevron" size={20} aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="fk-help-side">
            <LiveChatPanel overview={overview.data} signedIn={Boolean(user)} />
            <SystemStatusPanel />
          </div>
        </div>
      </div>
    </HelpShell>
  );
}
