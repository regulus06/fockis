import React, { useState } from "react";
import {
  User,
  Mail,
  KeyRound,
  IdCard,
  LogOut,
  Save,
} from "lucide-react";

import {
  AcademyUser,
  logout,
} from "../../../../lib/academyApi";

interface Props {
  user: AcademyUser | null;
}

export default function AcademyAccountSettings({
  user,
}: Props) {
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");

  React.useEffect(() => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
  }, [user]);

  const handleSave = async () => {
    console.log("Save account information", {
      name,
      email,
    });

    // Backend endpoint will be connected here.
  };

  return (
    <section>
      <div className="academy-settings-section-header">
        <div>
          <h2>
            <User size={22} />
            Account
          </h2>

          <p>
            Manage your Academy administrator account.
          </p>
        </div>
      </div>

      <div className="academy-settings-form">
        <label>
          <span>Name</span>

          <div className="academy-settings-input-icon">
            <User size={18} />

            <input
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Full name"
            />
          </div>
        </label>

        <label>
          <span>Email</span>

          <div className="academy-settings-input-icon">
            <Mail size={18} />

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="Email address"
            />
          </div>
        </label>

        <div className="academy-settings-readonly">
          <div>
            <IdCard size={18} />

            <div>
              <strong>Account ID</strong>
              <span>
                {user?.id ?? "Loading..."}
              </span>
            </div>
          </div>
        </div>

        <div className="academy-settings-readonly">
          <div>
            <KeyRound size={18} />

            <div>
              <strong>Academy Role</strong>
              <span>
                {user?.role ?? "Loading..."}
              </span>
            </div>
          </div>
        </div>

        <div className="academy-settings-actions">
          <button
            type="button"
            onClick={handleSave}
            className="academy-primary-button"
          >
            <Save size={18} />
            Save Changes
          </button>

          <button
            type="button"
            onClick={logout}
            className="academy-secondary-button"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </div>
    </section>
  );
}