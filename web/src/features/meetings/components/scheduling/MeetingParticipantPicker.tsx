import { FOCKIS_API_URL } from "../../../../config/fockisConfig";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Check,
  Copy,
  GraduationCap,
  Link2,
  Loader2,
  Mail,
  MessageSquare,
  Search,
  Share2,
  UserPlus,
  Users,
  Building2,
  Church,
  X,
} from "lucide-react";

/* ============================================================================
 * TYPES
 * ========================================================================== */

export type InvitationTargetType =
  | "user"
  | "group"
  | "organization"
  | "academy"
  | "church"
  | "department";

export type ExternalInvitationType = "email" | "phone";

export interface MeetingParticipantUser {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  profilePicture?: string | null;
  avatarUrl?: string | null;
  verified?: boolean;
  premium?: boolean;
  accountType?: string;
}

export interface InvitationTarget {
  id: string;
  type: InvitationTargetType;
  name: string;
  subtitle?: string;
  avatarUrl?: string | null;
  memberCount?: number;
  verified?: boolean;
}

export interface MeetingInvitationTarget {
  id: string;
  type: InvitationTargetType;
  name: string;
  subtitle?: string;
  avatarUrl?: string | null;
  memberCount?: number;
  verified?: boolean;
}

interface MeetingParticipantPickerProps {
  value: string[];
  onChange: (participantIds: string[]) => void;

  placeholder?: string;
  disabled?: boolean;
  maxParticipants?: number;

  invitationLink?: string;

  onSendExternalInvitation?: (
    type: ExternalInvitationType,
    recipients: string[],
  ) => Promise<void> | void;

  onTargetSelected?: (
    target: InvitationTarget,
  ) => void;

  onTargetsChange?: (
    targets: MeetingInvitationTarget[],
  ) => void;
}

/* ============================================================================
 * API
 * ========================================================================== */

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  FOCKIS_API_URL
).replace(/\/+$/, "");

/* ============================================================================
 * AUTH
 * ========================================================================== */

function getToken(): string | null {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token")
  );
}

function getHeaders(): HeadersInit {
  const token = getToken();

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
}

/* ============================================================================
 * TARGET HELPERS
 * ========================================================================== */

function getTargetLabel(
  type: InvitationTargetType,
): string {
  switch (type) {
    case "user":
      return "Person";

    case "group":
      return "Group";

    case "organization":
      return "Organization";

    case "academy":
      return "Academy";

    case "church":
      return "Church";

    case "department":
      return "Department";

    default:
      return "Fockis";
  }
}

function getTargetIcon(
  type: InvitationTargetType,
) {
  switch (type) {
    case "user":
      return UserPlus;

    case "group":
      return Users;

    case "organization":
      return Building2;

    case "academy":
      return GraduationCap;

    case "church":
      return Church;

    case "department":
      return Building2;

    default:
      return Users;
  }
}

/* ============================================================================
 * NORMALIZE USER
 * ========================================================================== */

function normalizeUser(
  raw: any,
): MeetingParticipantUser | null {
  const id = String(
    raw?._id ??
      raw?.id ??
      raw?.userId ??
      "",
  ).trim();

  if (!id) {
    return null;
  }

  const firstName =
    typeof raw?.firstName === "string"
      ? raw.firstName.trim()
      : "";

  const lastName =
    typeof raw?.lastName === "string"
      ? raw.lastName.trim()
      : "";

  const username =
    typeof raw?.username === "string"
      ? raw.username.trim()
      : "";

  const displayName =
    typeof raw?.displayName === "string"
      ? raw.displayName.trim()
      : [
          firstName,
          lastName,
        ]
          .filter(Boolean)
          .join(" ");

  return {
    id,

    username:
      username || undefined,

    firstName:
      firstName || undefined,

    lastName:
      lastName || undefined,

    displayName:
      displayName ||
      username ||
      "Fockis user",

    profilePicture:
      raw?.profilePicture ??
      raw?.avatar ??
      null,

    avatarUrl:
      raw?.avatarUrl ??
      raw?.profilePicture ??
      raw?.avatar ??
      null,

    verified:
      Boolean(raw?.verified),

    premium:
      Boolean(raw?.premium),

    accountType:
      typeof raw?.accountType === "string"
        ? raw.accountType
        : undefined,
  };
}

/* ============================================================================
 * NORMALIZE UNIVERSAL TARGET
 * ========================================================================== */

function normalizeTarget(
  raw: any,
  fallbackType: InvitationTargetType,
): InvitationTarget | null {
  const id = String(
    raw?._id ??
      raw?.id ??
      raw?.userId ??
      raw?.groupId ??
      raw?.organizationId ??
      raw?.academyId ??
      raw?.churchId ??
      raw?.departmentId ??
      "",
  ).trim();

  if (!id) {
    return null;
  }

  const name = String(
    raw?.displayName ??
      raw?.name ??
      raw?.title ??
      raw?.organizationName ??
      raw?.academyName ??
      raw?.churchName ??
      raw?.departmentName ??
      "Fockis",
  ).trim();

  const subtitle = String(
    raw?.username ??
      raw?.description ??
      raw?.email ??
      "",
  ).trim();

  const rawType =
    raw?.type ??
    raw?.targetType ??
    fallbackType;

  const validTypes: InvitationTargetType[] = [
    "user",
    "group",
    "organization",
    "academy",
    "church",
    "department",
  ];

  const type: InvitationTargetType =
    validTypes.includes(rawType)
      ? rawType
      : fallbackType;

  return {
    id,
    type,
    name,
    subtitle:
      subtitle || undefined,

    avatarUrl:
      raw?.avatarUrl ??
      raw?.profilePicture ??
      raw?.avatar ??
      null,

    memberCount:
      typeof raw?.memberCount === "number"
        ? raw.memberCount
        : typeof raw?.membersCount === "number"
          ? raw.membersCount
          : undefined,

    verified:
      Boolean(raw?.verified),
  };
}

