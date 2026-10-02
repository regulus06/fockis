import React, { useState } from "react";
import {
  Shield,
  KeyRound,
  Smartphone,
  Monitor,
  LogOut,
  History,
  Activity,
} from "lucide-react";

export default function AcademySecuritySettings() {
  const [twoFactorEnabled, setTwoFactorEnabled] =
    useState(false);

  const [showPasswordForm, setShowPasswordForm] =
    useState(false);

  return (
    <section>
      <div className="academy-settings-section-header">
        <div>
          <h2>
            <Shield size={22} />
            Security
          </h2>

          <p>
            Protect your Academy administrator account.
          </p>
        </div>
      </div>

      <div className="academy-security-list">
        <div className="academy-security-item">
          <div className="academy-security-icon">
            <KeyRound size={20} />
          </div>

          <div>
            <h3>Change Password</h3>
            <p>
              Change the password for your Academy account.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowPasswordForm(
                !showPasswordForm,
              )
            }
          >
            Change
          </button>
        </div>

        {showPasswordForm && (
          <div className="academy-password-form">
            <input
              type="password"
              placeholder="Current password"
            />

            <input
              type="password"
              placeholder="New password"
            />

            <input
              type="password"
              placeholder="Confirm new password"
            />

            <button type="button">
              Update Password
            </button>
          </div>
        )}

        <div className="academy-security-item">
          <div className="academy-security-icon">
            <Monitor size={20} />
          </div>

          <div>
            <h3>Active Sessions</h3>
            <p>
              View devices currently signed into your
              Academy account.
            </p>
          </div>

          <button type="button">
            View
          </button>
        </div>

        <div className="academy-security-item">
          <div className="academy-security-icon">
            <LogOut size={20} />
          </div>

          <div>
            <h3>Sign Out All Sessions</h3>
            <p>
              Immediately invalidate all active sessions.
            </p>
          </div>

          <button type="button">
            Sign Out
          </button>
        </div>

        <div className="academy-security-item">
          <div className="academy-security-icon">
            <Smartphone size={20} />
          </div>

          <div>
            <h3>Two-Factor Authentication</h3>
            <p>
              Require an additional verification code
              when signing in.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setTwoFactorEnabled(
                !twoFactorEnabled,
              )
            }
          >
            {twoFactorEnabled
              ? "Enabled"
              : "Enable"}
          </button>
        </div>

        <div className="academy-security-item">
          <div className="academy-security-icon">
            <History size={20} />
          </div>

          <div>
            <h3>Login History</h3>
            <p>
              Review recent Academy account logins.
            </p>
          </div>

          <button type="button">
            View
          </button>
        </div>

        <div className="academy-security-item">
          <div className="academy-security-icon">
            <Activity size={20} />
          </div>

          <div>
            <h3>Security Events</h3>
            <p>
              Review password changes, account changes,
              logins and administrative events.
            </p>
          </div>

          <button type="button">
            View
          </button>
        </div>
      </div>
    </section>
  );
}