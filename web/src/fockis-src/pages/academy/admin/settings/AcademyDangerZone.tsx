import React from "react";
import {
  AlertTriangle,
  UserX,
  Trash2,
  Wrench,
} from "lucide-react";

export default function AcademyDangerZone() {
  return (
    <section>
      <div className="academy-settings-section-header danger">
        <div>
          <h2>
            <AlertTriangle size={22} />
            Danger Zone
          </h2>

          <p>
            These operations can permanently affect
            Academy accounts and data.
          </p>
        </div>
      </div>

      <div className="academy-danger-list">
        <div className="academy-danger-item">
          <div>
            <h3>
              <UserX size={19} />
              Disable My Account
            </h3>

            <p>
              Prevent your account from signing in
              without deleting the account.
            </p>
          </div>

          <button type="button">
            Disable Account
          </button>
        </div>

        <div className="academy-danger-item">
          <div>
            <h3>
              <Trash2 size={19} />
              Delete Student Account
            </h3>

            <p>
              Permanently delete a selected student
              account.
            </p>
          </div>

          <a href="/academy/admin/students">
            Manage Students
          </a>
        </div>

        <div className="academy-danger-item">
          <div>
            <h3>
              <Trash2 size={19} />
              Delete Administrator
            </h3>

            <p>
              Permanently remove an Academy
              administrator.
            </p>
          </div>

          <a href="/academy/admin/users">
            Manage Administrators
          </a>
        </div>

        <div className="academy-danger-item">
          <div>
            <h3>
              <Wrench size={19} />
              Academy Maintenance
            </h3>

            <p>
              Administrative maintenance and system
              recovery operations.
            </p>
          </div>

          <button type="button">
            Maintenance
          </button>
        </div>
      </div>
    </section>
  );
}