/* ============================================================================
 * NORMALIZE RESPONSE
 * ========================================================================== */

function normalizeResponse(
  payload: any,
): any[] {
  const possibleArrays = [
    payload,
    payload?.users,
    payload?.items,
    payload?.results,
    payload?.data,
    payload?.data?.users,
    payload?.data?.items,
    payload?.data?.results,
  ];

  const array = possibleArrays.find(
    Array.isArray,
  );

  return Array.isArray(array)
    ? array
    : [];
}

/* ============================================================================
 * DISPLAY HELPERS
 * ========================================================================== */

function getDisplayName(
  user: MeetingParticipantUser,
): string {
  return (
    user.displayName ||
    [
      user.firstName,
      user.lastName,
    ]
      .filter(Boolean)
      .join(" ") ||
    user.username ||
    "Fockis user"
  );
}

function getInitials(
  name: string,
): string {
  const parts = name
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return (
      parts[0][0] +
      parts[parts.length - 1][0]
    ).toUpperCase();
  }

  return (
    parts[0]?.slice(0, 2) ||
    "FK"
  ).toUpperCase();
}

function getAvatar(
  user: MeetingParticipantUser,
): string | null {
  return (
    user.profilePicture ||
    user.avatarUrl ||
    null
  );
}

/* ============================================================================
 * COMPONENT
 * ========================================================================== */

