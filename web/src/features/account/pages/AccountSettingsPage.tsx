import React, { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  Check,
  CircleAlert,
  CircleCheck,
  Eye,
  EyeOff,
  Info,
  LoaderCircle,
  Lock,
  Mail,
  Menu,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import api from "../../../api/api";
import { getUserId } from "../../../utils/auth";
import { buildFockisUploadUrl } from "../../../config/fockisConfig";
import { useFockisTheme } from "../../../context/ThemeContext";
import FockisSidebar from "../../../components/fockis/FockisSidebar/FockisSidebar";
import FockisTopBar from "../../../components/fockis/FockisTopBar";
import "./AccountSettingsPage.scss";
/* ============================================================================
   TYPES
 *============================================================================ */
type AccountUser = {
  _id?: string;
  id?: string;
  name?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  profilePicture?: string | null;
};
type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};
type Status = {
  kind: "success" | "error" | "info";
  text: string;
} | null;
type EmailStep = "request" | "verify" | "done";
type MfaState =
  | { state: "loading" }
  | { state: "ready"; enabled: boolean; required: boolean }
  | { state: "unknown" };
/* ============================================================================
   CONSTANTS
   These mirror the backend rules in users.controller.ts,
   user-security.service.ts and email-change.service.ts.
 *============================================================================ */
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_CODE_LENGTH = 6;
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const EMPTY_PASSWORD_FORM: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};
/* ============================================================================
   HELPERS
 *============================================================================ */
function getApiMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;
  if (Array.isArray(message)) return message.join(" ");
  if (typeof message === "string" && message.trim()) return message;
  return fallback;
}
function unwrapUser(data: unknown): AccountUser {
  const record = (data ?? {}) as { user?: AccountUser } & AccountUser;
  return record.user ?? record;
}
function getDisplayName(user: AccountUser | null): string {
  if (!user) return "";
  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return user.name || fullName || user.username || "";
}
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "F";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
/* ============================================================================
   SMALL PIECES
 *============================================================================ */
