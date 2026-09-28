import React, { useMemo, useState } from "react";
import { Check, Search, UserPlus, X } from "lucide-react";

import { meetingsApi } from "../services/meetingsApi";

/* ============================================================================
 * TYPES
 * ========================================================================== */

export interface InviteableUser {
  id: string;
  userId?: string;

  displayName?: string;
  name?: string;
  username?: string;
  email?: string;

  avatarUrl?: string | null;
  avatar?: string | null;

  [key: string]: unknown;
}

interface InviteUserPickerProps {
  meetingId: string;

  users: InviteableUser[];

  initialSelectedUserIds?: string[];

  onInvited?: (users: InviteableUser[]) => void;

  onClose?: () => void;

  title?: string;

  description?: string;

  submitLabel?: string;

  disabled?: boolean;
}

/* ============================================================================
 * HELPERS
 * ========================================================================== */

function getUserId(user: InviteableUser): string {
  return String(
    user.userId ??
      user.id ??
      "",
  ).trim();
}

function getUserName(user: InviteableUser): string {
  return (
    user.displayName ||
    user.name ||
    user.username ||
    user.email ||
    "Fockis User"
  );
}

function getUserEmail(user: InviteableUser): string {
  return user.email || "";
}

function getUserAvatar(
  user: InviteableUser,
): string | null {
  return (
    user.avatarUrl ||
    user.avatar ||
    null
  );
}

/* ============================================================================
 * COMPONENT
 * ========================================================================== */

