import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  aiAdminApi,
  type AiDashboardStats,
} from "../api/aiAdminApi";

import AiStatusCard from "../components/AiStatusCard";
import AiEmergencyControls from "../components/AiEmergencyControls";

import "../styles/AiAdmin.scss";

const initial: AiDashboardStats = {
  aiOnline: true,
  usersWithAi: 0,
  activeSessions: 0,
  chatSessions: 0,
  voiceMinutes: 0,
  phoneMinutes: 0,
};

interface AiQuickLink {
  title: string;
  description: string;
  path: string;
  icon: string;
  eyebrow: string;
}

const quickLinks: AiQuickLink[] = [
  {
    title: "AI Plans",
    description:
      "Configure membership AI access, limits, and feature permissions.",
    path: "/admin/ai/plans",
    icon: "◈",
    eyebrow: "ACCESS",
  },
  {
    title: "AI Users",
    description:
      "Review individual users and manage their AI access overrides.",
    path: "/admin/ai/users",
    icon: "♙",
    eyebrow: "USERS",
  },
  {
    title: "Conversations",
    description:
      "Review AI conversations, sessions, outcomes, and moderation data.",
    path: "/admin/ai/conversations",
    icon: "◌",
    eyebrow: "CHAT",
  },
  {
    title: "AI Tools",
    description:
      "Control the tools and capabilities available to Fockis AI.",
    path: "/admin/ai/tools",
    icon: "⌘",
    eyebrow: "TOOLS",
  },
  {
    title: "Recommendations",
    description:
      "Manage recommendation behavior and AI-powered discovery.",
    path: "/admin/ai/recommendations",
    icon: "✦",
    eyebrow: "DISCOVERY",
  },
  {
    title: "Special AI Ads",
    description:
      "Manage special AI advertising placements and configurations.",
    path: "/admin/ai/special-ads",
    icon: "▣",
    eyebrow: "ADS",
  },
  {
    title: "AI Usage",
    description:
      "Monitor chat, voice, phone usage, limits, and consumption.",
    path: "/admin/ai/usage",
    icon: "◫",
    eyebrow: "ANALYTICS",
  },
  {
    title: "AI Settings",
    description:
      "Configure global AI behavior, providers, safety, and system settings.",
    path: "/admin/ai/settings",
    icon: "⚙",
    eyebrow: "SYSTEM",
  },
];