export default function MeetingParticipantPicker({
  value,
  onChange,

  placeholder =
    "Search people, groups, organizations...",

  disabled = false,

  maxParticipants,

  invitationLink,

  onSendExternalInvitation,

  onTargetSelected,

  onTargetsChange,
}: MeetingParticipantPickerProps) {
  /* --------------------------------------------------------------------------
   * STATE
   * ------------------------------------------------------------------------ */

  const [query, setQuery] =
    useState("");

  const [targetType, setTargetType] =
    useState<
      InvitationTargetType | "all"
    >("all");

  const [results, setResults] =
    useState<InvitationTarget[]>([]);

  const [selectedTargets, setSelectedTargets] =
    useState<InvitationTarget[]>([]);

  const [emailInput, setEmailInput] =
    useState("");

  const [phoneInput, setPhoneInput] =
    useState("");

  const [emails, setEmails] =
    useState<string[]>([]);

  const [phones, setPhones] =
    useState<string[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [sendingExternal, setSendingExternal] =
    useState<
      ExternalInvitationType | null
    >(null);

  const [error, setError] =
    useState<string | null>(null);

  const [open, setOpen] =
    useState(false);

  const [copied, setCopied] =
    useState(false);

  const [highlightedIndex, setHighlightedIndex] =
    useState(0);

  const rootRef =
    useRef<HTMLDivElement | null>(null);

  const inputRef =
    useRef<HTMLInputElement | null>(null);

  /* --------------------------------------------------------------------------
   * SELECTED IDS
   * ------------------------------------------------------------------------ */

  const selectedIds = useMemo(
    () =>
      new Set(
        value.map(String),
      ),
    [value],
  );

  /* --------------------------------------------------------------------------
   * SYNC SELECTED TARGETS
   *
   * IMPORTANT:
   * We preserve any rich target information already loaded.
   * If the parent supplies IDs only, we create a lightweight
   * user target so the UI still represents the selected ID.
   * ------------------------------------------------------------------------ */

  useEffect(() => {
    setSelectedTargets(
      (current) => {
        const currentByKey =
          new Map<
            string,
            InvitationTarget
          >();

        current.forEach(
          (item) => {
            currentByKey.set(
              `${item.type}:${item.id}`,
              item,
            );
          },
        );

        return value
          .map((id) => {
            const stringId =
              String(id);

            const existing =
              current.find(
                (item) =>
                  String(item.id) ===
                  stringId,
              );

            if (existing) {
              return existing;
            }

            const cachedUser =
              currentByKey.get(
                `user:${stringId}`,
              );

            if (cachedUser) {
              return cachedUser;
            }

            return {
              id: stringId,
              type: "user",
              name: "Fockis user",
            } satisfies InvitationTarget;
          })
          .filter(
            Boolean,
          ) as InvitationTarget[];
      },
    );
  }, [value]);

  /* --------------------------------------------------------------------------
   * SEND COMPLETE TARGET LIST TO PARENT
   * ------------------------------------------------------------------------ */

  useEffect(() => {
    onTargetsChange?.(
      selectedTargets.map(
        (target) => ({
          id: target.id,
          type: target.type,
          name: target.name,
          subtitle:
            target.subtitle,
          avatarUrl:
            target.avatarUrl,
          memberCount:
            target.memberCount,
          verified:
            target.verified,
        }),
      ),
    );
  }, [
    selectedTargets,
    onTargetsChange,
  ]);

  /* --------------------------------------------------------------------------
   * CLOSE OUTSIDE
   * ------------------------------------------------------------------------ */

  useEffect(() => {
    const handleOutsideClick = (
      event: MouseEvent,
    ) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );
    };
  }, []);

  /* --------------------------------------------------------------------------
   * SEARCH
   * ------------------------------------------------------------------------ */

  useEffect(() => {
    const trimmed =
      query.trim();

    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      setHighlightedIndex(0);
      return;
    }

    let cancelled = false;

    const timer =
      window.setTimeout(
        async () => {
          setLoading(true);
          setError(null);

          try {
            let endpoint =
              "/friends/search";

            if (
              targetType ===
              "group"
            ) {
              endpoint =
                "/groups/search";
            }

            if (
              targetType ===
              "organization"
            ) {
              endpoint =
                "/organizations/search";
            }

            if (
              targetType ===
              "academy"
            ) {
              endpoint =
                "/academy/search";
            }

            if (
              targetType ===
              "church"
            ) {
              endpoint =
                "/church/search";
            }

            if (
              targetType ===
              "department"
            ) {
              endpoint =
                "/departments/search";
            }

            const response =
              await fetch(
                `${API_BASE_URL}${endpoint}?q=${encodeURIComponent(
                  trimmed,
                )}`,
                {
                  method: "GET",
                  headers:
                    getHeaders(),
                },
              );

            if (
              response.status ===
              401
            ) {
              throw new Error(
                "Your session has expired. Please sign in again.",
              );
            }

            if (!response.ok) {
              throw new Error(
                `Unable to search (${response.status}).`,
              );
            }

            const payload =
              await response.json();

            if (cancelled) {
              return;
            }

            const rawItems =
              normalizeResponse(
                payload,
              );

            let normalized: InvitationTarget[] =
              [];

            /* ----------------------------------------------------------------
             * PEOPLE
             * -------------------------------------------------------------- */

            if (
              targetType ===
                "all" ||
              targetType ===
                "user"
            ) {
              normalized =
                rawItems
                  .map(
                    normalizeUser,
                  )
                  .filter(
                    (
                      user,
                    ): user is MeetingParticipantUser =>
                      Boolean(user),
                  )
                  .map(
                    (user) => ({
                      id:
                        user.id,

                      type:
                        "user" as const,

                      name:
                        getDisplayName(
                          user,
                        ),

                      subtitle:
                        user.username
                          ? `@${user.username}`
                          : undefined,

                      avatarUrl:
                        getAvatar(
                          user,
                        ),

                      verified:
                        user.verified,
                    }),
                  );
            }

            /* ----------------------------------------------------------------
             * UNIVERSAL TARGETS
             * -------------------------------------------------------------- */

            if (
              targetType !==
                "all" &&
              targetType !==
                "user"
            ) {
              normalized =
                rawItems
                  .map(
                    (item) =>
                      normalizeTarget(
                        item,
                        targetType,
                      ),
                  )
                  .filter(
                    (
                      item,
                    ): item is InvitationTarget =>
                      Boolean(item),
                  );
            }

            /* ----------------------------------------------------------------
             * "EVERYONE" MAY RETURN MIXED TARGETS
             * -------------------------------------------------------------- */

            if (
              targetType ===
              "all"
            ) {
              const universalResults =
                rawItems
                  .map(
                    (item) => {
                      const rawType =
                        item?.type ??
                        item?.targetType;

                      if (
                        rawType ===
                          "group" ||
                        rawType ===
                          "organization" ||
                        rawType ===
                          "academy" ||
                        rawType ===
                          "church" ||
                        rawType ===
                          "department"
                      ) {
                        return normalizeTarget(
                          item,
                          rawType,
                        );
                      }

                      return null;
                    },
                  )
                  .filter(
                    (
                      item,
                    ): item is InvitationTarget =>
                      Boolean(item),
                  );

              normalized = [
                ...normalized,
                ...universalResults,
              ];
            }

            /* ----------------------------------------------------------------
             * REMOVE DUPLICATES
             * -------------------------------------------------------------- */

            const unique =
              new Map<
                string,
                InvitationTarget
              >();

            normalized.forEach(
              (item) => {
                unique.set(
                  `${item.type}:${item.id}`,
                  item,
                );
              },
            );

            /* ----------------------------------------------------------------
             * HIDE ALREADY SELECTED TARGETS
             * -------------------------------------------------------------- */

            const filtered =
              Array.from(
                unique.values(),
              ).filter(
                (item) => {
                  const sameTarget =
                    selectedTargets.some(
                      (selected) =>
                        String(
                          selected.id,
                        ) ===
                          String(
                            item.id,
                          ) &&
                        selected.type ===
                          item.type,
                    );

                  const sameUserId =
                    item.type ===
                      "user" &&
                    selectedIds.has(
                      String(
                        item.id,
                      ),
                    );

                  return (
                    !sameTarget &&
                    !sameUserId
                  );
                },
              );

            setResults(
              filtered,
            );

            setHighlightedIndex(0);
          } catch (err) {
            if (cancelled) {
              return;
            }

            setResults([]);

            setError(
              err instanceof Error
                ? err.message
                : "Unable to search.",
            );
          } finally {
            if (!cancelled) {
              setLoading(
                false,
              );
            }
          }
        },
        300,
      );

    return () => {
      cancelled = true;

      window.clearTimeout(
        timer,
      );
    };
  }, [
    query,
    targetType,
    selectedTargets,
    selectedIds,
  ]);

  /* --------------------------------------------------------------------------
   * ADD TARGET
   * ------------------------------------------------------------------------ */

  const addTarget = (
    target: InvitationTarget,
  ) => {
    if (
      disabled
    ) {
      return;
    }

    if (
      maxParticipants &&
      selectedTargets.length >=
        maxParticipants
    ) {
      setError(
        `You can invite up to ${maxParticipants} recipients.`,
      );

      return;
    }

    const alreadySelected =
      selectedTargets.some(
        (item) =>
          String(item.id) ===
            String(target.id) &&
          item.type ===
            target.type,
      );

    if (
      alreadySelected
    ) {
      return;
    }

    const nextTargets = [
      ...selectedTargets,
      target,
    ];

    setSelectedTargets(
      nextTargets,
    );

    const nextIds =
      Array.from(
        new Set([
          ...value.map(String),
          String(target.id),
        ]),
      );

    onChange(
      nextIds,
    );

    onTargetSelected?.(
      target,
    );

    setQuery("");
    setResults([]);
    setOpen(false);
    setHighlightedIndex(0);
    setError(null);

    window.setTimeout(
      () =>
        inputRef.current?.focus(),
      0,
    );
  };

  /* --------------------------------------------------------------------------
   * REMOVE TARGET
   * ------------------------------------------------------------------------ */

  const removeTarget = (
    target: InvitationTarget,
  ) => {
    if (
      disabled
    ) {
      return;
    }

    const nextTargets =
      selectedTargets.filter(
        (item) =>
          !(
            String(item.id) ===
              String(target.id) &&
            item.type ===
              target.type
          ),
      );

    setSelectedTargets(
      nextTargets,
    );

    onChange(
      value.filter(
        (id) =>
          String(id) !==
          String(target.id),
      ),
    );

    setError(null);
  };

  /* --------------------------------------------------------------------------
   * ADD EMAIL
   * ------------------------------------------------------------------------ */

  const addEmail = () => {
    if (disabled) {
      return;
    }

    const email =
      emailInput
        .trim()
        .toLowerCase();

    if (!email) {
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email,
      )
    ) {
      setError(
        "Please enter a valid email address.",
      );

      return;
    }

    if (
      emails.includes(email)
    ) {
      setEmailInput("");
      return;
    }

    setEmails(
      (current) => [
        ...current,
        email,
      ],
    );

    setEmailInput("");
    setError(null);
  };

  /* --------------------------------------------------------------------------
   * ADD PHONE
   * ------------------------------------------------------------------------ */

  const addPhone = () => {
    if (disabled) {
      return;
    }

    const phone =
      phoneInput.trim();

    if (!phone) {
      return;
    }

    const digits =
      phone.replace(
        /\D/g,
        "",
      );

    if (
      digits.length < 7
    ) {
      setError(
        "Please enter a valid phone number.",
      );

      return;
    }

    if (
      phones.includes(phone)
    ) {
      setPhoneInput("");
      return;
    }

    setPhones(
      (current) => [
        ...current,
        phone,
      ],
    );

    setPhoneInput("");
    setError(null);
  };

  /* --------------------------------------------------------------------------
   * SEND EXTERNAL INVITATION
   * ------------------------------------------------------------------------ */

  const sendExternal = async (
    type: ExternalInvitationType,
  ) => {
    const recipients =
      type === "email"
        ? emails
        : phones;

    if (
      recipients.length ===
      0
    ) {
      setError(
        type === "email"
          ? "Add at least one email address."
          : "Add at least one phone number.",
      );

      return;
    }

    if (
      !onSendExternalInvitation
    ) {
      setError(
        "External invitation delivery is not configured yet. Connect this action to your backend email/SMS service.",
      );

      return;
    }

    setSendingExternal(
      type,
    );

    setError(null);

    try {
      await onSendExternalInvitation(
        type,
        recipients,
      );

      if (
        type === "email"
      ) {
        setEmails([]);
      } else {
        setPhones([]);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Unable to send ${type} invitations.`,
      );
    } finally {
      setSendingExternal(
        null,
      );
    }
  };

  /* --------------------------------------------------------------------------
   * COPY LINK
   * ------------------------------------------------------------------------ */

  const copyInvitationLink =
    async () => {
      if (
        !invitationLink
      ) {
        setError(
          "No meeting invitation link is available yet.",
        );

        return;
      }

      try {
        await navigator.clipboard.writeText(
          invitationLink,
        );

        setCopied(true);
        setError(null);

        window.setTimeout(
          () =>
            setCopied(false),
          1800,
        );
      } catch {
        setError(
          "Unable to copy the invitation link.",
        );
      }
    };

  /* --------------------------------------------------------------------------
   * SHARE LINK
   * ------------------------------------------------------------------------ */

  const shareInvitationLink =
    async () => {
      if (
        !invitationLink
      ) {
        setError(
          "No meeting invitation link is available yet.",
        );

        return;
      }

      try {
        if (
          navigator.share
        ) {
          await navigator.share(
            {
              title:
                "Fockis Meeting Invitation",

              text:
                "You're invited to a Fockis meeting.",

              url:
                invitationLink,
            },
          );

          return;
        }

        await copyInvitationLink();
      } catch {
        // User cancelled native sharing.
      }
    };

  /* --------------------------------------------------------------------------
   * KEYBOARD
   * ------------------------------------------------------------------------ */

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (
      event.key ===
      "ArrowDown"
    ) {
      event.preventDefault();

      if (
        results.length >
        0
      ) {
        setOpen(true);

        setHighlightedIndex(
          (current) =>
            current + 1 >=
            results.length
              ? 0
              : current + 1,
        );
      }

      return;
    }

    if (
      event.key ===
      "ArrowUp"
    ) {
      event.preventDefault();

      if (
        results.length >
        0
      ) {
        setOpen(true);

        setHighlightedIndex(
          (current) =>
            current - 1 < 0
              ? results.length - 1
              : current - 1,
        );
      }

      return;
    }

    if (
      event.key ===
      "Enter"
    ) {
      event.preventDefault();

      const highlighted =
        results[
          highlightedIndex
        ];

      if (
        highlighted
      ) {
        addTarget(
          highlighted,
        );
      }

      return;
    }

    if (
      event.key ===
      "Escape"
    ) {
      setOpen(false);
      return;
    }

    if (
      event.key ===
        "Backspace" &&
      !query &&
      selectedTargets.length >
        0
    ) {
      const last =
        selectedTargets[
          selectedTargets.length -
            1
        ];

      if (last) {
        removeTarget(
          last,
        );
      }
    }
  };

  /* ==========================================================================
   * RENDER
   * ======================================================================== */

  return (
    <div
      ref={rootRef}
      style={{
        position:
          "relative",
        width:
          "100%",
      }}
    >
      {/* ======================================================================
       * INVITATION TYPE SELECTOR
       * ==================================================================== */}

      <div
        style={{
          display:
            "flex",
          flexWrap:
            "wrap",
          gap:
            "7px",
          marginBottom:
            "12px",
        }}
      >
        {[
          {
            value:
              "all" as const,
            label:
              "Everyone",
            icon:
              Users,
          },
          {
            value:
              "user" as const,
            label:
              "People",
            icon:
              UserPlus,
          },
          {
            value:
              "group" as const,
            label:
              "Groups",
            icon:
              Users,
          },
          {
            value:
              "organization" as const,
            label:
              "Organizations",
            icon:
              Building2,
          },
          {
            value:
              "academy" as const,
            label:
              "Academies",
            icon:
              GraduationCap,
          },
          {
            value:
              "church" as const,
            label:
              "Churches",
            icon:
              Church,
          },
          {
            value:
              "department" as const,
            label:
              "Departments",
            icon:
              Building2,
          },
        ].map(
          (item) => {
            const Icon =
              item.icon;

            const active =
              targetType ===
              item.value;

            return (
              <button
                key={
                  item.value
                }
                type="button"
                disabled={
                  disabled
                }
                onClick={() => {
                  setTargetType(
                    item.value,
                  );

                  setQuery(
                    "",
                  );

                  setResults(
                    [],
                  );

                  setOpen(
                    false,
                  );

                  setHighlightedIndex(
                    0,
                  );

                  setError(null);
                }}
                style={{
                  display:
                    "inline-flex",
                  alignItems:
                    "center",
                  gap:
                    "6px",
                  border:
                    "1px solid " +
                    (active
                      ? "#cfd8e3"
                      : "#e1e5ea"),
                  borderRadius:
                    "999px",
                  background:
                    active
                      ? "#f0f4f8"
                      : "#ffffff",
                  color:
                    active
                      ? "#172033"
                      : "#667085",
                  padding:
                    "7px 11px",
                  fontSize:
                    "12px",
                  fontWeight:
                    700,
                  cursor:
                    disabled
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                <Icon
                  size={14}
                />

                {
                  item.label
                }
              </button>
            );
          },
        )}
      </div>

      {/* ======================================================================
       * SELECTED TARGETS
       * ==================================================================== */}

      {selectedTargets.length >
        0 && (
        <div
          style={{
            display:
              "flex",
            flexWrap:
              "wrap",
            gap:
              "8px",
            marginBottom:
              "10px",
          }}
        >
          {selectedTargets.map(
            (target) => {
              const Icon =
                getTargetIcon(
                  target.type,
                );

              const avatar =
                target.avatarUrl;

              return (
                <div
                  key={`${target.type}:${target.id}`}
                  style={{
                    display:
                      "inline-flex",
                    alignItems:
                      "center",
                    gap:
                      "7px",
                    minHeight:
                      "38px",
                    padding:
                      "4px 8px 4px 6px",
                    border:
                      "1px solid #e1e5ea",
                    borderRadius:
                      "999px",
                    background:
                      "#f7f9fb",
                    color:
                      "#172033",
                  }}
                >
                  {avatar ? (
                    <img
                      src={
                        avatar
                      }
                      alt=""
                      style={{
                        width:
                          "28px",
                        height:
                          "28px",
                        borderRadius:
                          "50%",
                        objectFit:
                          "cover",
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        width:
                          "28px",
                        height:
                          "28px",
                        borderRadius:
                          "50%",
                        display:
                          "inline-flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        background:
                          "#edf1f5",
                        color:
                          "#46515f",
                        flexShrink:
                          0,
                      }}
                    >
                      <Icon
                        size={14}
                      />
                    </span>
                  )}

                  <span
                    style={{
                      maxWidth:
                        "190px",
                      overflow:
                        "hidden",
                      textOverflow:
                        "ellipsis",
                      whiteSpace:
                        "nowrap",
                      fontSize:
                        "13px",
                      fontWeight:
                        700,
                    }}
                  >
                    {
                      target.name
                    }
                  </span>

                  <span
                    style={{
                      fontSize:
                        "10px",
                      color:
                        "#7b8491",
                    }}
                  >
                    {getTargetLabel(
                      target.type,
                    )}
                  </span>

                  <button
                    type="button"
                    disabled={
                      disabled
                    }
                    onClick={() =>
                      removeTarget(
                        target,
                      )
                    }
                    aria-label={`Remove ${target.name}`}
                    style={{
                      border:
                        "none",
                      background:
                        "transparent",
                      padding:
                        "2px",
                      display:
                        "inline-flex",
                      cursor:
                        disabled
                          ? "not-allowed"
                          : "pointer",
                      color:
                        "#697586",
                    }}
                  >
                    <X
                      size={14}
                    />
                  </button>
                </div>
              );
            },
          )}
        </div>
      )}

      {/* ======================================================================
       * SEARCH
       * ==================================================================== */}

      <div
        style={{
          position:
            "relative",
        }}
      >
        <Search
          size={17}
          style={{
            position:
              "absolute",
            left:
              "14px",
            top:
              "50%",
            transform:
              "translateY(-50%)",
            color:
              "#8a94a3",
            pointerEvents:
              "none",
          }}
        />

        <input
          ref={
            inputRef
          }
          type="text"
          className="fm-input"
          value={
            query
          }
          disabled={
            disabled
          }
          placeholder={
            placeholder
          }
          autoComplete="off"
          onFocus={() =>
            setOpen(
              true,
            )
          }
          onChange={(
            event,
          ) => {
            setQuery(
              event.target
                .value,
            );

            setOpen(
              true,
            );
          }}
          onKeyDown={
            handleKeyDown
          }
          style={{
            width:
              "100%",
            paddingLeft:
              "42px",
            paddingRight:
              "42px",
          }}
        />

        {loading && (
          <Loader2
            size={17}
            style={{
              position:
                "absolute",
              right:
                "14px",
              top:
                "50%",
              transform:
                "translateY(-50%)",
              animation:
                "fmParticipantPickerSpin 0.9s linear infinite",
              color:
                "#6b7280",
            }}
          />
        )}

        {!loading &&
          query && (
            <button
              type="button"
              onClick={() =>
                setQuery(
                  "",
                )
              }
              disabled={
                disabled
              }
              aria-label="Clear search"
              style={{
                position:
                  "absolute",
                right:
                  "10px",
                top:
                  "50%",
                transform:
                  "translateY(-50%)",
                border:
                  "none",
                background:
                  "transparent",
                color:
                  "#7a8492",
                cursor:
                  "pointer",
                display:
                  "inline-flex",
                padding:
                  "5px",
              }}
            >
              <X
                size={16}
              />
            </button>
          )}
      </div>

      {/* ======================================================================
       * COUNTER
       * ==================================================================== */}

      <div
        style={{
          display:
            "flex",
          justifyContent:
            "space-between",
          alignItems:
            "center",
          marginTop:
            "7px",
          fontSize:
            "12px",
          color:
            "#7b8491",
        }}
      >
        <span>
          {selectedTargets.length ===
          0
            ? "Search people, groups, organizations, academies, churches or departments"
            : `${selectedTargets.length} invitation target${
                selectedTargets.length ===
                1
                  ? ""
                  : "s"
              } selected`}
        </span>

        {maxParticipants && (
          <span>
            {
              selectedTargets.length
            }
            /
            {
              maxParticipants
            }
          </span>
        )}
      </div>

      {/* ======================================================================
       * DROPDOWN
       * ==================================================================== */}

      {open &&
        query.trim()
          .length >= 2 && (
          <div
            style={{
              position:
                "absolute",
              zIndex:
                1000,
              top:
                selectedTargets.length >
                0
                  ? "calc(100% + 95px)"
                  : "calc(100% + 63px)",
              left:
                0,
              right:
                0,
              background:
                "#ffffff",
              border:
                "1px solid #dfe4ea",
              borderRadius:
                "12px",
              boxShadow:
                "0 14px 40px rgba(15, 23, 42, 0.14)",
              overflow:
                "hidden",
            }}
          >
            {loading && (
              <div
                style={{
                  padding:
                    "20px",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  gap:
                    "9px",
                  color:
                    "#6b7280",
                  fontSize:
                    "13px",
                }}
              >
                <Loader2
                  size={16}
                  style={{
                    animation:
                      "fmParticipantPickerSpin 0.9s linear infinite",
                  }}
                />

                Searching...
              </div>
            )}

            {!loading &&
              error && (
                <div
                  style={{
                    padding:
                      "18px 16px",
                    color:
                      "#b42318",
                    fontSize:
                      "13px",
                  }}
                >
                  {error}
                </div>
              )}

            {!loading &&
              !error &&
              results.length >
                0 && (
                <div
                  style={{
                    maxHeight:
                      "330px",
                    overflowY:
                      "auto",
                  }}
                >
                  {results.map(
                    (
                      target,
                      index,
                    ) => {
                      const Icon =
                        getTargetIcon(
                          target.type,
                        );

                      const isHighlighted =
                        index ===
                        highlightedIndex;

                      return (
                        <button
                          key={`${target.type}:${target.id}`}
                          type="button"
                          onMouseEnter={() =>
                            setHighlightedIndex(
                              index,
                            )
                          }
                          onClick={() =>
                            addTarget(
                              target,
                            )
                          }
                          style={{
                            width:
                              "100%",
                            border:
                              "none",
                            borderBottom:
                              "1px solid #eef1f4",
                            background:
                              isHighlighted
                                ? "#f6f8fa"
                                : "#ffffff",
                            padding:
                              "11px 13px",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap:
                              "11px",
                            textAlign:
                              "left",
                            cursor:
                              "pointer",
                          }}
                        >
                          {target.avatarUrl ? (
                            <img
                              src={
                                target.avatarUrl
                              }
                              alt=""
                              style={{
                                width:
                                  "42px",
                                height:
                                  "42px",
                                borderRadius:
                                  "50%",
                                objectFit:
                                  "cover",
                                flexShrink:
                                  0,
                              }}
                            />
                          ) : (
                            <span
                              style={{
                                width:
                                  "42px",
                                height:
                                  "42px",
                                borderRadius:
                                  "50%",
                                display:
                                  "inline-flex",
                                alignItems:
                                  "center",
                                justifyContent:
                                  "center",
                                background:
                                  "#eef2f6",
                                color:
                                  "#46515f",
                                flexShrink:
                                  0,
                              }}
                            >
                              <Icon
                                size={18}
                              />
                            </span>
                          )}

                          <span
                            style={{
                              minWidth:
                                0,
                              flex:
                                1,
                            }}
                          >
                            <span
                              style={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                gap:
                                  "6px",
                                fontSize:
                                  "13px",
                                fontWeight:
                                  700,
                                color:
                                  "#172033",
                              }}
                            >
                              <span
                                style={{
                                  overflow:
                                    "hidden",
                                  textOverflow:
                                    "ellipsis",
                                  whiteSpace:
                                    "nowrap",
                                }}
                              >
                                {
                                  target.name
                                }
                              </span>

                              {target.verified && (
                                <span
                                  style={{
                                    width:
                                      "15px",
                                    height:
                                      "15px",
                                    borderRadius:
                                      "50%",
                                    background:
                                      "#1877f2",
                                    color:
                                      "#ffffff",
                                    display:
                                      "inline-flex",
                                    alignItems:
                                      "center",
                                    justifyContent:
                                      "center",
                                    fontSize:
                                      "9px",
                                    flexShrink:
                                      0,
                                  }}
                                >
                                  ✓
                                </span>
                              )}
                            </span>

                            <span
                              style={{
                                display:
                                  "block",
                                marginTop:
                                  "3px",
                                color:
                                  "#7b8491",
                                fontSize:
                                  "11px",
                              }}
                            >
                              {
                                getTargetLabel(
                                  target.type,
                                )
                              }

                              {target.memberCount !==
                                undefined &&
                                ` • ${target.memberCount} members`}

                              {target.subtitle &&
                                ` • ${target.subtitle}`}
                            </span>
                          </span>

                          <span
                            style={{
                              width:
                                "30px",
                              height:
                                "30px",
                              borderRadius:
                                "50%",
                              display:
                                "inline-flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              background:
                                "#f0f4f8",
                              color:
                                "#4b5563",
                              flexShrink:
                                0,
                            }}
                          >
                            <UserPlus
                              size={16}
                            />
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
              )}

            {!loading &&
              !error &&
              results.length ===
                0 && (
                <div
                  style={{
                    padding:
                      "22px 16px",
                    textAlign:
                      "center",
                    color:
                      "#7b8491",
                    fontSize:
                      "13px",
                  }}
                >
                  <Search
                    size={20}
                  />

                  <div
                    style={{
                      marginTop:
                        "8px",
                    }}
                  >
                    No results found for{" "}
                    <strong>
                      "{query.trim()}"
                    </strong>
                  </div>
                </div>
              )}
          </div>
        )}

      {/* ======================================================================
       * EXTERNAL INVITATIONS
       * ==================================================================== */}

      <div
        style={{
          marginTop:
            "20px",
          borderTop:
            "1px solid #e8ecf0",
          paddingTop:
            "18px",
        }}
      >
        <div
          style={{
            fontSize:
              "13px",
            fontWeight:
              800,
            color:
              "#172033",
            marginBottom:
              "12px",
          }}
        >
          Invite people outside Fockis
        </div>

        {/* EMAIL */}

        <div
          style={{
            marginBottom:
              "14px",
          }}
        >
          <div
            style={{
              display:
                "flex",
              gap:
                "8px",
            }}
          >
            <div
              style={{
                position:
                  "relative",
                flex:
                  1,
              }}
            >
              <Mail
                size={16}
                style={{
                  position:
                    "absolute",
                  left:
                    "12px",
                  top:
                    "50%",
                  transform:
                    "translateY(-50%)",
                  color:
                    "#8a94a3",
                  pointerEvents:
                    "none",
                }}
              />

              <input
                type="email"
                value={
                  emailInput
                }
                disabled={
                  disabled
                }
                placeholder="Email address"
                onChange={(event) =>
                  setEmailInput(
                    event.target
                      .value,
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    event.preventDefault();
                    addEmail();
                  }
                }}
                style={{
                  width:
                    "100%",
                  padding:
                    "10px 12px 10px 37px",
                  border:
                    "1px solid #dfe4ea",
                  borderRadius:
                    "9px",
                  outline:
                    "none",
                }}
              />
            </div>

            <button
              type="button"
              disabled={
                disabled
              }
              onClick={
                addEmail
              }
              style={{
                border:
                  "1px solid #dfe4ea",
                borderRadius:
                  "9px",
                background:
                  "#ffffff",
                padding:
                  "0 13px",
                fontWeight:
                  700,
                cursor:
                  disabled
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              Add
            </button>
          </div>

          {emails.length >
            0 && (
            <div
              style={{
                display:
                  "flex",
                flexWrap:
                  "wrap",
                gap:
                  "7px",
                marginTop:
                  "8px",
              }}
            >
              {emails.map(
                (email) => (
                  <span
                    key={
                      email
                    }
                    style={{
                      display:
                        "inline-flex",
                      alignItems:
                        "center",
                      gap:
                        "6px",
                      padding:
                        "6px 9px",
                      borderRadius:
                        "999px",
                      background:
                        "#f1f5f9",
                      fontSize:
                        "12px",
                    }}
                  >
                    {email}

                    <button
                      type="button"
                      onClick={() =>
                        setEmails(
                          (current) =>
                            current.filter(
                              (item) =>
                                item !==
                                email,
                            ),
                        )
                      }
                      style={{
                        border:
                          "none",
                        background:
                          "transparent",
                        padding:
                          0,
                        cursor:
                          "pointer",
                      }}
                    >
                      <X
                        size={13}
                      />
                    </button>
                  </span>
                ),
              )}
            </div>
          )}

          {emails.length >
            0 && (
            <button
              type="button"
              disabled={
                sendingExternal ===
                "email"
              }
              onClick={() =>
                sendExternal(
                  "email",
                )
              }
              style={{
                marginTop:
                  "9px",
                display:
                  "inline-flex",
                alignItems:
                  "center",
                gap:
                  "7px",
                border:
                  "none",
                borderRadius:
                  "9px",
                background:
                  "#172033",
                color:
                  "#ffffff",
                padding:
                  "9px 13px",
                fontWeight:
                  700,
                cursor:
                  "pointer",
              }}
            >
              {sendingExternal ===
              "email" ? (
                <Loader2
                  size={15}
                  style={{
                    animation:
                      "fmParticipantPickerSpin 0.9s linear infinite",
                  }}
                />
              ) : (
                <Mail
                  size={15}
                />
              )}

              Send Email Invitations
            </button>
          )}
        </div>

        {/* PHONE */}

        <div>
          <div
            style={{
              display:
                "flex",
              gap:
                "8px",
            }}
          >
            <div
              style={{
                position:
                  "relative",
                flex:
                  1,
              }}
            >
              <MessageSquare
                size={16}
                style={{
                  position:
                    "absolute",
                  left:
                    "12px",
                  top:
                    "50%",
                  transform:
                    "translateY(-50%)",
                  color:
                    "#8a94a3",
                  pointerEvents:
                    "none",
                }}
              />

              <input
                type="tel"
                value={
                  phoneInput
                }
                disabled={
                  disabled
                }
                placeholder="Phone number"
                onChange={(event) =>
                  setPhoneInput(
                    event.target
                      .value,
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    event.preventDefault();
                    addPhone();
                  }
                }}
                style={{
                  width:
                    "100%",
                  padding:
                    "10px 12px 10px 37px",
                  border:
                    "1px solid #dfe4ea",
                  borderRadius:
                    "9px",
                  outline:
                    "none",
                }}
              />
            </div>

            <button
              type="button"
              disabled={
                disabled
              }
              onClick={
                addPhone
              }
              style={{
                border:
                  "1px solid #dfe4ea",
                borderRadius:
                  "9px",
                background:
                  "#ffffff",
                padding:
                  "0 13px",
                fontWeight:
                  700,
                cursor:
                  disabled
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              Add
            </button>
          </div>

          {phones.length >
            0 && (
            <div
              style={{
                display:
                  "flex",
                flexWrap:
                  "wrap",
                gap:
                  "7px",
                marginTop:
                  "8px",
              }}
            >
              {phones.map(
                (phone) => (
                  <span
                    key={
                      phone
                    }
                    style={{
                      display:
                        "inline-flex",
                      alignItems:
                        "center",
                      gap:
                        "6px",
                      padding:
                        "6px 9px",
                      borderRadius:
                        "999px",
                      background:
                        "#f1f5f9",
                      fontSize:
                        "12px",
                    }}
                  >
                    {phone}

                    <button
                      type="button"
                      onClick={() =>
                        setPhones(
                          (current) =>
                            current.filter(
                              (item) =>
                                item !==
                                phone,
                            ),
                        )
                      }
                      style={{
                        border:
                          "none",
                        background:
                          "transparent",
                        padding:
                          0,
                        cursor:
                          "pointer",
                      }}
                    >
                      <X
                        size={13}
                      />
                    </button>
                  </span>
                ),
              )}
            </div>
          )}

          {phones.length >
            0 && (
            <button
              type="button"
              disabled={
                sendingExternal ===
                "phone"
              }
              onClick={() =>
                sendExternal(
                  "phone",
                )
              }
              style={{
                marginTop:
                  "9px",
                display:
                  "inline-flex",
                alignItems:
                  "center",
                gap:
                  "7px",
                border:
                  "none",
                borderRadius:
                  "9px",
                background:
                  "#172033",
                color:
                  "#ffffff",
                padding:
                  "9px 13px",
                fontWeight:
                  700,
                cursor:
                  "pointer",
              }}
            >
              {sendingExternal ===
              "phone" ? (
                <Loader2
                  size={15}
                  style={{
                    animation:
                      "fmParticipantPickerSpin 0.9s linear infinite",
                  }}
                />
              ) : (
                <MessageSquare
                  size={15}
                />
              )}

              Send SMS Invitations
            </button>
          )}
        </div>

        {/* ====================================================================
         * LINK
         * ================================================================== */}

        {invitationLink && (
          <div
            style={{
              marginTop:
                "18px",
              padding:
                "13px",
              border:
                "1px solid #e1e5ea",
              borderRadius:
                "11px",
              background:
                "#f8fafc",
            }}
          >
            <div
              style={{
                display:
                  "flex",
                alignItems:
                  "center",
                gap:
                  "7px",
                fontSize:
                  "13px",
                fontWeight:
                  800,
                color:
                  "#172033",
                marginBottom:
                  "8px",
              }}
            >
              <Link2
                size={16}
              />

              Meeting invitation link
            </div>

            <div
              style={{
                display:
                  "flex",
                gap:
                  "8px",
              }}
            >
              <input
                type="text"
                readOnly
                value={
                  invitationLink
                }
                style={{
                  minWidth:
                    0,
                  flex:
                    1,
                  padding:
                    "9px 10px",
                  border:
                    "1px solid #dfe4ea",
                  borderRadius:
                    "8px",
                  background:
                    "#ffffff",
                  color:
                    "#596579",
                  fontSize:
                    "12px",
                }}
              />

              <button
                type="button"
                onClick={
                  copyInvitationLink
                }
                style={{
                  display:
                    "inline-flex",
                  alignItems:
                    "center",
                  gap:
                    "6px",
                  border:
                    "1px solid #dfe4ea",
                  borderRadius:
                    "8px",
                  background:
                    "#ffffff",
                  padding:
                    "0 11px",
                  fontWeight:
                    700,
                  cursor:
                    "pointer",
                }}
              >
                {copied ? (
                  <Check
                    size={15}
                  />
                ) : (
                  <Copy
                    size={15}
                  />
                )}

                {copied
                  ? "Copied"
                  : "Copy"}
              </button>

              <button
                type="button"
                onClick={
                  shareInvitationLink
                }
                style={{
                  display:
                    "inline-flex",
                  alignItems:
                    "center",
                  gap:
                    "6px",
                  border:
                    "none",
                  borderRadius:
                    "8px",
                  background:
                    "#172033",
                  color:
                    "#ffffff",
                  padding:
                    "0 11px",
                  fontWeight:
                    700,
                  cursor:
                    "pointer",
                }}
              >
                <Share2
                  size={15}
                />

                Share
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================================
       * ERROR
       * ==================================================================== */}

      {error && (
        <div
          style={{
            marginTop:
              "10px",
            padding:
              "9px 11px",
            border:
              "1px solid #f0caca",
            borderRadius:
              "8px",
            background:
              "#fff7f7",
            color:
              "#b42318",
            fontSize:
              "12px",
          }}
        >
          {error}
        </div>
      )}

      {/* ======================================================================
       * SPINNER
       * ==================================================================== */}

      <style>
        {`
          @keyframes fmParticipantPickerSpin {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  );
}