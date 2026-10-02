/**
 * ChurchMemberSettingsPage.tsx
 * -----------------------------------------------------------------------------
 * Fockis Organization Member Settings
 *
 * This page is intentionally organization-neutral.
 *
 * Supported organization types include:
 *
 *   - Church
 *   - Business
 *   - Nonprofit
 *   - School
 *   - Ministry
 *   - Community
 *   - Club
 *   - Other
 *
 * The current filename remains ChurchMemberSettingsPage.tsx for compatibility
 * with the existing application structure. The UI itself is generic and should
 * not assume that the organization is a church.
 *
 * Supported routes:
 *
 *   /member/settings
 *   /church/me/settings
 *   /church/member/settings
 *   /church/member-portal/settings
 *   /organizations/:organizationId/settings
 *
 * Membership behavior:
 *
 *   - Loads the current user's organization membership when organizationId
 *     is available.
 *   - Displays the real membership status and role.
 *   - Leaving requires:
 *       1. Click "Leave Organization"
 *       2. Read warning
 *       3. Check acknowledgement
 *       4. Type LEAVE
 *       5. Click final "Leave Organization"
 *
 * Backend remains authoritative and can prevent:
 *
 *   - organization owner from leaving
 *   - final active administrator from leaving
 *   - unauthorized membership changes
 *
 * Backend endpoint:
 *
 *   DELETE /organizations/:organizationId/members/:memberId
 * -----------------------------------------------------------------------------
 */

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import ChurchHeader from "../components/ChurchHeader";
import { membersApi } from "../api/membersApi";

import "../styles/OrganizationMemberSettingsPage.scss";

type SettingsTab =
  | "overview"
  | "account"
  | "organization"
  | "notifications"
  | "privacy"
  | "communication"
  | "groups"
  | "events"
  | "attendance"
  | "media"
  | "security"
  | "danger";

type OrganizationKind =
  | "church"
  | "business"
  | "nonprofit"
  | "school"
  | "ministry"
  | "community"
  | "club"
  | "other";

interface ToggleRowProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled = false,
}: ToggleRowProps): React.JSX.Element {
  return (
    <label
      className={`organization-settings-toggle ${
        disabled
          ? "organization-settings-toggle--disabled"
          : ""
      }`}
    >
      <span className="organization-settings-toggle__content">
        <strong>{title}</strong>

        <span>{description}</span>
      </span>

      <span className="organization-settings-switch">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) =>
            onChange(event.target.checked)
          }
        />

        <span className="organization-settings-switch__track">
          <span className="organization-settings-switch__thumb" />
        </span>
      </span>
    </label>
  );
}

interface LeaveOrganizationModalProps {
  onCancel: () => void;
  onConfirm: () => void;
  leaving: boolean;
  organizationName: string;
}