export default function AiAdminDashboard() {
  const [stats, setStats] = useState<AiDashboardStats>(initial);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const dashboard = await aiAdminApi.getDashboard();
      setStats(dashboard);
    } catch (err) {
      console.error("Failed to load AI dashboard", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load AI dashboard data.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const disableAll = async () => {
    if (!window.confirm("Disable all Fockis AI services?")) {
      return;
    }

    try {
      setError("");

      await aiAdminApi.emergencyDisable();

      setStats((current) => ({
        ...current,
        aiOnline: false,
      }));
    } catch (err) {
      console.error("Failed to disable AI", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to disable Fockis AI.",
      );
    }
  };

  return (
    <div className="ai-admin-page">
      {/* ================================================================
          HEADER
      ================================================================ */}

      <header className="ai-page-header">
        <div>
          <span className="ai-eyebrow">Fockis AI & Vapi</span>

          <h1>AI Control Center</h1>

          <p>
            Manage AI chat, voice, phone calls, access, tools,
            recommendations, usage, and Vapi infrastructure.
          </p>
        </div>

        <div className="ai-header-actions">
          <button
            type="button"
            className="ai-secondary-button"
            onClick={() => void loadDashboard(true)}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "↻ Refresh"}
          </button>

          <span
            className={`ai-system-pill ${
              stats.aiOnline ? "on" : "off"
            }`}
          >
            <i />
            {stats.aiOnline
              ? "System online"
              : "System disabled"}
          </span>
        </div>
      </header>

      {/* ================================================================
          ERROR
      ================================================================ */}

      {error ? (
        <section className="ai-alert ai-alert-error">
          <div>
            <strong>AI dashboard error</strong>
            <p>{error}</p>
          </div>

          <button
            type="button"
            onClick={() => void loadDashboard(true)}
          >
            Retry
          </button>
        </section>
      ) : null}

      {/* ================================================================
          STATISTICS
      ================================================================ */}

      <div className="ai-stat-grid">
        <AiStatusCard
          label="Users with AI"
          value={
            loading
              ? "—"
              : stats.usersWithAi.toLocaleString()
          }
          detail="Current access"
        />

        <AiStatusCard
          label="Active sessions"
          value={
            loading
              ? "—"
              : stats.activeSessions.toLocaleString()
          }
          detail="Chat + voice + calls"
          tone="success"
        />

        <AiStatusCard
          label="Chat sessions"
          value={
            loading
              ? "—"
              : stats.chatSessions.toLocaleString()
          }
          detail="Current period"
        />

        <AiStatusCard
          label="Voice minutes"
          value={
            loading
              ? "—"
              : stats.voiceMinutes.toLocaleString()
          }
          detail="Current period"
        />

        <AiStatusCard
          label="Phone minutes"
          value={
            loading
              ? "—"
              : stats.phoneMinutes.toLocaleString()
          }
          detail="Current period"
          tone="warning"
        />
      </div>

      {/* ================================================================
          QUICK ACCESS
      ================================================================ */}

      <section className="ai-panel ai-quick-access">
        <div className="ai-panel-head">
          <div>
            <span className="ai-eyebrow">
              Administration
            </span>

            <h2>AI management</h2>

            <p>
              Open a management area to configure a specific
              part of Fockis AI.
            </p>
          </div>
        </div>

        <div className="ai-quick-grid">
          {quickLinks.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="ai-quick-card"
            >
              <div className="ai-quick-card-top">
                <span className="ai-quick-icon">
                  {item.icon}
                </span>

                <span className="ai-quick-eyebrow">
                  {item.eyebrow}
                </span>

                <span className="ai-quick-arrow">
                  →
                </span>
              </div>

              <h3>{item.title}</h3>

              <p>{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ================================================================
          EMERGENCY CONTROLS
      ================================================================ */}

      <AiEmergencyControls
        online={stats.aiOnline}
        onDisable={disableAll}
      />

      {/* ================================================================
          ARCHITECTURE
      ================================================================ */}

      <section className="ai-panel">
        <div className="ai-panel-head">
          <div>
            <span className="ai-eyebrow">
              Architecture
            </span>

            <h2>Centralized access control</h2>

            <p>
              Fockis determines who can use each AI capability.
              Vapi provides the conversational infrastructure.
            </p>
          </div>

          <Link
            to="/admin/ai/settings"
            className="ai-panel-link"
          >
            Open settings →
          </Link>
        </div>

        <div className="ai-flow">
          <div>
            <strong>01</strong>
            <span>Membership plan</span>
          </div>

          <b>→</b>

          <div>
            <strong>02</strong>
            <span>User override</span>
          </div>

          <b>→</b>

          <div>
            <strong>03</strong>
            <span>Usage limits</span>
          </div>

          <b>→</b>

          <div>
            <strong>04</strong>
            <span>Feature permission</span>
          </div>

          <b>→</b>

          <div>
            <strong>05</strong>
            <span>Vapi</span>
          </div>
        </div>

        <p className="ai-muted">
          Fockis remains the authority for access. Vapi handles
          the conversational infrastructure.
        </p>
      </section>

      {/* ================================================================
          COMMON AI OPERATIONS
      ================================================================ */}

      <section className="ai-panel ai-operations-panel">
        <div className="ai-panel-head">
          <div>
            <span className="ai-eyebrow">
              Operations
            </span>

            <h2>Common AI operations</h2>
          </div>
        </div>

        <div className="ai-operation-grid">
          <Link
            to="/admin/ai/users"
            className="ai-operation-link"
          >
            <span>Manage user access</span>
            <b>→</b>
          </Link>

          <Link
            to="/admin/ai/plans"
            className="ai-operation-link"
          >
            <span>Configure AI plans</span>
            <b>→</b>
          </Link>

          <Link
            to="/admin/ai/conversations"
            className="ai-operation-link"
          >
            <span>Review conversations</span>
            <b>→</b>
          </Link>

          <Link
            to="/admin/ai/tools"
            className="ai-operation-link"
          >
            <span>Manage AI tools</span>
            <b>→</b>
          </Link>

          <Link
            to="/admin/ai/usage"
            className="ai-operation-link"
          >
            <span>View usage analytics</span>
            <b>→</b>
          </Link>

          <Link
            to="/admin/ai/settings"
            className="ai-operation-link"
          >
            <span>Configure AI system</span>
            <b>→</b>
          </Link>
        </div>
      </section>
    </div>
  );
}