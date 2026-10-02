import React, { useState } from "react";
import adminUsersApi from "../adminUsersApi";
import type { AdminUser } from "../types/adminUsers.types";

interface UserActionsProps {
user: AdminUser;
onUpdated?: (user: AdminUser) => void;
onDeleted?: () => void;
disabled?: boolean;
}

const UserActions: React.FC<UserActionsProps> = ({
user,
onUpdated,
disabled = false,
}) => {
const [loading, setLoading] = useState(false);
const [open, setOpen] = useState(false);

const userId = user._id ?? user.id;

const runAction = async (
action: () => Promise<AdminUser>,
successMessage?: string,
) => {
if (loading || disabled) {
return;
}

setLoading(true);

try {
  const updatedUser = await action();

  onUpdated?.(updatedUser);

  if (successMessage) {
    window.alert(successMessage);
  }

  setOpen(false);
} catch (error) {
  window.alert(
    error instanceof Error
      ? error.message
      : "Unable to complete this administrator action.",
  );
} finally {
  setLoading(false);
}

};

const handleToggleStatus = () => {
const nextStatus =
user.isActive === false
? "active"
: "suspended";

void runAction(
  () =>
    adminUsersApi.updateStatus(userId, {
      status: nextStatus,
    }),
  nextStatus === "active"
    ? "User account activated."
    : "User account suspended.",
);

};

const handleToggleVerification = () => {
const nextVerifiedState = !Boolean(user.verified);

void runAction(
  () =>
    adminUsersApi.updateVerification(userId, {
      verified: nextVerifiedState,
    }),
  nextVerifiedState
    ? "User verified."
    : "User verification removed.",
);

};

const handleTogglePremium = () => {
const nextPremiumState = !Boolean(user.premium);

void runAction(
  () =>
    adminUsersApi.updatePremium(userId, {
      premium: nextPremiumState,
    }),
  nextPremiumState
    ? "Premium access granted."
    : "Premium access removed.",
);

};

const handleToggleFockisIdAccess = () => {
const nextAccessState =
!Boolean(user.fockisIdAccessPaid);

void runAction(
  () =>
    adminUsersApi.updateFockisIdAccess(userId, {
      fockisIdAccessPaid: nextAccessState,
    }),
  nextAccessState
    ? "Fockis ID access granted."
    : "Fockis ID access removed.",
);

};

const handleLock = () => {
const reason = window.prompt(
"Enter a reason for locking this account:",
);

if (reason === null) {
  return;
}

void runAction(
  () => adminUsersApi.lockUser(userId, reason),
  "User account locked.",
);

};

const handleUnlock = () => {
void runAction(
() => adminUsersApi.unlockUser(userId),
"User account unlocked.",
);
};

const handleForcePasswordChange = () => {
const confirmed = window.confirm(
"Force this user to change their password at the next login?",
);

if (!confirmed) {
  return;
}

void runAction(
  () =>
    adminUsersApi.forcePasswordChange(userId),
  "Password change has been required.",
);

};

const handleResetPassword = async () => {
if (loading || disabled) {
return;
}

const confirmed = window.confirm(
  "Reset this user's password? The secure administrator reset flow will be used.",
);

if (!confirmed) {
  return;
}

setLoading(true);

try {
  const result =
    await adminUsersApi.resetPassword(userId);

  window.alert(
    result.message ??
      "Password reset initiated successfully.",
  );

  setOpen(false);
} catch (error) {
  window.alert(
    error instanceof Error
      ? error.message
      : "Unable to reset the user's password.",
  );
} finally {
  setLoading(false);
}

};

const lockedUntil =
"lockedUntil" in user
? (
user as AdminUser & {
lockedUntil?: string | null;
}
).lockedUntil
: null;

const isLocked =
typeof lockedUntil === "string" &&
lockedUntil.length > 0 &&
!Number.isNaN(
new Date(lockedUntil).getTime(),
) &&
new Date(lockedUntil).getTime() > Date.now();

return ( <div className="admin-user-actions">
<button
type="button"
className="admin-user-actions__primary"
onClick={() => setOpen((current) => !current)}
disabled={disabled || loading}
aria-expanded={open}
aria-haspopup="menu"
>
{loading ? "Working..." : "Actions"} <span aria-hidden="true">▾</span> </button>

  {open && !loading && (
    <div
      className="admin-user-actions__menu"
      role="menu"
    >
      <button
        type="button"
        role="menuitem"
        onClick={handleToggleStatus}
      >
        {user.isActive === false
          ? "Activate account"
          : "Suspend account"}
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={handleToggleVerification}
      >
        {user.verified
          ? "Remove verification"
          : "Verify user"}
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={handleTogglePremium}
      >
        {user.premium
          ? "Remove premium"
          : "Grant premium"}
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={handleToggleFockisIdAccess}
      >
        {user.fockisIdAccessPaid
          ? "Remove Fockis ID access"
          : "Grant Fockis ID access"}
      </button>

      <div
        className="admin-user-actions__divider"
        role="separator"
      />

      {isLocked ? (
        <button
          type="button"
          role="menuitem"
          onClick={handleUnlock}
        >
          Unlock account
        </button>
      ) : (
        <button
          type="button"
          role="menuitem"
          onClick={handleLock}
        >
          Lock account
        </button>
      )}

      <button
        type="button"
        role="menuitem"
        onClick={handleForcePasswordChange}
      >
        Force password change
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={handleResetPassword}
      >
        Reset password
      </button>

      <div
        className="admin-user-actions__divider"
        role="separator"
      />

      <button
        type="button"
        role="menuitem"
        className="admin-user-actions__close"
        onClick={() => setOpen(false)}
      >
        Close
      </button>
    </div>
  )}

  {open && (
    <button
      type="button"
      className="admin-user-actions__backdrop"
      aria-label="Close actions"
      onClick={() => setOpen(false)}
    />
  )}
</div>

);
};

export default UserActions;
