import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { createGroup } from "../api/groupsApi";

import {
GroupType,
type CreateGroupInput,
} from "../types/church.types";

import { useFockisTranslation } from "../../../i18n/useFockisTranslation";
import { t as translate } from "../../../i18n";

import "../styles/ChurchAdmin.scss";

/* ============================================================================

HELPERS
========================================================================== */

function getErrorMessage(
error: unknown,
fallbackMessage: string,
): string {
if (error instanceof Error) {
const message = error.message.trim();

if (message) {
  return message;
}

}

if (
typeof error === "object" &&
error !== null &&
"message" in error
) {
const message = (
error as {
message?: unknown;
}
).message;

if (typeof message === "string") {
  const trimmedMessage = message.trim();

  if (trimmedMessage) {
    return trimmedMessage;
  }
}

if (Array.isArray(message)) {
  const messages = message
    .filter(
      (item): item is string =>
        typeof item === "string",
    )
    .map((item) => item.trim())
    .filter(Boolean);

  if (messages.length > 0) {
    return messages.join(", ");
  }
}

}

return fallbackMessage;
}

function isValidObjectId(
value: string,
): boolean {
return /^[a-fA-F0-9]{24}$/.test(
value.trim(),
);
}

/* ============================================================================

COMPONENT
========================================================================== */

