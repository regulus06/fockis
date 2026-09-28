import React, { useState } from "react";
import {
  SlidersHorizontal,
  GraduationCap,
  BookOpen,
  Briefcase,
  Bell,
} from "lucide-react";

interface ToggleProps {
  title: string;
  description: string;
  enabled: boolean;
  onChange: () => void;
  icon: React.ReactNode;
}

function Toggle({
  title,
  description,
  enabled,
  onChange,
  icon,
}: ToggleProps) {
  return (
    <div className="academy-platform-setting">
      <div className="academy-platform-icon">
        {icon}
      </div>

      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <button
        type="button"
        onClick={onChange}
        className={
          enabled
            ? "academy-toggle enabled"
            : "academy-toggle"
        }
      >
        {enabled ? "ON" : "OFF"}
      </button>
    </div>
  );
}

export default function AcademyPlatformSettings() {
  const [admissions, setAdmissions] =
    useState(true);

  const [lms, setLms] =
    useState(true);

  const [careers, setCareers] =
    useState(true);

  const [notifications, setNotifications] =
    useState(true);

  return (
    <section>
      <div className="academy-settings-section-header">
        <div>
          <h2>
            <SlidersHorizontal size={22} />
            Platform
          </h2>

          <p>
            Control Academy platform features.
          </p>
        </div>
      </div>

      <div className="academy-platform-list">
        <Toggle
          title="Admissions"
          description="Allow applicants to submit Academy applications."
          enabled={admissions}
          onChange={() =>
            setAdmissions(!admissions)
          }
          icon={<GraduationCap size={20} />}
        />

        <Toggle
          title="LMS"
          description="Enable online courses, modules and learning content."
          enabled={lms}
          onChange={() => setLms(!lms)}
          icon={<BookOpen size={20} />}
        />

        <Toggle
          title="Careers"
          description="Enable Academy career and job listings."
          enabled={careers}
          onChange={() =>
            setCareers(!careers)
          }
          icon={<Briefcase size={20} />}
        />

        <Toggle
          title="Notifications"
          description="Enable Academy system notifications."
          enabled={notifications}
          onChange={() =>
            setNotifications(!notifications)
          }
          icon={<Bell size={20} />}
        />
      </div>
    </section>
  );
}