function StatusMessage({ status }: { status: Status }) {
  if (!status) return null;
  const Icon =
    status.kind === "success"
      ? CircleCheck
      : status.kind === "error"
        ? CircleAlert
        : Info;
  return (
    <div
      className={`fk-account-settings__notice fk-account-settings__notice--${status.kind}`}
      role={status.kind === "error" ? "alert" : "status"}
    >
      <Icon size={18} aria-hidden="true" />
      <span>{status.text}</span>
    </div>
  );
}
type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  autoComplete: "current-password" | "new-password";
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
};
function PasswordField({
  id,
  label,
  value,
  autoComplete,
  onChange,
  disabled,
  invalid,
  describedBy,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="fk-account-settings__field">
      <label htmlFor={id}>{label}</label>
      <div className="fk-account-settings__password">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          spellCheck={false}
          required
        />
        <button
          type="button"
          className="fk-account-settings__reveal"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          disabled={disabled}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}
const EMAIL_STEPS: { key: EmailStep; label: string }[] = [
  { key: "request", label: "Request verification code" },
  { key: "verify", label: "Enter verification code" },
  { key: "done", label: "Email updated" },
];
function EmailStepper({ step }: { step: EmailStep }) {
  const activeIndex = EMAIL_STEPS.findIndex((item) => item.key === step);
  return (
    <ol className="fk-account-settings__steps" aria-label="Email change progress">
      {EMAIL_STEPS.map((item, index) => {
        const complete = index < activeIndex || step === "done";
        const current = index === activeIndex && step !== "done";
        return (
          <li
            key={item.key}
            className={[
              "fk-account-settings__step",
              complete ? "is-complete" : "",
              current ? "is-current" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-current={current ? "step" : undefined}
          >
            <span className="fk-account-settings__step-dot" aria-hidden="true">
              {complete ? <Check size={14} strokeWidth={3} /> : index + 1}
            </span>
            <span className="fk-account-settings__step-label">{item.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
/* ============================================================================
   PAGE
 *============================================================================ */
export default function AccountSettingsPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useFockisTheme();
  const idPrefix = useId();
  const userId = getUserId();
  /* ---------------------------------------------------------------- account */
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  /* ---------------------------------------------------------------- username */
  const [newUsername, setNewUsername] = useState("");
  const [usernameBusy, setUsernameBusy] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<Status>(null);
  /* ----------------------------------------------------------------- avatar */
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarStatus, setAvatarStatus] = useState<Status>(null);
  const [avatarBroken, setAvatarBroken] = useState(false);
  /* ------------------------------------------------------------------ email */
  const [emailStep, setEmailStep] = useState<EmailStep>("request");
  const [newEmail, setNewEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailStatus, setEmailStatus] = useState<Status>(null);
  /* --------------------------------------------------------------- password */
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(EMPTY_PASSWORD_FORM);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<Status>(null);
  /* -------------------------------------------------------------------- 2FA */
  const [mfa, setMfa] = useState<MfaState>({ state: "loading" });
  /* ---------------------------------------------------------- mobile drawer */
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  /* ========================================================================
     LOAD ACCOUNT + 2FA STATUS
  ======================================================================== */
  useEffect(() => {
    let active = true;
    async function loadAccount() {
      try {
        setLoading(true);
        setLoadError("");
        const response = await api.get("/users/me");
        if (active) setUser(unwrapUser(response.data));
      } catch (error) {
        if (active) {
          setLoadError(
            getApiMessage(error, "We couldn't load your account. Please sign in again."),
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    async function loadMfaStatus() {
      try {
        const response = await api.get("/auth/mfa/status");
        if (!active) return;
        setMfa({
          state: "ready",
          enabled: Boolean(response.data?.mfaEnabled),
          required: Boolean(response.data?.mfaRequired),
        });
      } catch {
        if (active) setMfa({ state: "unknown" });
      }
    }
    void loadAccount();
    void loadMfaStatus();
    return () => {
      active = false;
    };
  }, []);
  /* ========================================================================
     MOBILE NAVIGATION DRAWER
  ======================================================================== */
  useEffect(() => {
    if (!mobileNavOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileNavOpen]);
  /* ========================================================================
     DERIVED VALUES
  ======================================================================== */
  const displayName = getDisplayName(user);
  const currentEmail = user?.email?.trim() || "";
  const avatarUrl =
    user?.profilePicture && !avatarBroken
      ? buildFockisUploadUrl(user.profilePicture)
      : "";
  const trimmedNewPassword = passwordForm.newPassword.trim();
  const passwordChecks = {
    length: trimmedNewPassword.length >= MIN_PASSWORD_LENGTH,
    mix:
      /[A-Za-z]/.test(passwordForm.newPassword) &&
      /\d/.test(passwordForm.newPassword) &&
      /[^A-Za-z0-9]/.test(passwordForm.newPassword),
    personal: (() => {
      if (!passwordForm.newPassword) return false;
      const lower = passwordForm.newPassword.toLowerCase();
      const fragments = [
        user?.username,
        user?.firstName,
        user?.lastName,
        currentEmail.split("@")[0],
      ]
        .map((value) => String(value || "").trim().toLowerCase())
        .filter((value) => value.length >= 3);
      return !fragments.some((fragment) => lower.includes(fragment));
    })(),
  };
  const confirmMismatch =
    passwordForm.confirmPassword.length > 0 &&
    passwordForm.newPassword !== passwordForm.confirmPassword;
  /* ========================================================================
     AVATAR
     PATCH /users/:id/profile-picture (multipart, field "file")
  ======================================================================== */
  /* ========================================================================
     USERNAME
     PATCH /users/:id { username }
  ======================================================================== */
  async function saveUsername(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUsernameStatus(null);
    if (!userId) {
      setUsernameStatus({
        kind: "error",
        text: "Your session is missing. Please sign in again.",
      });
      return;
    }
    const username = newUsername.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      setUsernameStatus({
        kind: "error",
        text: "Use 3–30 characters: letters, numbers, and underscores only.",
      });
      return;
    }
    if (username === (user?.username ?? "").trim().toLowerCase()) {
      setUsernameStatus({
        kind: "info",
        text: "That is already your current username.",
      });
      return;
    }
    try {
      setUsernameBusy(true);
      const response = await api.patch(
        `/users/${encodeURIComponent(userId)}`,
        { username },
      );
      const updatedUser = unwrapUser(response.data);
      setUser((previous) =>
        previous ? { ...previous, ...updatedUser, username } : previous,
      );
      setNewUsername("");
      setUsernameStatus({
        kind: "success",
        text: "Your username has been updated.",
      });
    } catch (error) {
      setUsernameStatus({
        kind: "error",
        text: getApiMessage(error, "We couldn't update your username."),
      });
    } finally {
      setUsernameBusy(false);
    }
  }
  async function handleAvatarSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setAvatarStatus(null);
    if (!userId) {
      setAvatarStatus({ kind: "error", text: "Your session is missing. Please sign in again." });
      return;
    }
    if (!AVATAR_TYPES.includes(file.type)) {
      setAvatarStatus({ kind: "error", text: "Choose a JPEG, PNG, WebP, or GIF image." });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarStatus({ kind: "error", text: "Profile pictures must be 5 MB or smaller." });
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    try {
      setAvatarBusy(true);
      const response = await api.patch(
        `/users/${encodeURIComponent(userId)}/profile-picture`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" }, timeout: 60000 },
      );
      const updated = unwrapUser(response.data);
      setAvatarBroken(false);
      setUser((previous) => ({
        ...previous,
        ...updated,
        // The profile-picture endpoint returns the public profile only,
        // so keep the email we already loaded from /users/me.
        email: previous?.email ?? null,
      }));
      setAvatarStatus({ kind: "success", text: "Profile picture updated." });
    } catch (error) {
      setAvatarStatus({
        kind: "error",
        text: getApiMessage(error, "We couldn't update your profile picture."),
      });
    } finally {
      setAvatarBusy(false);
    }
  }
  /* ========================================================================
     EMAIL CHANGE — STEP 1
     POST /users/:id/email-change/request { newEmail, currentPassword }
  ======================================================================== */
  async function requestEmailChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailStatus(null);
    if (!userId) {
      setEmailStatus({ kind: "error", text: "Your session is missing. Please sign in again." });
      return;
    }
    const normalizedEmail = newEmail.trim().toLowerCase();
    if (!normalizedEmail || !emailCurrentPassword) {
      setEmailStatus({ kind: "error", text: "Enter your new email address and current password." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setEmailStatus({ kind: "error", text: "Enter a valid email address." });
      return;
    }
    if (currentEmail && normalizedEmail === currentEmail.toLowerCase()) {
      setEmailStatus({
        kind: "error",
        text: "Your new email address must be different from your current one.",
      });
      return;
    }
    try {
      setEmailBusy(true);
      const response = await api.post(
        `/users/${encodeURIComponent(userId)}/email-change/request`,
        { newEmail: normalizedEmail, currentPassword: emailCurrentPassword },
      );
      const minutes = Math.round(Number(response.data?.expiresInSeconds || 0) / 60);
      setPendingEmail(normalizedEmail);
      setVerificationCode("");
      setEmailCurrentPassword("");
      setEmailStep("verify");
      setEmailStatus({
        kind: "info",
        text:
          minutes > 0
            ? `We sent a ${EMAIL_CODE_LENGTH}-digit code to ${normalizedEmail}. It expires in ${minutes} minutes.`
            : `We sent a ${EMAIL_CODE_LENGTH}-digit code to ${normalizedEmail}.`,
      });
    } catch (error) {
      setEmailStatus({
        kind: "error",
        text: getApiMessage(error, "We couldn't send a verification code."),
      });
    } finally {
      setEmailBusy(false);
    }
  }
  /* ========================================================================
     EMAIL CHANGE — STEP 2
     POST /users/:id/email-change/verify { code }
  ======================================================================== */
  async function verifyEmailChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailStatus(null);
    if (!userId) {
      setEmailStatus({ kind: "error", text: "Your session is missing. Please sign in again." });
      return;
    }
    const code = verificationCode.trim();
    if (!new RegExp(`^\\d{${EMAIL_CODE_LENGTH}}$`).test(code)) {
      setEmailStatus({
        kind: "error",
        text: `Enter the ${EMAIL_CODE_LENGTH}-digit code from your email.`,
      });
      return;
    }
    try {
      setEmailBusy(true);
      const response = await api.post(
        `/users/${encodeURIComponent(userId)}/email-change/verify`,
        { code },
      );
      // The backend only returns success after it has saved the new email.
      const confirmedEmail =
        typeof response.data?.email === "string" ? response.data.email : pendingEmail;
      try {
        const refreshed = await api.get("/users/me");
        const refreshedUser = unwrapUser(refreshed.data);
        setUser({ ...refreshedUser, email: refreshedUser.email ?? confirmedEmail });
      } catch {
        setUser((previous) => (previous ? { ...previous, email: confirmedEmail } : previous));
      }
      setNewEmail("");
      setVerificationCode("");
      setEmailStep("done");
      setEmailStatus({
        kind: "success",
        text: `Your email address is now ${confirmedEmail}.`,
      });
    } catch (error) {
      setEmailStatus({
        kind: "error",
        text: getApiMessage(error, "That verification code wasn't accepted."),
      });
    } finally {
      setEmailBusy(false);
    }
  }
  function restartEmailChange() {
    setEmailStep("request");
    setPendingEmail("");
    setVerificationCode("");
    setEmailCurrentPassword("");
    setEmailStatus(null);
  }
  /* ========================================================================
     PASSWORD
     PUT /users/:id/password { currentPassword, newPassword }
  ======================================================================== */
  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordStatus(null);
    if (!userId) {
      setPasswordStatus({ kind: "error", text: "Your session is missing. Please sign in again." });
      return;
    }
    if (!passwordForm.currentPassword) {
      setPasswordStatus({ kind: "error", text: "Enter your current password." });
      return;
    }
    if (trimmedNewPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordStatus({
        kind: "error",
        text: `Your new password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordStatus({ kind: "error", text: "The new password and confirmation don't match." });
      return;
    }
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordStatus({
        kind: "error",
        text: "Your new password must be different from your current password.",
      });
      return;
    }
    try {
      setPasswordBusy(true);
      await api.put(`/users/${encodeURIComponent(userId)}/password`, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm(EMPTY_PASSWORD_FORM);
      setPasswordStatus({ kind: "success", text: "Your password has been changed." });
    } catch (error) {
      setPasswordStatus({
        kind: "error",
        text: getApiMessage(error, "We couldn't change your password."),
      });
    } finally {
      setPasswordBusy(false);
    }
  }
  function updatePasswordField(field: keyof PasswordForm, value: string) {
    setPasswordForm((previous) => ({ ...previous, [field]: value }));
  }
  /* ========================================================================
     RENDER
  ======================================================================== */
  const ids = {
    name: `${idPrefix}-name`,
    email: `${idPrefix}-email`,
    newEmail: `${idPrefix}-new-email`,
    emailPassword: `${idPrefix}-email-password`,
    code: `${idPrefix}-code`,
    currentPassword: `${idPrefix}-current-password`,
    newPassword: `${idPrefix}-new-password`,
    confirmPassword: `${idPrefix}-confirm-password`,
    confirmHint: `${idPrefix}-confirm-hint`,
    checklist: `${idPrefix}-checklist`,
  };
  return (
    <div className="fk-account-shell">
      {/* ------------------------------------------------------------------
          EXISTING GLOBAL SIDEBAR (desktop rail / mobile drawer)
      ------------------------------------------------------------------ */}
      {mobileNavOpen && (
        <button
          type="button"
          className="fk-account-shell__backdrop"
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <FockisSidebar
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
      <div className="fk-account-shell__main">
        {/* ----------------------------------------------------------------
            EXISTING TOP BAR
        ---------------------------------------------------------------- */}
        <div className="fk-account-shell__topbar">
          <button
            type="button"
            className="fk-account-shell__menu"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
            aria-expanded={mobileNavOpen}
          >
            <Menu size={22} />
          </button>
          <FockisTopBar
            showPlaylists={false}
            onHomeClick={() => navigate("/fockis-preview")}
            onFriendsClick={() => navigate("/friends")}
            onMessagesClick={() => navigate("/messages")}
            onToggleTheme={toggleTheme}
            theme={theme}
            profile={
              user
                ? {
                    name: displayName || "Your profile",
                    avatarUrl: avatarUrl || undefined,
                    onClick: () => navigate("/profile"),
                  }
                : undefined
            }
          />
        </div>
        <main className="fk-account-settings">
          <header className="fk-account-settings__header">
            <h1>Settings</h1>
            <p>Manage your account information and security.</p>
          </header>
          {loading ? (
            <div className="fk-account-settings__card fk-account-settings__loading" role="status">
              <LoaderCircle className="fk-account-settings__spinner" size={20} aria-hidden="true" />
              Loading your account…
            </div>
          ) : loadError ? (
            <div className="fk-account-settings__card">
              <StatusMessage status={{ kind: "error", text: loadError }} />
            </div>
          ) : (
            <>
              {/* ==========================================================
                  ACCOUNT INFORMATION
              ========================================================== */}
              <section
                className="fk-account-settings__card fk-account-settings__account"
                aria-labelledby={`${idPrefix}-account-title`}
              >
                <div className="fk-account-settings__avatar-wrap">
                  <div className="fk-account-settings__avatar">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt=""
                        onError={() => setAvatarBroken(true)}
                      />
                    ) : (
                      <span aria-hidden="true">{getInitials(displayName)}</span>
                    )}
                    {avatarBusy && (
                      <span className="fk-account-settings__avatar-busy" aria-hidden="true">
                        <LoaderCircle className="fk-account-settings__spinner" size={22} />
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="fk-account-settings__avatar-button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarBusy || !userId}
                    aria-label="Change profile picture"
                    title="Change profile picture"
                  >
                    <Camera size={16} />
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept={AVATAR_TYPES.join(",")}
                    className="fk-account-settings__file"
                    onChange={handleAvatarSelected}
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                </div>
                <div className="fk-account-settings__account-body">
                  <div className="fk-account-settings__card-heading fk-account-settings__card-heading--plain">
                    <h2 id={`${idPrefix}-account-title`}>Account information</h2>
                    <p>Your current Fockis account details.</p>
                  </div>
                  <div className="fk-account-settings__grid">
                    <div className="fk-account-settings__field">
                      <label htmlFor={ids.name}>Display name</label>
                      <input
                        id={ids.name}
                        className="fk-account-settings__readonly"
                        value={displayName || "Not available"}
                        readOnly
                      />
                    </div>
                    <div className="fk-account-settings__field">
                      <label htmlFor={ids.email}>Current email address</label>
                      <input
                        id={ids.email}
                        className="fk-account-settings__readonly"
                        value={currentEmail || "Not available"}
                        readOnly
                      />
                    </div>
                  </div>
                  <StatusMessage status={avatarStatus} />
                </div>
                <aside className="fk-account-settings__info">
                  <Info size={20} aria-hidden="true" />
                  <p>
                    This information is used across Fockis, including your
                    profile, messages, and notifications.
                  </p>
                </aside>
              </section>
              {/* ==========================================================
                  CHANGE USERNAME
              ========================================================== */}
              <section
                className="fk-account-settings__card"
                aria-labelledby={`${idPrefix}-username-title`}
              >
                <div className="fk-account-settings__card-heading">
                  <span
                    className="fk-account-settings__icon fk-account-settings__icon--blue"
                    aria-hidden="true"
                  >
                    <Info size={22} />
                  </span>
                  <div>
                    <h2 id={`${idPrefix}-username-title`}>Change username</h2>
                    <p>
                      Update the username people use to find your profile.
                      Your permanent Fockis ID will not change.
                    </p>
                  </div>
                </div>
                <form
                  className="fk-account-settings__form"
                  onSubmit={saveUsername}
                  noValidate
                >
                  <div className="fk-account-settings__field">
                    <label htmlFor={`${idPrefix}-new-username`}>
                      New username
                    </label>
                    <input
                      id={`${idPrefix}-new-username`}
                      name="username"
                      type="text"
                      autoComplete="username"
                      value={newUsername}
                      onChange={(event) => setNewUsername(event.target.value)}
                      minLength={3}
                      maxLength={30}
                      pattern="[A-Za-z0-9_]{3,30}"
                      placeholder="Enter a new username"
                      aria-describedby={`${idPrefix}-username-help`}
                      disabled={usernameBusy}
                      required
                    />
                    <small id={`${idPrefix}-username-help`}>
                      3–30 characters. Letters, numbers, and underscores only.
                    </small>
                  </div>
                  <StatusMessage status={usernameStatus} />
                  <button
                    type="submit"
                    className="fk-account-settings__primary"
                    disabled={usernameBusy || !userId}
                  >
                    {usernameBusy && (
                      <LoaderCircle
                        className="fk-account-settings__spinner"
                        size={18}
                        aria-hidden="true"
                      />
                    )}
                    {usernameBusy ? "Saving username…" : "Save username"}
                  </button>
                </form>
              </section>
              {/* ==========================================================
                  CHANGE EMAIL
              ========================================================== */}
              <section
                className="fk-account-settings__card"
                aria-labelledby={`${idPrefix}-email-title`}
              >
                <div className="fk-account-settings__card-heading">
                  <span className="fk-account-settings__icon fk-account-settings__icon--blue" aria-hidden="true">
                    <Mail size={22} />
                  </span>
                  <div>
                    <h2 id={`${idPrefix}-email-title`}>Change email address</h2>
                    <p>Confirm your password and verify the code sent to your new email.</p>
                  </div>
                </div>
                <EmailStepper step={emailStep} />
                <StatusMessage status={emailStatus} />
                {emailStep === "request" && (
                  <form className="fk-account-settings__form" onSubmit={requestEmailChange} noValidate>
                    <div className="fk-account-settings__grid">
                      <div className="fk-account-settings__field">
                        <label htmlFor={ids.newEmail}>New email address</label>
                        <input
                          id={ids.newEmail}
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          placeholder="name@example.com"
                          value={newEmail}
                          onChange={(event) => setNewEmail(event.target.value)}
                          disabled={emailBusy}
                          required
                        />
                      </div>
                      <PasswordField
                        id={ids.emailPassword}
                        label="Current password"
                        autoComplete="current-password"
                        value={emailCurrentPassword}
                        onChange={setEmailCurrentPassword}
                        disabled={emailBusy}
                      />
                    </div>
                    <button type="submit" className="fk-account-settings__primary" disabled={emailBusy}>
                      {emailBusy && <LoaderCircle className="fk-account-settings__spinner" size={18} aria-hidden="true" />}
                      {emailBusy ? "Sending code…" : "Send verification code"}
                    </button>
                  </form>
                )}
                {emailStep === "verify" && (
                  <form className="fk-account-settings__form" onSubmit={verifyEmailChange} noValidate>
                    <div className="fk-account-settings__field fk-account-settings__field--code">
                      <label htmlFor={ids.code}>Verification code</label>
                      <input
                        id={ids.code}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern={`\\d{${EMAIL_CODE_LENGTH}}`}
                        maxLength={EMAIL_CODE_LENGTH}
                        placeholder={"•".repeat(EMAIL_CODE_LENGTH)}
                        value={verificationCode}
                        onChange={(event) =>
                          setVerificationCode(
                            event.target.value.replace(/\D/g, "").slice(0, EMAIL_CODE_LENGTH),
                          )
                        }
                        disabled={emailBusy}
                        required
                      />
                    </div>
                    <div className="fk-account-settings__actions">
                      <button type="submit" className="fk-account-settings__primary" disabled={emailBusy}>
                        {emailBusy && <LoaderCircle className="fk-account-settings__spinner" size={18} aria-hidden="true" />}
                        {emailBusy ? "Verifying…" : "Verify and update email"}
                      </button>
                      <button
                        type="button"
                        className="fk-account-settings__secondary"
                        onClick={restartEmailChange}
                        disabled={emailBusy}
                      >
                        Use a different email
                      </button>
                    </div>
                  </form>
                )}
                {emailStep === "done" && (
                  <div className="fk-account-settings__actions">
                    <button
                      type="button"
                      className="fk-account-settings__secondary"
                      onClick={restartEmailChange}
                    >
                      Change email again
                    </button>
                  </div>
                )}
              </section>
              {/* ==========================================================
                  PASSWORD
              ========================================================== */}
              <section
                className="fk-account-settings__card"
                aria-labelledby={`${idPrefix}-password-title`}
              >
                <div className="fk-account-settings__card-heading">
                  <span className="fk-account-settings__icon fk-account-settings__icon--purple" aria-hidden="true">
                    <Lock size={22} />
                  </span>
                  <div>
                    <h2 id={`${idPrefix}-password-title`}>Password and security</h2>
                    <p>Use a strong password with at least {MIN_PASSWORD_LENGTH} characters.</p>
                  </div>
                </div>
                <div className="fk-account-settings__split">
                  <aside className="fk-account-settings__guide" id={ids.checklist}>
                    <div className="fk-account-settings__guide-title">
                      <span className="fk-account-settings__icon fk-account-settings__icon--green fk-account-settings__icon--sm" aria-hidden="true">
                        <ShieldCheck size={18} />
                      </span>
                      <strong>Password tips</strong>
                    </div>
                    <ul>
                      <li className={passwordChecks.length ? "is-met" : ""}>
                        <Check size={16} strokeWidth={2.5} aria-hidden="true" />
                        At least {MIN_PASSWORD_LENGTH} characters
                      </li>
                      <li className={passwordChecks.mix ? "is-met" : ""}>
                        <Check size={16} strokeWidth={2.5} aria-hidden="true" />
                        Use a mix of letters, numbers and symbols
                      </li>
                      <li className={passwordChecks.personal ? "is-met" : ""}>
                        <Check size={16} strokeWidth={2.5} aria-hidden="true" />
                        Avoid using your name or email
                      </li>
                      <li>
                        <Check size={16} strokeWidth={2.5} aria-hidden="true" />
                        Choose a unique password
                      </li>
                    </ul>
                  </aside>
                  <form className="fk-account-settings__form" onSubmit={changePassword} noValidate>
                    <PasswordField
                      id={ids.currentPassword}
                      label="Current password"
                      autoComplete="current-password"
                      value={passwordForm.currentPassword}
                      onChange={(value) => updatePasswordField("currentPassword", value)}
                      disabled={passwordBusy}
                    />
                    <PasswordField
                      id={ids.newPassword}
                      label="New password"
                      autoComplete="new-password"
                      value={passwordForm.newPassword}
                      onChange={(value) => updatePasswordField("newPassword", value)}
                      disabled={passwordBusy}
                      describedBy={ids.checklist}
                    />
                    <PasswordField
                      id={ids.confirmPassword}
                      label="Confirm new password"
                      autoComplete="new-password"
                      value={passwordForm.confirmPassword}
                      onChange={(value) => updatePasswordField("confirmPassword", value)}
                      disabled={passwordBusy}
                      invalid={confirmMismatch}
                      describedBy={confirmMismatch ? ids.confirmHint : undefined}
                    />
                    {confirmMismatch && (
                      <p className="fk-account-settings__field-error" id={ids.confirmHint}>
                        Passwords don't match yet.
                      </p>
                    )}
                    <StatusMessage status={passwordStatus} />
                    <button type="submit" className="fk-account-settings__primary" disabled={passwordBusy}>
                      {passwordBusy && <LoaderCircle className="fk-account-settings__spinner" size={18} aria-hidden="true" />}
                      {passwordBusy ? "Changing password…" : "Change password"}
                    </button>
                  </form>
                </div>
              </section>
              {/* ==========================================================
                  TWO-FACTOR AUTHENTICATION
                  Status comes from GET /auth/mfa/status. Setup is only
                  issued by the sign-in flow for roles that require it, so
                  there is no enable switch here.
              ========================================================== */}
              <section
                className="fk-account-settings__card fk-account-settings__mfa"
                aria-labelledby={`${idPrefix}-mfa-title`}
              >
                <div className="fk-account-settings__card-heading">
                  <span className="fk-account-settings__icon fk-account-settings__icon--orange" aria-hidden="true">
                    <ShieldAlert size={22} />
                  </span>
                  <div>
                    <h2 id={`${idPrefix}-mfa-title`}>Two-factor authentication</h2>
                    <p>
                      {mfa.state === "loading" && "Checking your two-factor status…"}
                      {mfa.state === "ready" && mfa.enabled &&
                        "Two-factor authentication is on. You'll enter a code from your authenticator app when you sign in."}
                      {mfa.state === "ready" && !mfa.enabled && mfa.required &&
                        "Your account role requires two-factor authentication. You'll be asked to set it up the next time you sign in."}
                      {mfa.state === "ready" && !mfa.enabled && !mfa.required &&
                        "Adding a second sign-in step can't be turned on from Settings yet."}
                      {mfa.state === "unknown" &&
                        "We couldn't check your two-factor status right now."}
                    </p>
                  </div>
                </div>
                {mfa.state === "ready" && mfa.enabled ? (
                  <div className="fk-account-settings__pill fk-account-settings__pill--on" role="status">
                    <ShieldCheck size={16} aria-hidden="true" />
                    Enabled
                  </div>
                ) : mfa.state !== "loading" ? (
                  <div className="fk-account-settings__pill fk-account-settings__pill--off" role="status">
                    <Info size={16} aria-hidden="true" />
                    {mfa.state === "unknown" ? "Status unavailable" : "Not available yet"}
                  </div>
                ) : null}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
