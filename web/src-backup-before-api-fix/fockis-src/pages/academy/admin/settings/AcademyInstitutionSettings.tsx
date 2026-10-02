import React, { useState } from "react";
import {
  Building2,
  Globe,
  Phone,
  MapPin,
  Palette,
  Save,
} from "lucide-react";

export default function AcademyInstitutionSettings() {
  const [academyName, setAcademyName] =
    useState("FAFockis Academy");

  const [website, setWebsite] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [address, setAddress] =
    useState("");

  return (
    <section>
      <div className="academy-settings-section-header">
        <div>
          <h2>
            <Building2 size={22} />
            Institution
          </h2>

          <p>
            Manage Academy-wide identity and contact
            information.
          </p>
        </div>
      </div>

      <div className="academy-settings-form">
        <label>
          <span>Academy Name</span>

          <div className="academy-settings-input-icon">
            <Building2 size={18} />

            <input
              value={academyName}
              onChange={(e) =>
                setAcademyName(e.target.value)
              }
            />
          </div>
        </label>

        <label>
          <span>Website</span>

          <div className="academy-settings-input-icon">
            <Globe size={18} />

            <input
              value={website}
              onChange={(e) =>
                setWebsite(e.target.value)
              }
              placeholder="https://..."
            />
          </div>
        </label>

        <label>
          <span>Contact Phone</span>

          <div className="academy-settings-input-icon">
            <Phone size={18} />

            <input
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value)
              }
            />
          </div>
        </label>

        <label>
          <span>Address</span>

          <div className="academy-settings-input-icon">
            <MapPin size={18} />

            <input
              value={address}
              onChange={(e) =>
                setAddress(e.target.value)
              }
            />
          </div>
        </label>

        <button
          type="button"
          className="academy-primary-button"
        >
          <Save size={18} />
          Save Institution Settings
        </button>
      </div>
    </section>
  );
}