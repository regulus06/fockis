import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { EyeOff, Globe2, Info, Lock, MessageSquareText, MessagesSquare, Search, ShieldCheck, VolumeX } from "lucide-react";

import { HelpError, HelpLoading, SignedInOnly } from "../../support/components/HelpStates";
import { useHelpToast } from "../../support/hooks/useHelpToast";
import { apiMessage, policyCenterApi, type PrivacySettings } from "../api/policyCenterApi";
import PolicyShell from "../components/PolicyShell";
import { Card, Toggle } from "../components/PolicyUi";
import { fmtDate, useLoad } from "../components/policyUtils";

type Patch = Partial<Pick<PrivacySettings, "profileVisibility" | "messaging" | "comments" | "searchable">>;

const MESSAGE_OPTIONS = [
  { value: "everyone", label: "Everyone" },
  { value: "friends", label: "Friends only" },
  { value: "following", label: "People I follow" },
  { value: "nobody", label: "No one" },
];
const COMMENT_OPTIONS = [
  { value: "everyone", label: "Everyone" },
  { value: "friends", label: "Friends only" },
  { value: "followers", label: "My followers" },
  { value: "nobody", label: "No one" },
];

function MutedAccounts() {
  const notify = useHelpToast();
  const muted = useLoad(() => policyCenterApi.muted());
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    try {
      muted.setData(await policyCenterApi.mute(value.trim()));
      setValue("");
      notify("Account muted. Their posts won't appear in your feed.");
    } catch (e) {
      notify(apiMessage(e, "We couldn't mute that account."), "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string, name: string) {
    try {
      muted.setData(await policyCenterApi.unmute(id));
      notify(`@${name} unmuted.`);
    } catch (e) {
      notify(apiMessage(e, "We couldn't unmute that account."), "error");
    }
  }

  return (
    <Card title="Muted accounts" icon={<VolumeX size={22} />}>
      <p className="fk-pol-intro">Muted people aren't told. Their posts are left out of your feed, but they can still see your profile. To stop all contact, block them in the Safety Center.</p>
      <form className="fk-pol-inline-form" onSubmit={(e) => void add(e)}>
        <input className="fk-pol-input" value={value} onChange={(e) => setValue(e.target.value)} placeholder="@username" aria-label="Username to mute" maxLength={60} />
        <button type="submit" className="fk-pol-btn fk-pol-btn--primary" disabled={busy || !value.trim()}>
          {busy ? "Muting…" : "Mute"}
        </button>
      </form>
      {muted.loading && !muted.data ? (
        <HelpLoading />
      ) : muted.error ? (
        <HelpError message={muted.error} onRetry={() => void muted.reload()} />
      ) : !muted.data?.length ? (
        <p className="fk-pol-muted">You haven't muted anyone.</p>
      ) : (
        <ul className="fk-pol-people">
          {muted.data.map((p) => (
            <li key={p.id}>
              <span className="fk-pol-avatar">{(p.name || p.username || "?").charAt(0).toUpperCase()}</span>
              <div>
                <strong>{p.name || p.username}</strong>
                <span>@{p.username}</span>
              </div>
              <button type="button" className="fk-pol-btn fk-pol-btn--outline fk-pol-btn--sm" onClick={() => void remove(p.id, p.username)}>
                Unmute
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function PrivacyContent() {
  const notify = useHelpToast();
  const { data, setData, error, loading, reload } = useLoad(() => policyCenterApi.privacy());
  const [saving, setSaving] = useState<string>("");

  async function save(key: keyof Patch, patch: Patch, message: string) {
    if (!data) return;
    const before = data;
    setData({ ...data, ...patch });
    setSaving(key);
    try {
      setData(await policyCenterApi.updatePrivacy(patch));
      notify(message);
    } catch (e) {
      setData(before);
      notify(apiMessage(e, "We couldn't save that setting."), "error");
    } finally {
      setSaving("");
    }
  }

  if (loading && !data) return <div className="fk-pol-card"><HelpLoading label="Loading your privacy settings…" /></div>;
  if (error && !data) return <div className="fk-pol-card"><HelpError message={error} onRetry={() => void reload()} /></div>;
  const s = data!;

  return (
    <div className="fk-pol-grid2">
      <div className="fk-pol-stack">
        <Card title="Privacy Controls" icon={<ShieldCheck size={24} />} action={s.updatedAt ? <span className="fk-pol-muted">Last changed {fmtDate(s.updatedAt)}</span> : null}>
          <p className="fk-pol-intro">Changes save straight away and apply everywhere on Fockis.</p>

          <div className="fk-pol-setting">
            <div className="fk-pol-setting__text">
              <strong>Profile visibility</strong>
              <span>Private profiles show posts and details only to approved friends.</span>
            </div>
            <div className="fk-pol-segment" role="radiogroup" aria-label="Profile visibility">
              {(["public", "private"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={s.profileVisibility === v}
                  className={s.profileVisibility === v ? "is-active" : ""}
                  disabled={saving === "profileVisibility"}
                  onClick={() => s.profileVisibility !== v && void save("profileVisibility", { profileVisibility: v }, v === "private" ? "Your profile is now private." : "Your profile is now public.")}
                >
                  {v === "public" ? <Globe2 size={16} aria-hidden /> : <Lock size={16} aria-hidden />} {v === "public" ? "Public" : "Private"}
                </button>
              ))}
            </div>
          </div>

          <div className="fk-pol-setting">
            <div className="fk-pol-setting__text">
              <strong>
                <MessageSquareText size={17} aria-hidden /> Who can message me
              </strong>
              <span>Applies to new conversations. Existing chats aren't affected.</span>
            </div>
            <select className="fk-pol-select" value={s.messaging} disabled={saving === "messaging"} onChange={(e) => void save("messaging", { messaging: e.target.value as PrivacySettings["messaging"] }, "Message settings saved.")} aria-label="Who can message me">
              {MESSAGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="fk-pol-setting">
            <div className="fk-pol-setting__text">
              <strong>
                <MessagesSquare size={17} aria-hidden /> Who can comment on my posts
              </strong>
              <span>People outside this group can still see your posts if your profile allows it.</span>
            </div>
            <select className="fk-pol-select" value={s.comments} disabled={saving === "comments"} onChange={(e) => void save("comments", { comments: e.target.value as PrivacySettings["comments"] }, "Comment settings saved.")} aria-label="Who can comment on my posts">
              {COMMENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="fk-pol-setting">
            <div className="fk-pol-setting__text">
              <strong>
                <Search size={17} aria-hidden /> Show me in search and suggestions
              </strong>
              <span>When off, people can still open your profile from a direct link.</span>
            </div>
            <Toggle label="Show me in search and suggestions" checked={s.searchable} disabled={saving === "searchable"} onChange={(v) => void save("searchable", { searchable: v }, v ? "You'll appear in search again." : "You're hidden from search and suggestions.")} />
          </div>
        </Card>

        <div className="fk-pol-note">
          <Info size={18} aria-hidden />
          <span>
            Hiding your online status, tag and mention controls, and story audiences aren't available on Fockis yet. They'll appear here when they are. Blocked accounts are managed in the <Link to="/settings/policy/safety">Safety Center</Link>.
          </span>
        </div>
      </div>

      <div className="fk-pol-stack">
        <MutedAccounts />
        <Card title="How your content is used" icon={<EyeOff size={22} />}>
          <p className="fk-pol-intro">Personalized recommendations, advertising cookies and optional analytics are controlled on the Consent page.</p>
          <Link to="/settings/policy/consent" className="fk-pol-btn fk-pol-btn--outline">
            Manage consent
          </Link>
        </Card>
      </div>
    </div>
  );
}

export default function PolicyPrivacyPage() {
  return (
    <PolicyShell>
      <SignedInOnly what="manage your privacy settings">{() => <PrivacyContent />}</SignedInOnly>
    </PolicyShell>
  );
}