function LeaveOrganizationModal({
  onCancel,
  onConfirm,
  leaving,
  organizationName,
}: LeaveOrganizationModalProps): React.JSX.Element {
  const [acknowledged, setAcknowledged] =
    useState(false);

  const [confirmationText, setConfirmationText] =
    useState("");

  const normalizedText =
    confirmationText.trim().toUpperCase();

  const canLeave =
    acknowledged &&
    normalizedText === "LEAVE" &&
    !leaving;

  return (
    <div
      className="organization-settings-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !leaving
        ) {
          onCancel();
        }
      }}
    >
      <div
        className="organization-settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-organization-title"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="organization-settings-modal__header">
          <div className="organization-settings-modal__icon organization-settings-modal__icon--danger">
            !
          </div>

          <button
            type="button"
            className="organization-settings-modal__close"
            onClick={onCancel}
            disabled={leaving}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="organization-settings-modal__body">
          <span className="organization-settings-kicker">
            Membership action
          </span>

          <h2 id="leave-organization-title">
            Leave this organization?
          </h2>

          <p className="organization-settings-modal__lead">
            You are about to remove your membership from{" "}
            <strong>{organizationName}</strong>.
          </p>

          <div className="organization-settings-danger-box">
            <strong>
              Your organization access will be removed.
            </strong>

            <p>
              Leaving may remove access to member-only
              groups, teams, departments, events,
              communications, media, attendance records,
              resources, and other organization features.
            </p>
          </div>

          <div className="organization-settings-consequences">
            <h3>Before you continue</h3>

            <ul>
              <li>
                Your current organization membership will
                be removed.
              </li>

              <li>
                You may lose access to member-only areas.
              </li>

              <li>
                Your Fockis account will not be deleted.
              </li>

              <li>
                You may request to join the organization
                again later.
              </li>
            </ul>
          </div>

          <label className="organization-settings-acknowledgement">
            <input
              type="checkbox"
              checked={acknowledged}
              disabled={leaving}
              onChange={(event) =>
                setAcknowledged(
                  event.target.checked,
                )
              }
            />

            <span>
              I understand that leaving this organization
              will remove my current membership and may
              remove my access to organization features.
            </span>
          </label>

          <div className="organization-settings-confirm">
            <label
              htmlFor="leave-organization-confirmation"
            >
              Type <strong>LEAVE</strong> to confirm
            </label>

            <input
              id="leave-organization-confirmation"
              type="text"
              value={confirmationText}
              disabled={leaving}
              onChange={(event) =>
                setConfirmationText(
                  event.target.value,
                )
              }
              placeholder="Type LEAVE"
              autoComplete="off"
              spellCheck={false}
            />

            {confirmationText.length > 0 &&
              normalizedText !== "LEAVE" && (
                <small>
                  Please type LEAVE exactly to continue.
                </small>
              )}
          </div>
        </div>

        <div className="organization-settings-modal__footer">
          <button
            type="button"
            className="organization-settings-button organization-settings-button--secondary"
            onClick={onCancel}
            disabled={leaving}
          >
            Cancel
          </button>

          <button
            type="button"
            className="organization-settings-button organization-settings-button--danger"
            onClick={onConfirm}
            disabled={!canLeave}
          >
            {leaving
              ? "Leaving..."
              : "Leave Organization"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SaveButton({
  onClick,
  saved,
}: {
  onClick: () => void;
  saved: boolean;
}): React.JSX.Element {
  return (
    <div className="organization-settings-save-row">
      <button
        type="button"
        className="organization-settings-button organization-settings-button--primary"
        onClick={onClick}
      >
        Save settings
      </button>

      {saved && (
        <span className="organization-settings-saved">
          ✓ Settings saved
        </span>
      )}
    </div>
  );
}

function formatMembershipValue(
  value: string,
): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function normalizeOrganizationKind(
  value: unknown,
): OrganizationKind {
  if (typeof value !== "string") {
    return "other";
  }

  const normalized =
    value.trim().toLowerCase();

  switch (normalized) {
    case "church":
      return "church";

    case "business":
    case "company":
      return "business";

    case "nonprofit":
    case "non-profit":
    case "non_profit":
      return "nonprofit";

    case "school":
    case "education":
      return "school";

    case "ministry":
      return "ministry";

    case "community":
      return "community";

    case "club":
      return "club";

    default:
      return "other";
  }
}

function getOrganizationPresentation(
  kind: OrganizationKind,
): {
  label: string;
  icon: string;
  description: string;
} {
  switch (kind) {
    case "church":
      return {
        label: "Church",
        icon: "✦",
        description:
          "Manage your church membership and member experience.",
      };

    case "business":
      return {
        label: "Business",
        icon: "▣",
        description:
          "Manage your business membership and workplace experience.",
      };

    case "nonprofit":
      return {
        label: "Nonprofit",
        icon: "◆",
        description:
          "Manage your nonprofit membership and community access.",
      };

    case "school":
      return {
        label: "School",
        icon: "▤",
        description:
          "Manage your school membership, communication, and activities.",
      };

    case "ministry":
      return {
        label: "Ministry",
        icon: "✦",
        description:
          "Manage your ministry membership and participation.",
      };

    case "community":
      return {
        label: "Community",
        icon: "◎",
        description:
          "Manage your community membership and participation.",
      };

    case "club":
      return {
        label: "Club",
        icon: "♢",
        description:
          "Manage your club membership, groups, and activities.",
      };

    default:
      return {
        label: "Organization",
        icon: "◈",
        description:
          "Manage your organization membership and member experience.",
      };
  }
}

export default function ChurchMemberSettingsPage(): React.JSX.Element {
  const navigate = useNavigate();

  const { organizationId } =
    useParams<{
      organizationId?: string;
    }>();

  const [tab, setTab] =
    useState<SettingsTab>("overview");

  const [currentMembership, setCurrentMembership] =
    useState<
      Awaited<
        ReturnType<
          typeof membersApi.getMyMembership
        >
      > | null
    >(null);

  const [loadingMembership, setLoadingMembership] =
    useState(true);

  const [membershipError, setMembershipError] =
    useState<string | null>(null);

  const [saved, setSaved] =
    useState(false);

  const [leaveModalOpen, setLeaveModalOpen] =
    useState(false);

  const [leavingOrganization, setLeavingOrganization] =
    useState(false);

  /*
   * Notification settings.
   */
  const [announcements, setAnnouncements] =
    useState(true);

  const [eventReminders, setEventReminders] =
    useState(true);

  const [groupNotifications, setGroupNotifications] =
    useState(true);

  const [teamNotifications, setTeamNotifications] =
    useState(true);

  const [mediaNotifications, setMediaNotifications] =
    useState(true);

  const [emailNotifications, setEmailNotifications] =
    useState(true);

  const [pushNotifications, setPushNotifications] =
    useState(true);

  const [smsNotifications, setSmsNotifications] =
    useState(false);

  /*
   * Privacy.
   */
  const [membershipVisible, setMembershipVisible] =
    useState(true);

  const [profileVisible, setProfileVisible] =
    useState(true);

  const [phoneVisible, setPhoneVisible] =
    useState(false);

  const [emailVisible, setEmailVisible] =
    useState(false);

  /*
   * Communication.
   */
  const [allowMemberMessages, setAllowMemberMessages] =
    useState(true);

  const [showGroups, setShowGroups] =
    useState(true);

  /*
   * Events.
   */
  const [eventNotifications, setEventNotifications] =
    useState(true);

  /*
   * Attendance.
   */
  const [attendanceTracking, setAttendanceTracking] =
    useState(true);

  const [attendancePrivate, setAttendancePrivate] =
    useState(true);

  /*
   * Media.
   */
  const [mediaAccessNotifications, setMediaAccessNotifications] =
    useState(true);

  /*
   * Organization presentation.
   *
   * The backend can eventually expose organization.type
   * directly through the membership object.
   *
   * Until then we remain completely organization-neutral.
   */
  const organizationKind =
    useMemo<OrganizationKind>(() => {
      const membership =
        currentMembership as
          | (typeof currentMembership & {
              organizationType?: unknown;
              organizationKind?: unknown;
            })
          | null;

      return normalizeOrganizationKind(
        membership?.organizationType ??
          membership?.organizationKind,
      );
    }, [currentMembership]);

  const organizationPresentation =
    getOrganizationPresentation(
      organizationKind,
    );

  const organizationName =
    "your organization";

  /*
   * Load membership only when the organization ID
   * is present.
   *
   * /member/settings is intentionally supported even
   * without an organization ID so the page can still
   * provide account-level settings.
   */
  useEffect(() => {
    let cancelled = false;

    const loadMembership = async (): Promise<void> => {
      if (!organizationId) {
        setCurrentMembership(null);
        setMembershipError(null);
        setLoadingMembership(false);
        return;
      }

      setLoadingMembership(true);
      setMembershipError(null);

      try {
        const membership =
          await membersApi.getMyMembership(
            organizationId,
          );

        if (!cancelled) {
          setCurrentMembership(membership);
        }
      } catch (error) {
        console.error(
          "Failed to load organization membership:",
          error,
        );

        if (!cancelled) {
          setCurrentMembership(null);

          setMembershipError(
            "We could not load your organization membership.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingMembership(false);
        }
      }
    };

    void loadMembership();

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  const handleSave = (): void => {
    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 2500);
  };

  const handleOpenLeaveModal = (): void => {
    if (leavingOrganization) {
      return;
    }

    if (!organizationId) {
      window.alert(
        "Open your organization membership settings to leave an organization.",
      );
      return;
    }

    if (!currentMembership) {
      window.alert(
        "Your organization membership could not be loaded.",
      );
      return;
    }

    if (currentMembership.isOwner) {
      window.alert(
        "The organization owner cannot leave the organization. Transfer ownership or recover another administrator before leaving.",
      );
      return;
    }

    setLeaveModalOpen(true);
  };

  const handleConfirmLeaveOrganization =
    async (): Promise<void> => {
      if (leavingOrganization) {
        return;
      }

      if (!organizationId) {
        window.alert(
          "No organization was specified.",
        );
        return;
      }

      if (!currentMembership) {
        window.alert(
          "Your organization membership could not be loaded.",
        );
        return;
      }

      if (currentMembership.isOwner) {
        window.alert(
          "The organization owner cannot leave the organization.",
        );
        return;
      }

      setLeavingOrganization(true);

      try {
        await membersApi.removeMember(
          organizationId,
          currentMembership.id,
        );

        setLeaveModalOpen(false);

        navigate("/organizations", {
          replace: true,
        });
      } catch (error) {
        console.error(
          "Failed to leave organization:",
          error,
        );

        const message =
          error instanceof Error
            ? error.message
            : "We could not remove your organization membership. Please try again.";

        window.alert(message);
      } finally {
        setLeavingOrganization(false);
      }
    };

  const renderMembershipStatus =
    (): React.JSX.Element => {
      if (loadingMembership) {
        return <dd>Loading...</dd>;
      }

      if (!currentMembership) {
        return <dd>Not connected</dd>;
      }

      return (
        <dd>
          {currentMembership.status
            ? formatMembershipValue(
                currentMembership.status,
              )
            : "Active"}
        </dd>
      );
    };

  const renderMembershipRole =
    (): React.JSX.Element => {
      if (loadingMembership) {
        return <dd>Loading...</dd>;
      }

      if (!currentMembership) {
        return <dd>Unavailable</dd>;
      }

      return (
        <dd>
          {currentMembership.role
            ? formatMembershipValue(
                currentMembership.role,
              )
            : "Member"}
        </dd>
      );
    };

  const renderOverview = (): React.JSX.Element => {
    return (
      <section className="organization-settings-card">
        <div className="organization-settings-card__header">
          <div>
            <span className="organization-settings-kicker">
              Personal settings
            </span>

            <h2>Welcome to your settings</h2>

            <p>
              Manage your Fockis account and your
              organization experience from one place.
            </p>
          </div>

          <div className="organization-settings-card__badge">
            <span>
              {organizationPresentation.icon}
            </span>

            <strong>
              {organizationPresentation.label}
            </strong>
          </div>
        </div>

        <div className="organization-settings-overview-grid">
          <button
            type="button"
            onClick={() => setTab("organization")}
            className="organization-settings-overview-card"
          >
            <span className="organization-settings-overview-card__icon">
              ◈
            </span>

            <strong>Organization</strong>

            <span>
              Membership, role, and organization access.
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("notifications")}
            className="organization-settings-overview-card"
          >
            <span className="organization-settings-overview-card__icon">
              ◉
            </span>

            <strong>Notifications</strong>

            <span>
              Control alerts, reminders, email, and push.
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("privacy")}
            className="organization-settings-overview-card"
          >
            <span className="organization-settings-overview-card__icon">
              ◇
            </span>

            <strong>Privacy</strong>

            <span>
              Control what organization members can see.
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("security")}
            className="organization-settings-overview-card"
          >
            <span className="organization-settings-overview-card__icon">
              ◆
            </span>

            <strong>Security</strong>

            <span>
              Protect your Fockis account and sessions.
            </span>
          </button>
        </div>
      </section>
    );
  };

  const renderAccount = (): React.JSX.Element => {
    return (
      <section className="organization-settings-card">
        <div className="organization-settings-card__header">
          <div>
            <span className="organization-settings-kicker">
              Account
            </span>

            <h2>Fockis account</h2>

            <p>
              Your Fockis account is separate from your
              organization membership.
            </p>
          </div>
        </div>

        <div className="organization-settings-summary-list">
          <div>
            <dt>Profile</dt>

            <dd>
              <Link to="/profile">
                Manage your Fockis profile
              </Link>
            </dd>
          </div>

          <div>
            <dt>Account security</dt>

            <dd>
              Manage your password and security settings.
            </dd>
          </div>

          <div>
            <dt>Organization membership</dt>

            <dd>
              Your membership can be removed without
              deleting your Fockis account.
            </dd>
          </div>
        </div>
      </section>
    );
  };

  const renderOrganization = (): React.JSX.Element => {
    return (
      <section className="organization-settings-card">
        <div className="organization-settings-card__header">
          <div>
            <span className="organization-settings-kicker">
              Organization
            </span>

            <h2>My organization</h2>

            <p>
              {organizationPresentation.description}
            </p>
          </div>

          <div className="organization-settings-type">
            <span>
              {organizationPresentation.icon}
            </span>

            <div>
              <small>Organization type</small>

              <strong>
                {organizationPresentation.label}
              </strong>
            </div>
          </div>
        </div>

        {membershipError && (
          <div className="organization-settings-alert organization-settings-alert--danger">
            {membershipError}
          </div>
        )}

        {!organizationId && (
          <div className="organization-settings-alert organization-settings-alert--info">
            <strong>
              No organization is currently selected.
            </strong>

            <span>
              Open an organization first to view your
              membership details and membership actions.
            </span>
          </div>
        )}

        <div className="organization-settings-summary-list">
          <div>
            <dt>Membership status</dt>
            {renderMembershipStatus()}
          </div>

          <div>
            <dt>Membership role</dt>
            {renderMembershipRole()}
          </div>

          <div>
            <dt>Organization owner</dt>

            <dd>
              {currentMembership?.isOwner
                ? "Yes"
                : "No"}
            </dd>
          </div>

          <div>
            <dt>Membership ID</dt>

            <dd>
              {currentMembership?.id ??
                "Unavailable"}
            </dd>
          </div>
        </div>

        <div className="organization-settings-actions">
          <Link
            to="/organizations"
            className="organization-settings-button organization-settings-button--primary"
          >
            Browse Organizations
          </Link>

          {organizationId && (
            <Link
              to={`/organizations/${encodeURIComponent(
                organizationId,
              )}`}
              className="organization-settings-button organization-settings-button--secondary"
            >
              View Organization
            </Link>
          )}
        </div>
      </section>
    );
  };

  const renderNotifications =
    (): React.JSX.Element => {
      return (
        <section className="organization-settings-card">
          <div className="organization-settings-card__header">
            <div>
              <span className="organization-settings-kicker">
                Notifications
              </span>

              <h2>Notification preferences</h2>

              <p>
                Choose what you want to hear about from
                your organization.
              </p>
            </div>
          </div>

          <div className="organization-settings-section">
            <h3>Organization activity</h3>

            <ToggleRow
              title="Announcements"
              description="Receive important announcements from your organization."
              checked={announcements}
              onChange={setAnnouncements}
            />

            <ToggleRow
              title="Event reminders"
              description="Receive reminders about upcoming organization events."
              checked={eventReminders}
              onChange={setEventReminders}
            />

            <ToggleRow
              title="Group notifications"
              description="Receive updates from groups you belong to."
              checked={groupNotifications}
              onChange={setGroupNotifications}
            />

            <ToggleRow
              title="Team and department notifications"
              description="Receive updates from teams, departments, or units you belong to."
              checked={teamNotifications}
              onChange={setTeamNotifications}
            />

            <ToggleRow
              title="Media notifications"
              description="Receive notifications about new organization media."
              checked={mediaNotifications}
              onChange={setMediaNotifications}
            />
          </div>

          <div className="organization-settings-section">
            <h3>Delivery</h3>

            <ToggleRow
              title="Email notifications"
              description="Receive organization notifications by email."
              checked={emailNotifications}
              onChange={setEmailNotifications}
            />

            <ToggleRow
              title="Push notifications"
              description="Receive notifications on your connected devices."
              checked={pushNotifications}
              onChange={setPushNotifications}
            />

            <ToggleRow
              title="SMS notifications"
              description="Receive important organization notifications by text message."
              checked={smsNotifications}
              onChange={setSmsNotifications}
            />
          </div>

          <SaveButton
            onClick={handleSave}
            saved={saved}
          />
        </section>
      );
    };

  const renderPrivacy = (): React.JSX.Element => {
    return (
      <section className="organization-settings-card">
        <div className="organization-settings-card__header">
          <div>
            <span className="organization-settings-kicker">
              Privacy
            </span>

            <h2>Privacy controls</h2>

            <p>
              Control what other members can see about
              your organization profile.
            </p>
          </div>
        </div>

        <ToggleRow
          title="Show organization membership"
          description="Allow organization members to see that you belong to this organization."
          checked={membershipVisible}
          onChange={setMembershipVisible}
        />

        <ToggleRow
          title="Show my organization profile"
          description="Allow organization members to view your organization profile."
          checked={profileVisible}
          onChange={setProfileVisible}
        />

        <ToggleRow
          title="Show my phone number"
          description="Allow approved organization members to see your phone number."
          checked={phoneVisible}
          onChange={setPhoneVisible}
        />

        <ToggleRow
          title="Show my email"
          description="Allow approved organization members to see your email."
          checked={emailVisible}
          onChange={setEmailVisible}
        />

        <ToggleRow
          title="Show my groups"
          description="Allow your organization profile to display groups and teams you belong to."
          checked={showGroups}
          onChange={setShowGroups}
        />

        <SaveButton
          onClick={handleSave}
          saved={saved}
        />
      </section>
    );
  };

  const renderCommunication =
    (): React.JSX.Element => {
      return (
        <section className="organization-settings-card">
          <div className="organization-settings-card__header">
            <div>
              <span className="organization-settings-kicker">
                Communication
              </span>

              <h2>Member communication</h2>

              <p>
                Choose how you interact with other
                organization members.
              </p>
            </div>
          </div>

          <ToggleRow
            title="Allow direct messages"
            description="Allow other organization members to contact you through Fockis."
            checked={allowMemberMessages}
            onChange={setAllowMemberMessages}
          />

          <ToggleRow
            title="Group communication"
            description="Receive communication from groups you belong to."
            checked={groupNotifications}
            onChange={setGroupNotifications}
          />

          <ToggleRow
            title="Team communication"
            description="Receive communication from your teams or departments."
            checked={teamNotifications}
            onChange={setTeamNotifications}
          />

          <div className="organization-settings-actions">
            <Link
              to="/messages"
              className="organization-settings-button organization-settings-button--primary"
            >
              Open Messages
            </Link>
          </div>

          <SaveButton
            onClick={handleSave}
            saved={saved}
          />
        </section>
      );
    };

  const renderGroups = (): React.JSX.Element => {
    return (
      <section className="organization-settings-card">
        <div className="organization-settings-card__header">
          <div>
            <span className="organization-settings-kicker">
              Groups & teams
            </span>

            <h2>Groups and teams</h2>

            <p>
              Manage how Fockis handles your group,
              department, team, or community participation.
            </p>
          </div>
        </div>

        <ToggleRow
          title="Group notifications"
          description="Receive updates from groups you belong to."
          checked={groupNotifications}
          onChange={setGroupNotifications}
        />

        <ToggleRow
          title="Team notifications"
          description="Receive updates from teams or departments you belong to."
          checked={teamNotifications}
          onChange={setTeamNotifications}
        />

        <ToggleRow
          title="Show my groups"
          description="Display your organization groups on your member profile."
          checked={showGroups}
          onChange={setShowGroups}
        />

        <div className="organization-settings-actions">
          <Link
            to="/organizations"
            className="organization-settings-button organization-settings-button--primary"
          >
            Explore Organization
          </Link>
        </div>

        <SaveButton
          onClick={handleSave}
          saved={saved}
        />
      </section>
    );
  };

  const renderEvents = (): React.JSX.Element => {
    return (
      <section className="organization-settings-card">
        <div className="organization-settings-card__header">
          <div>
            <span className="organization-settings-kicker">
              Events
            </span>

            <h2>Event preferences</h2>

            <p>
              Control event reminders and organization
              activity notifications.
            </p>
          </div>
        </div>

        <ToggleRow
          title="Event notifications"
          description="Receive notifications about organization events."
          checked={eventNotifications}
          onChange={setEventNotifications}
        />

        <ToggleRow
          title="Event reminders"
          description="Receive reminders before events you are attending."
          checked={eventReminders}
          onChange={setEventReminders}
        />

        <div className="organization-settings-actions">
          <Link
            to="/events"
            className="organization-settings-button organization-settings-button--primary"
          >
            Browse Events
          </Link>

          <Link
            to="/events/my-rsvps"
            className="organization-settings-button organization-settings-button--secondary"
          >
            My RSVPs
          </Link>
        </div>

        <SaveButton
          onClick={handleSave}
          saved={saved}
        />
      </section>
    );
  };

  const renderAttendance =
    (): React.JSX.Element => {
      return (
        <section className="organization-settings-card">
          <div className="organization-settings-card__header">
            <div>
              <span className="organization-settings-kicker">
                Attendance
              </span>

              <h2>Attendance preferences</h2>

              <p>
                Manage how attendance information is
                handled for your organization membership.
              </p>
            </div>
          </div>

          <ToggleRow
            title="Allow attendance tracking"
            description="Allow your organization to record your participation."
            checked={attendanceTracking}
            onChange={setAttendanceTracking}
          />

          <ToggleRow
            title="Keep attendance private"
            description="Prevent other members from viewing your attendance history."
            checked={attendancePrivate}
            onChange={setAttendancePrivate}
          />

          <SaveButton
            onClick={handleSave}
            saved={saved}
          />
        </section>
      );
    };

  const renderMedia = (): React.JSX.Element => {
    return (
      <section className="organization-settings-card">
        <div className="organization-settings-card__header">
          <div>
            <span className="organization-settings-kicker">
              Media
            </span>

            <h2>Organization media</h2>

            <p>
              Manage notifications related to videos,
              photos, livestreams, and other organization
              media.
            </p>
          </div>
        </div>

        <ToggleRow
          title="Media access notifications"
          description="Notify me when new organization media becomes available to me."
          checked={mediaAccessNotifications}
          onChange={setMediaAccessNotifications}
        />

        <ToggleRow
          title="Livestream notifications"
          description="Notify me when an organization livestream becomes available."
          checked={mediaNotifications}
          onChange={setMediaNotifications}
        />

        <div className="organization-settings-actions">
          <Link
            to="/organizations"
            className="organization-settings-button organization-settings-button--primary"
          >
            Explore Organization
          </Link>
        </div>

        <SaveButton
          onClick={handleSave}
          saved={saved}
        />
      </section>
    );
  };

  const renderSecurity =
    (): React.JSX.Element => {
      return (
        <section className="organization-settings-card">
          <div className="organization-settings-card__header">
            <div>
              <span className="organization-settings-kicker">
                Security
              </span>

              <h2>Account security</h2>

              <p>
                Organization membership security is
                connected to your Fockis account.
              </p>
            </div>
          </div>

          <div className="organization-settings-security-grid">
            <div className="organization-settings-security-card">
              <span>◆</span>

              <strong>Password</strong>

              <p>
                Manage your Fockis account password.
              </p>

              <Link to="/profile">
                Manage
              </Link>
            </div>

            <div className="organization-settings-security-card">
              <span>◇</span>

              <strong>Account sessions</strong>

              <p>
                Review devices and sessions connected to
                your account.
              </p>

              <Link to="/profile">
                Review
              </Link>
            </div>

            <div className="organization-settings-security-card">
              <span>◈</span>

              <strong>Membership security</strong>

              <p>
                Organization administrators control
                organization-level membership permissions.
              </p>

              <Link
                to={
                  organizationId
                    ? `/organizations/${encodeURIComponent(
                        organizationId,
                      )}`
                    : "/organizations"
                }
              >
                View
              </Link>
            </div>
          </div>
        </section>
      );
    };

  const renderDanger = (): React.JSX.Element => {
    return (
      <section className="organization-settings-card organization-settings-card--danger">
        <div className="organization-settings-card__header">
          <div>
            <span className="organization-settings-kicker organization-settings-kicker--danger">
              Danger zone
            </span>

            <h2>Membership actions</h2>

            <p>
              These actions can affect your relationship
              with an organization.
            </p>
          </div>
        </div>

        <div className="organization-settings-danger-section">
          <div>
            <h3>Leave organization</h3>

            <p>
              Remove your membership from the current
              organization. This does not delete your Fockis
              account.
            </p>
          </div>

          {currentMembership?.isOwner ? (
            <div className="organization-settings-owner-warning">
              <strong>
                Organization owner
              </strong>

              <span>
                The organization owner cannot leave the
                organization. Transfer ownership or recover
                another administrator first.
              </span>
            </div>
          ) : (
            <button
              type="button"
              className="organization-settings-button organization-settings-button--danger"
              onClick={handleOpenLeaveModal}
              disabled={
                loadingMembership ||
                !currentMembership
              }
            >
              Leave Organization
            </button>
          )}
        </div>

        <div className="organization-settings-danger-section organization-settings-danger-section--account">
          <div>
            <h3>Delete Fockis account</h3>

            <p>
              Account deletion is different from leaving an
              organization and affects your entire Fockis
              account.
            </p>
          </div>

          <Link
            to="/profile"
            className="organization-settings-button organization-settings-button--danger"
          >
            Manage Account
          </Link>
        </div>
      </section>
    );
  };

  const renderContent = (): React.JSX.Element => {
    switch (tab) {
      case "overview":
        return renderOverview();

      case "account":
        return renderAccount();

      case "organization":
        return renderOrganization();

      case "notifications":
        return renderNotifications();

      case "privacy":
        return renderPrivacy();

      case "communication":
        return renderCommunication();

      case "groups":
        return renderGroups();

      case "events":
        return renderEvents();

      case "attendance":
        return renderAttendance();

      case "media":
        return renderMedia();

      case "security":
        return renderSecurity();

      case "danger":
        return renderDanger();

      default:
        return renderOverview();
    }
  };

  const tabs: Array<{
    id: SettingsTab;
    label: string;
    description: string;
    icon: string;
  }> = [
    {
      id: "overview",
      label: "Overview",
      description: "Settings overview",
      icon: "⌂",
    },
    {
      id: "account",
      label: "Account",
      description: "Your Fockis account",
      icon: "○",
    },
    {
      id: "organization",
      label: "Organization",
      description: "Membership and role",
      icon: "◈",
    },
    {
      id: "notifications",
      label: "Notifications",
      description: "Alerts and reminders",
      icon: "◉",
    },
    {
      id: "privacy",
      label: "Privacy",
      description: "Visibility controls",
      icon: "◇",
    },
    {
      id: "communication",
      label: "Communication",
      description: "Messages and contact",
      icon: "◎",
    },
    {
      id: "groups",
      label: "Groups & Teams",
      description: "Groups and departments",
      icon: "◌",
    },
    {
      id: "events",
      label: "Events",
      description: "Events and RSVPs",
      icon: "□",
    },
    {
      id: "attendance",
      label: "Attendance",
      description: "Participation records",
      icon: "✓",
    },
    {
      id: "media",
      label: "Media",
      description: "Media and livestreams",
      icon: "▷",
    },
    {
      id: "security",
      label: "Security",
      description: "Account protection",
      icon: "◆",
    },
    {
      id: "danger",
      label: "Danger Zone",
      description: "Membership actions",
      icon: "!",
    },
  ];

  return (
    <div className="organization-member-settings">
      <ChurchHeader />

      <main className="organization-settings-page">
        {/* ================================================================
            HERO
        ================================================================ */}

        <section className="organization-settings-hero">
          <div className="organization-settings-hero__inner">
            <div className="organization-settings-hero__icon">
              {organizationPresentation.icon}
            </div>

            <div className="organization-settings-hero__content">
              <span className="organization-settings-kicker">
                Fockis Organization
              </span>

              <h1>Member Settings</h1>

              <p>
                Manage your account, membership,
                notifications, privacy, communication,
                events, groups, media, and security.
              </p>

              <div className="organization-settings-hero__meta">
                <span>
                  {organizationPresentation.icon}
                </span>

                <strong>
                  {organizationPresentation.label}
                </strong>

                <span className="organization-settings-hero__dot">
                  •
                </span>

                <span>
                  Member settings
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SETTINGS BODY
        ================================================================ */}

        <section className="organization-settings-layout">
          {/* ==============================================================
              MOBILE TAB SELECTOR
          ============================================================== */}

          <div className="organization-settings-mobile-nav">
            <label htmlFor="organization-settings-select">
              Settings section
            </label>

            <select
              id="organization-settings-select"
              value={tab}
              onChange={(event) =>
                setTab(
                  event.target
                    .value as SettingsTab,
                )
              }
            >
              {tabs.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {/* ==============================================================
              SIDEBAR
          ============================================================== */}

          <aside className="organization-settings-sidebar">
            <div className="organization-settings-sidebar__top">
              <span className="organization-settings-sidebar__label">
                SETTINGS
              </span>

              <strong>
                My Organization
              </strong>
            </div>

            <nav
              className="organization-settings-nav"
              aria-label="Organization member settings"
            >
              {tabs.map((item) => {
                const active =
                  tab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`organization-settings-nav__item ${
                      active
                        ? "organization-settings-nav__item--active"
                        : ""
                    } ${
                      item.id === "danger"
                        ? "organization-settings-nav__item--danger"
                        : ""
                    }`}
                    onClick={() =>
                      setTab(item.id)
                    }
                  >
                    <span className="organization-settings-nav__icon">
                      {item.icon}
                    </span>

                    <span className="organization-settings-nav__text">
                      <strong>
                        {item.label}
                      </strong>

                      <small>
                        {item.description}
                      </small>
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* ==============================================================
              CONTENT
          ============================================================== */}

          <div className="organization-settings-content">
            {renderContent()}
          </div>
        </section>
      </main>

      {/* ================================================================
          LEAVE ORGANIZATION MODAL
      ================================================================ */}

      {leaveModalOpen && (
        <LeaveOrganizationModal
          organizationName={
            organizationName
          }
          leaving={leavingOrganization}
          onCancel={() => {
            if (!leavingOrganization) {
              setLeaveModalOpen(false);
            }
          }}
          onConfirm={
            handleConfirmLeaveOrganization
          }
        />
      )}
    </div>
  );
}