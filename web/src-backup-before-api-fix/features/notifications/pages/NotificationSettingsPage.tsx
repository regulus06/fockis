import { useState } from "react";
import "../styles/notifications.scss";

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState({
    liveInvitations: true,
    follows: true,
    comments: true,
    likes: true,
    messages: true,
  });

  const toggle = (key: keyof typeof settings) => {
    setSettings((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const rows = [
    ["liveInvitations", "LIVE invitations", "Get notified when someone invites you to join their LIVE."],
    ["follows", "Followers", "New follows and follow-related activity."],
    ["comments", "Comments", "Comments and replies on your content."],
    ["likes", "Likes", "Likes and reactions on your content."],
    ["messages", "Messages", "Important notifications related to your conversations."],
  ] as const;

  return (
    <main className="fockis-notifications-page">
      <div className="fockis-notifications-page__container fockis-notifications-page__container--narrow">
        <header className="fockis-notifications-page__header">
          <div>
            <span className="fockis-eyebrow">PREFERENCES</span>
            <h1>Notification settings</h1>
            <p>Choose which activity you want Fockis to notify you about.</p>
          </div>
        </header>

        <section className="fockis-settings-card">
          {rows.map(([key, title, description]) => (
            <label className="fockis-settings-row" key={key}>
              <span>
                <strong>{title}</strong>
                <small>{description}</small>
              </span>

              <button
                type="button"
                className={`fockis-switch ${settings[key] ? "is-on" : ""}`}
                aria-pressed={settings[key]}
                onClick={() => toggle(key)}
              >
                <span />
              </button>
            </label>
          ))}
        </section>
      </div>
    </main>
  );
}