export default function CreateGroupForm(): React.JSX.Element {
const navigate = useNavigate();

const { t } = useFockisTranslation();

const params = useParams<{
organizationId?: string;
}>();

const organizationId =
params.organizationId?.trim() ?? "";

const [name, setName] = useState("");

const [groupType, setGroupType] =
useState<GroupType>(
GroupType.SmallGroup,
);

const [description, setDescription] =
useState("");

const [photoUrl, setPhotoUrl] =
useState("");

const [departmentId, setDepartmentId] =
useState("");

const [
meetingSchedule,
setMeetingSchedule,
] = useState("");

const [location, setLocation] =
useState("");

const [capacity, setCapacity] =
useState("");

const [isSaving, setIsSaving] =
useState(false);

const [error, setError] =
useState<string | null>(null);

const [successMessage, setSuccessMessage] =
useState<string | null>(null);

/* ==========================================================================

NAVIGATION
======================================================================== */

const navigateToGroups = (): void => {
if (!organizationId) {
navigate("/church/organizations");
return;
}

navigate(
  `/church/organizations/${encodeURIComponent(
    organizationId,
  )}/groups`,
);

};

/* ==========================================================================

SUBMIT
======================================================================== */

const handleSubmit = async (
event: React.FormEvent<HTMLFormElement>,
): Promise<void> => {
event.preventDefault();

setError(null);
setSuccessMessage(null);

/* ------------------------------------------------------------------------
 * ORGANIZATION VALIDATION
 * ---------------------------------------------------------------------- */

if (!isValidObjectId(organizationId)) {
  setError(
    t(
      "church.createGroup.errors.organizationId",
    ),
  );

  return;
}

/* ------------------------------------------------------------------------
 * NAME VALIDATION
 * ---------------------------------------------------------------------- */

const trimmedName = name.trim();

if (!trimmedName) {
  setError(
    t(
      "church.createGroup.errors.groupName",
    ),
  );

  return;
}

/* ------------------------------------------------------------------------
 * CAPACITY VALIDATION
 * ---------------------------------------------------------------------- */

let parsedCapacity:
  | number
  | undefined;

if (capacity.trim()) {
  const value = Number(
    capacity.trim(),
  );

  if (
    !Number.isInteger(value) ||
    value < 1
  ) {
    setError(
      t(
        "church.createGroup.errors.capacity",
      ),
    );

    return;
  }

  parsedCapacity = value;
}

/* ------------------------------------------------------------------------
 * BACKEND PAYLOAD
 *
 * User-entered values are intentionally NOT translated.
 * They are organization data and must be sent exactly as entered.
 * ---------------------------------------------------------------------- */

const payload: CreateGroupInput = {
  organizationId,
  name: trimmedName,
  groupType,

  ...(departmentId.trim()
    ? {
        departmentId:
          departmentId.trim(),
      }
    : {}),

  ...(description.trim()
    ? {
        description:
          description.trim(),
      }
    : {}),

  ...(photoUrl.trim()
    ? {
        photoUrl:
          photoUrl.trim(),
      }
    : {}),

  ...(meetingSchedule.trim()
    ? {
        meetingSchedule:
          meetingSchedule.trim(),
      }
    : {}),

  ...(location.trim()
    ? {
        location:
          location.trim(),
      }
    : {}),

  ...(parsedCapacity !== undefined
    ? {
        capacity:
          parsedCapacity,
      }
    : {}),
};

setIsSaving(true);

/* ------------------------------------------------------------------------
 * CREATE GROUP
 * ---------------------------------------------------------------------- */

try {
  const createdGroup =
    await createGroup(payload);

  setSuccessMessage(
    t(
      "church.createGroup.success",
    ),
  );

  /*
   * Navigate using the REAL group ID returned
   * by the backend.
   */
  if (createdGroup?.id) {
    window.setTimeout(() => {
      navigate(
        `/church/organizations/${encodeURIComponent(
          organizationId,
        )}/groups/${encodeURIComponent(
          createdGroup.id,
        )}`,
      );
    }, 500);
  } else {
    window.setTimeout(() => {
      navigateToGroups();
    }, 500);
  }
} catch (err) {
  const fallbackMessage =
    translate(
      "church.createGroup.errors.generic",
    );

  setError(
    getErrorMessage(
      err,
      fallbackMessage,
    ),
  );
} finally {
  setIsSaving(false);
}

};

/* ==========================================================================

RENDER
======================================================================== */

return (
<div className="church-admin-page">
<div className="church-admin-container">
{/* ==================================================================
HEADER
================================================================== */}

    <header className="church-admin-header">
      <div>
        <span className="church-admin-eyebrow">
          {t("church.navigation.brand")}
        </span>

        <h1>
          {t(
            "church.createGroup.title",
          )}
        </h1>

        <p>
          {t(
            "church.createGroup.description",
          )}
        </p>
      </div>

      <button
        type="button"
        className="church-admin-btn church-admin-btn--ghost"
        onClick={navigateToGroups}
        disabled={isSaving}
      >
        {t("church.createGroup.cancel")}
      </button>
    </header>

    {/* ==================================================================
        ERROR
    ================================================================== */}

    {error && (
      <div
        className="church-admin-alert church-admin-alert--error"
        role="alert"
      >
        {error}
      </div>
    )}

    {/* ==================================================================
        SUCCESS
    ================================================================== */}

    {successMessage && (
      <div
        className="church-admin-alert church-admin-alert--success"
        role="status"
      >
        {successMessage}
      </div>
    )}

    {/* ==================================================================
        FORM
    ================================================================== */}

    <form
      className="church-admin-form"
      onSubmit={handleSubmit}
    >
      {/* ================================================================
          GROUP INFORMATION
      ================================================================= */}

      <section className="church-admin-panel">
        <h2>
          {t(
            "church.createGroup.groupInformation",
          )}
        </h2>

        <p className="church-admin-hint">
          {t(
            "church.createGroup.groupInformationHint",
          )}
        </p>

        {/* ==============================================================
            NAME
        =============================================================== */}

        <label className="church-admin-field">
          <span>
            {t(
              "church.createGroup.groupName",
            )}{" "}
            {t(
              "church.createGroup.groupNameRequired",
            )}
          </span>

          <input
            className="church-admin-input"
            type="text"
            value={name}
            onChange={(event) =>
              setName(
                event.target.value,
              )
            }
            placeholder={t(
              "church.createGroup.groupNamePlaceholder",
            )}
            required
            disabled={isSaving}
            autoComplete="off"
          />
        </label>

        {/* ==============================================================
            GROUP TYPE
        =============================================================== */}

        <label className="church-admin-field">
          <span>
            {t(
              "church.createGroup.groupType",
            )}{" "}
            {t(
              "church.createGroup.groupTypeRequired",
            )}
          </span>

          <select
            className="church-admin-select"
            value={groupType}
            onChange={(event) =>
              setGroupType(
                event.target
                  .value as GroupType,
              )
            }
            required
            disabled={isSaving}
          >
            {Object.values(
              GroupType,
            ).map((type) => (
              <option
                key={type}
                value={type}
              >
                {t(
                  `church.group.types.${type}`,
                )}
              </option>
            ))}
          </select>
        </label>

        {/* ==============================================================
            DESCRIPTION
        =============================================================== */}

        <label className="church-admin-field">
          <span>
            {t(
              "church.createGroup.descriptionLabel",
            )}
          </span>

          <textarea
            className="church-admin-textarea"
            rows={5}
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value,
              )
            }
            placeholder={t(
              "church.createGroup.descriptionPlaceholder",
            )}
            disabled={isSaving}
          />
        </label>

        {/* ==============================================================
            PHOTO
        =============================================================== */}

        <label className="church-admin-field">
          <span>
            {t(
              "church.createGroup.groupPhotoUrl",
            )}
          </span>

          <input
            className="church-admin-input"
            type="url"
            value={photoUrl}
            onChange={(event) =>
              setPhotoUrl(
                event.target.value,
              )
            }
            placeholder={t(
              "church.createGroup.groupPhotoUrlPlaceholder",
            )}
            disabled={isSaving}
            autoComplete="url"
          />
        </label>
      </section>

      {/* ================================================================
          GROUP DETAILS
      ================================================================= */}

      <section className="church-admin-panel">
        <h2>
          {t(
            "church.createGroup.groupDetails",
          )}
        </h2>

        {/* ==============================================================
            DEPARTMENT
        =============================================================== */}

        <label className="church-admin-field">
          <span>
            {t(
              "church.createGroup.departmentId",
            )}
          </span>

          <input
            className="church-admin-input"
            type="text"
            value={departmentId}
            onChange={(event) =>
              setDepartmentId(
                event.target.value,
              )
            }
            placeholder={t(
              "church.createGroup.departmentIdPlaceholder",
            )}
            disabled={isSaving}
            autoComplete="off"
          />

          <small>
            {t(
              "church.createGroup.departmentHint",
            )}
          </small>
        </label>

        {/* ==============================================================
            MEETING SCHEDULE
        =============================================================== */}

        <label className="church-admin-field">
          <span>
            {t(
              "church.createGroup.meetingSchedule",
            )}
          </span>

          <input
            className="church-admin-input"
            type="text"
            value={meetingSchedule}
            onChange={(event) =>
              setMeetingSchedule(
                event.target.value,
              )
            }
            placeholder={t(
              "church.createGroup.meetingSchedulePlaceholder",
            )}
            disabled={isSaving}
          />
        </label>

        {/* ==============================================================
            LOCATION
        =============================================================== */}

        <label className="church-admin-field">
          <span>
            {t(
              "church.createGroup.meetingLocation",
            )}
          </span>

          <input
            className="church-admin-input"
            type="text"
            value={location}
            onChange={(event) =>
              setLocation(
                event.target.value,
              )
            }
            placeholder={t(
              "church.createGroup.meetingLocationPlaceholder",
            )}
            disabled={isSaving}
          />
        </label>

        {/* ==============================================================
            CAPACITY
        =============================================================== */}

        <label className="church-admin-field">
          <span>
            {t(
              "church.createGroup.capacity",
            )}{" "}
            {t(
              "church.createGroup.capacityOptional",
            )}
          </span>

          <input
            className="church-admin-input"
            type="number"
            min={1}
            step={1}
            value={capacity}
            onChange={(event) =>
              setCapacity(
                event.target.value,
              )
            }
            placeholder={t(
              "church.createGroup.capacityOptional",
            )}
            disabled={isSaving}
            inputMode="numeric"
          />

          <small>
            {t(
              "church.createGroup.capacityHint",
            )}
          </small>
        </label>
      </section>

      {/* ================================================================
          ACTIONS
      ================================================================= */}

      <div className="church-admin-form-actions">
        <button
          type="button"
          className="church-admin-btn church-admin-btn--ghost"
          onClick={navigateToGroups}
          disabled={isSaving}
        >
          {t("church.createGroup.cancel")}
        </button>

        <button
          type="submit"
          className="church-admin-btn church-admin-btn--primary"
          disabled={isSaving}
        >
          {isSaving
            ? t(
                "church.createGroup.creating",
              )
            : t(
                "church.createGroup.create",
              )}
        </button>
      </div>
    </form>
  </div>
</div>

);
}