export default function InviteUserPicker({
  meetingId,
  users,
  initialSelectedUserIds = [],
  onInvited,
  onClose,
  title = "Invite people",
  description = "Select people you want to invite to this meeting.",
  submitLabel = "Send invitations",
  disabled = false,
}: InviteUserPickerProps) {
  const [search, setSearch] =
    useState("");

  const [selectedIds, setSelectedIds] =
    useState<string[]>(
      initialSelectedUserIds
        .map((id) => String(id).trim())
        .filter(Boolean),
    );

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  /* --------------------------------------------------------------------------
   * FILTER USERS
   * ------------------------------------------------------------------------ */

  const filteredUsers = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((user) => {
      const name =
        getUserName(user).toLowerCase();

      const email =
        getUserEmail(user).toLowerCase();

      const username =
        String(
          user.username ?? "",
        ).toLowerCase();

      return (
        name.includes(query) ||
        email.includes(query) ||
        username.includes(query)
      );
    });
  }, [users, search]);

  /* --------------------------------------------------------------------------
   * SELECT / DESELECT USER
   * ------------------------------------------------------------------------ */

  const toggleUser = (
    user: InviteableUser,
  ) => {
    const id = getUserId(user);

    if (!id) {
      return;
    }

    setError(null);
    setSuccess(null);

    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter(
          (selectedId) =>
            selectedId !== id,
        );
      }

      return [
        ...current,
        id,
      ];
    });
  };

  /* --------------------------------------------------------------------------
   * SELECT ALL
   * ------------------------------------------------------------------------ */

  const selectAllVisible = () => {
    const visibleIds =
      filteredUsers
        .map(getUserId)
        .filter(Boolean);

    setSelectedIds((current) => {
      return Array.from(
        new Set([
          ...current,
          ...visibleIds,
        ]),
      );
    });

    setError(null);
    setSuccess(null);
  };

  /* --------------------------------------------------------------------------
   * CLEAR SELECTION
   * ------------------------------------------------------------------------ */

  const clearSelection = () => {
    setSelectedIds([]);
    setError(null);
    setSuccess(null);
  };

  /* --------------------------------------------------------------------------
   * SUBMIT INVITATIONS
   * ------------------------------------------------------------------------ */

  const handleInvite = async () => {
    setError(null);
    setSuccess(null);

    const cleanMeetingId =
      String(
        meetingId ?? "",
      ).trim();

    if (!cleanMeetingId) {
      setError(
        "Meeting ID is missing.",
      );
      return;
    }

    const cleanSelectedIds =
      Array.from(
        new Set(
          selectedIds
            .map((id) =>
              String(id).trim(),
            )
            .filter(Boolean),
        ),
      );

    if (
      cleanSelectedIds.length === 0
    ) {
      setError(
        "Select at least one person to invite.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const result =
        await meetingsApi.inviteUsersByIds(
          cleanMeetingId,
          cleanSelectedIds,
        );

      if (!result.ok) {
        setError(
          result.error ||
            "Unable to send invitations.",
        );
        return;
      }

      const invitedUsers =
        users.filter((user) =>
          cleanSelectedIds.includes(
            getUserId(user),
          ),
        );

      setSuccess(
        cleanSelectedIds.length === 1
          ? "Invitation sent successfully."
          : `${cleanSelectedIds.length} invitations sent successfully.`,
      );

      onInvited?.(invitedUsers);

      /*
       * Keep the successful selection visible briefly so
       * the user can see what happened.
       */
      setSelectedIds([]);
    } catch (err) {
      console.error(
        "[InviteUserPicker] Failed to invite users:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to send invitations.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /* --------------------------------------------------------------------------
   * RENDER
   * ------------------------------------------------------------------------ */

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 560,
        background: "#ffffff",
        borderRadius: 16,
        boxShadow:
          "0 20px 60px rgba(0,0,0,0.18)",
        overflow: "hidden",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "20px 20px 16px",
          borderBottom:
            "1px solid #e5e7eb",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 6,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#fff4e6",
                color: "#f97316",
              }}
            >
              <UserPlus
                size={20}
              />
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 700,
                color: "#111827",
              }}
            >
              {title}
            </h2>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.5,
              color: "#6b7280",
            }}
          >
            {description}
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
            style={{
              border: 0,
              background: "transparent",
              cursor: "pointer",
              color: "#6b7280",
              padding: 6,
            }}
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* SEARCH */}
      <div
        style={{
          padding: 16,
          borderBottom:
            "1px solid #f1f5f9",
        }}
      >
        <div
          style={{
            position: "relative",
          }}
        >
          <Search
            size={18}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform:
                "translateY(-50%)",
              color: "#9ca3af",
            }}
          />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Search people by name or email..."
            disabled={
              disabled ||
              isSubmitting
            }
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding:
                "11px 12px 11px 40px",
              border:
                "1px solid #d1d5db",
              borderRadius: 10,
              outline: "none",
              fontSize: 14,
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            marginTop: 12,
          }}
        >
          <span
            style={{
              fontSize: 13,
              color: "#6b7280",
            }}
          >
            {selectedIds.length} selected
          </span>

          <div
            style={{
              display: "flex",
              gap: 8,
            }}
          >
            <button
              type="button"
              onClick={
                selectAllVisible
              }
              disabled={
                disabled ||
                isSubmitting ||
                filteredUsers.length ===
                  0
              }
              style={{
                border: 0,
                background:
                  "transparent",
                color: "#f97316",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Select all
            </button>

            <button
              type="button"
              onClick={
                clearSelection
              }
              disabled={
                disabled ||
                isSubmitting ||
                selectedIds.length ===
                  0
              }
              style={{
                border: 0,
                background:
                  "transparent",
                color: "#6b7280",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* USER LIST */}
      <div
        style={{
          maxHeight: 360,
          overflowY: "auto",
        }}
      >
        {filteredUsers.length ===
        0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "#6b7280",
            }}
          >
            <UserPlus
              size={28}
              style={{
                marginBottom: 10,
                opacity: 0.5,
              }}
            />

            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              No people found
            </div>

            <div
              style={{
                marginTop: 4,
                fontSize: 13,
              }}
            >
              Try another name or email.
            </div>
          </div>
        ) : (
          filteredUsers.map(
            (user) => {
              const id =
                getUserId(user);

              const selected =
                selectedIds.includes(
                  id,
                );

              const avatar =
                getUserAvatar(user);

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    toggleUser(user)
                  }
                  disabled={
                    disabled ||
                    isSubmitting ||
                    !id
                  }
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems:
                      "center",
                    gap: 12,
                    padding:
                      "12px 16px",
                    border: 0,
                    borderBottom:
                      "1px solid #f3f4f6",
                    background:
                      selected
                        ? "#fff7ed"
                        : "#ffffff",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {/* AVATAR */}
                  {avatar ? (
                    <img
                      src={avatar}
                      alt=""
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius:
                          "50%",
                        objectFit:
                          "cover",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius:
                          "50%",
                        display: "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        background:
                          "#e5e7eb",
                        color: "#374151",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {getUserName(
                        user,
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}

                  {/* USER INFO */}
                  <div
                    style={{
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#111827",
                        overflow:
                          "hidden",
                        textOverflow:
                          "ellipsis",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {getUserName(
                        user,
                      )}
                    </div>

                    {getUserEmail(
                      user,
                    ) && (
                      <div
                        style={{
                          marginTop: 2,
                          fontSize: 12,
                          color: "#6b7280",
                          overflow:
                            "hidden",
                          textOverflow:
                            "ellipsis",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {getUserEmail(
                          user,
                        )}
                      </div>
                    )}
                  </div>

                  {/* CHECK */}
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 7,
                      display: "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      border: selected
                        ? "1px solid #f97316"
                        : "1px solid #d1d5db",
                      background:
                        selected
                          ? "#f97316"
                          : "#ffffff",
                      color:
                        selected
                          ? "#ffffff"
                          : "transparent",
                      flexShrink: 0,
                    }}
                  >
                    <Check size={16} />
                  </div>
                </button>
              );
            },
          )
        )}
      </div>

      {/* MESSAGES */}
      {(error || success) && (
        <div
          style={{
            padding:
              "12px 16px 0",
          }}
        >
          {error && (
            <div
              style={{
                padding: 11,
                borderRadius: 9,
                background: "#fef2f2",
                color: "#b91c1c",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                padding: 11,
                borderRadius: 9,
                background: "#f0fdf4",
                color: "#15803d",
                fontSize: 13,
              }}
            >
              {success}
            </div>
          )}
        </div>
      )}

      {/* FOOTER */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          padding: 16,
          borderTop:
            "1px solid #e5e7eb",
        }}
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding:
                "10px 16px",
              borderRadius: 9,
              border:
                "1px solid #d1d5db",
              background: "#ffffff",
              color: "#374151",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        )}

        <button
          type="button"
          onClick={handleInvite}
          disabled={
            disabled ||
            isSubmitting ||
            selectedIds.length === 0
          }
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent:
              "center",
            gap: 8,
            padding:
              "10px 18px",
            borderRadius: 9,
            border: 0,
            background:
              selectedIds.length > 0 &&
              !isSubmitting
                ? "#f97316"
                : "#d1d5db",
            color: "#ffffff",
            fontWeight: 700,
            cursor:
              selectedIds.length > 0 &&
              !isSubmitting
                ? "pointer"
                : "not-allowed",
          }}
        >
          <UserPlus size={17} />

          {isSubmitting
            ? "Sending..."
            : `${submitLabel}${
                selectedIds.length > 0
                  ? ` (${selectedIds.length})`
                  : ""
              }`}
        </button>
      </div>
    </div>
  );
}