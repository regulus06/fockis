/**
 * ChurchCommunicationPage.tsx
 * -----------------------------------------------------------------------------
 * FOCKIS CHURCH — COMMUNICATION HUB
 *
 * Backend remains the authoritative authorization boundary.
 * -----------------------------------------------------------------------------
 */

import React, {
  useEffect,
  useState,
} from "react";

import { useParams } from "react-router-dom";

import ChurchHeader from "../components/ChurchHeader";
import ChurchSidebar from "../components/ChurchSidebar";

import {
  churchGet,
  churchPost,
  toPaginated,
  withFallback,
} from "../api/churchApi";

import {
  AnnouncementAudience,
  MemberRole,
  MembershipStatus,
} from "../types/church.types";

import type {
  Announcement,
  ChurchMessage,
  ChurchNotification,
  DepartmentMessage,
  PaginatedResult,
} from "../types/church.types";

import LanguageSelector from "../../../i18n/components/LanguageSelector";
import { useFockisTranslation } from "../../../i18n/useFockisTranslation";

import "../styles/ChurchOrganizationPage.scss";

type Tab =
  | "announcements"
  | "messages"
  | "department-messages"
  | "notifications";

type OrganizationMembership = {
  id: string;
  organizationId: string;
  userId: string;
  role: MemberRole;
  status: MembershipStatus;
  permissions?: string[];
};

type MembershipResponse =
  OrganizationMembership;

function isActiveMembership(
  membership: OrganizationMembership | null,
): boolean {
  return (
    membership?.status ===
    MembershipStatus.Active
  );
}

function isGuestMembership(
  membership: OrganizationMembership | null,
): boolean {
  return (
    membership?.role ===
    MemberRole.Guest
  );
}

function canAccessCommunication(
  membership: OrganizationMembership | null,
): boolean {
  if (!isActiveMembership(membership)) {
    return false;
  }

  if (isGuestMembership(membership)) {
    return false;
  }

  return true;
}

export default function ChurchCommunicationPage(): React.JSX.Element {
  const { organizationId = "" } =
    useParams<{ organizationId: string }>();

  const { t } = useFockisTranslation();

  const tabs: Array<{
    key: Tab;
    label: string;
  }> = [
    {
      key: "announcements",
      label: t(
        "church.communication.tabs.announcements",
      ),
    },
    {
      key: "messages",
      label: t(
        "church.communication.tabs.messages",
      ),
    },
    {
      key: "department-messages",
      label: t(
        "church.communication.tabs.departmentMessages",
      ),
    },
    {
      key: "notifications",
      label: t(
        "church.communication.tabs.notifications",
      ),
    },
  ];

  const [activeTab, setActiveTab] =
    useState<Tab>("announcements");

  const [membership, setMembership] =
    useState<OrganizationMembership | null>(
      null,
    );

  const [membershipLoading, setMembershipLoading] =
    useState(true);

  const [announcements, setAnnouncements] =
    useState<Announcement[]>([]);

  const [messages, setMessages] =
    useState<ChurchMessage[]>([]);

  const [departmentMessages, setDepartmentMessages] =
    useState<DepartmentMessage[]>([]);

  const [notifications, setNotifications] =
    useState<ChurchNotification[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [accessDenied, setAccessDenied] =
    useState(false);

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadMembership(): Promise<void> {
      if (!organizationId) {
        setMembership(null);
        setMembershipLoading(false);
        setAccessDenied(true);

        setError(
          t(
            "church.communication.errors.noOrganization",
          ),
        );

        return;
      }

      setMembershipLoading(true);
      setError(null);
      setAccessDenied(false);

      try {
        const result =
          await churchGet<MembershipResponse>(
            `/organizations/${organizationId}/membership`,
            {},
            controller.signal,
          );

        if (controller.signal.aborted) {
          return;
        }

        setMembership(result);

        if (
          !canAccessCommunication(result)
        ) {
          setAccessDenied(true);
        }
      } catch (err) {
        if (
          err instanceof DOMException &&
          err.name === "AbortError"
        ) {
          return;
        }

        setMembership(null);
        setAccessDenied(true);

        setError(
          err instanceof Error
            ? err.message
            : t(
                "church.communication.errors.verifyMembership",
              ),
        );
      } finally {
        if (!controller.signal.aborted) {
          setMembershipLoading(false);
        }
      }
    }

    void loadMembership();

    return () => {
      controller.abort();
    };
  }, [organizationId, t]);

  useEffect(() => {
    const controller =
      new AbortController();

    async function load(): Promise<void> {
      if (!organizationId) {
        setIsLoading(false);
        return;
      }

      if (membershipLoading) {
        return;
      }

      if (
        !canAccessCommunication(
          membership,
        )
      ) {
        setIsLoading(false);
        setAccessDenied(true);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        if (
          activeTab ===
          "announcements"
        ) {
          const result =
            await withFallback(
              () =>
                churchGet<
                  PaginatedResult<Announcement>
                >(
                  `/organizations/${organizationId}/announcements`,
                  {
                    pageSize: 20,
                  },
                  controller.signal,
                ),
              () =>
                toPaginated<Announcement>(
                  [],
                ),
            );

          if (controller.signal.aborted) {
            return;
          }

          setAnnouncements(
            result.items,
          );

          return;
        }

        if (
          activeTab ===
          "messages"
        ) {
          const result =
            await withFallback(
              () =>
                churchGet<
                  PaginatedResult<ChurchMessage>
                >(
                  `/organizations/${organizationId}/messages`,
                  {
                    pageSize: 20,
                  },
                  controller.signal,
                ),
              () =>
                toPaginated<ChurchMessage>(
                  [],
                ),
            );

          if (controller.signal.aborted) {
            return;
          }

          setMessages(
            result.items,
          );

          return;
        }

        if (
          activeTab ===
          "department-messages"
        ) {
          const result =
            await withFallback(
              () =>
                churchGet<
                  PaginatedResult<DepartmentMessage>
                >(
                  `/organizations/${organizationId}/department-messages`,
                  {
                    pageSize: 20,
                  },
                  controller.signal,
                ),
              () =>
                toPaginated<DepartmentMessage>(
                  [],
                ),
            );

          if (controller.signal.aborted) {
            return;
          }

          setDepartmentMessages(
            result.items,
          );

          return;
        }

        const result =
          await withFallback(
            () =>
              churchGet<
                PaginatedResult<ChurchNotification>
              >(
                `/organizations/${organizationId}/notifications`,
                {
                  pageSize: 20,
                },
                controller.signal,
              ),
            () =>
              toPaginated<ChurchNotification>(
                [],
              ),
          );

        if (controller.signal.aborted) {
          return;
        }

        setNotifications(
          result.items,
        );
      } catch (err) {
        if (
          err instanceof DOMException &&
          err.name === "AbortError"
        ) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : t(
                "church.communication.errors.load",
              ),
        );

        setAccessDenied(true);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      controller.abort();
    };
  }, [
    organizationId,
    activeTab,
    membership,
    membershipLoading,
    t,
  ]);

  const markNotificationRead = async (
    notificationId: string,
  ): Promise<void> => {
    if (
      !canAccessCommunication(
        membership,
      )
    ) {
      return;
    }

    setNotifications((items) =>
      items.map((item) =>
        item.id === notificationId
          ? {
              ...item,
              isRead: true,
            }
          : item,
      ),
    );

    try {
      await churchPost<void>(
        `/organizations/${organizationId}/notifications/${notificationId}/read`,
      );
    } catch (err) {
      setNotifications((items) =>
        items.map((item) =>
          item.id === notificationId
            ? {
                ...item,
                isRead: false,
              }
            : item,
        ),
      );

      if (err instanceof Error) {
        setError(err.message);
      }
    }
  };

  if (membershipLoading) {
    return (
      <div className="church-page">
        <ChurchHeader />

        <div className="church-container church-org-layout">
          <ChurchSidebar
            organizationId={
              organizationId
            }
          />

          <main className="church-org-content">
            <div className="church-section__heading church-section__heading--with-action">
              <div>
                <h1>
                  {t(
                    "church.communication.title",
                  )}
                </h1>
              </div>

              <LanguageSelector />
            </div>

            <p className="church-empty-state">
              {t(
                "church.communication.checkingAccess",
              )}
            </p>
          </main>
        </div>
      </div>
    );
  }

  if (
    accessDenied ||
    !canAccessCommunication(
      membership,
    )
  ) {
    return (
      <div className="church-page">
        <ChurchHeader />

        <div className="church-container church-org-layout">
          <ChurchSidebar
            organizationId={
              organizationId
            }
          />

          <main className="church-org-content">
            <div className="church-section__heading church-section__heading--with-action">
              <div>
                <h1>
                  {t(
                    "church.communication.title",
                  )}
                </h1>
              </div>

              <LanguageSelector />
            </div>

            <div
              className="church-alert church-alert--error"
              role="alert"
            >
              {error ||
                t(
                  "church.communication.errors.accessDenied",
                )}
            </div>

            <div className="church-empty-state">
              <p>
                {t(
                  "church.communication.accessDescription",
                )}
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="church-page">
      <ChurchHeader />

      <div className="church-container church-org-layout">
        <ChurchSidebar
          organizationId={
            organizationId
          }
        />

        <main className="church-org-content">
          <div className="church-section__heading church-section__heading--with-action">
            <div>
              <h1>
                {t(
                  "church.communication.title",
                )}
              </h1>

              <p>
                {t(
                  "church.communication.description",
                )}
              </p>
            </div>

            <LanguageSelector />
          </div>

          <div
            className="church-tab-group"
            role="tablist"
            aria-label={t(
              "church.communication.sections",
            )}
          >
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={
                  activeTab ===
                  tab.key
                }
                className={`church-tab ${
                  activeTab ===
                  tab.key
                    ? "church-tab--active"
                    : ""
                }`}
                onClick={() =>
                  setActiveTab(
                    tab.key,
                  )
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          {error && (
            <div
              className="church-alert church-alert--error"
              role="alert"
            >
              {error}
            </div>
          )}

          {isLoading ? (
            <p className="church-empty-state">
              {t(
                "church.communication.loading",
              )}
            </p>
          ) : (
            <>
              {activeTab ===
                "announcements" &&
                (announcements.length ===
                0 ? (
                  <p className="church-empty-state">
                    {t(
                      "church.communication.empty.announcements",
                    )}
                  </p>
                ) : (
                  <ul className="church-feed">
                    {announcements.map(
                      (
                        announcement,
                      ) => (
                        <li
                          key={
                            announcement.id
                          }
                          className={`church-feed__item ${
                            announcement.pinned
                              ? "is-pinned"
                              : ""
                          }`}
                        >
                          <div className="church-feed__meta">
                            <span className="church-eyebrow">
                              {announcement.audience ===
                              AnnouncementAudience.Everyone
                                ? t(
                                    "church.communication.audience.everyone",
                                  )
                                : announcement.audience}
                            </span>

                            <span>
                              {new Date(
                                announcement.publishedAt,
                              ).toLocaleDateString()}
                            </span>
                          </div>

                          <h3>
                            {
                              announcement.title
                            }
                          </h3>

                          <p>
                            {
                              announcement.body
                            }
                          </p>

                          <p className="church-feed__author">
                            —{" "}
                            {
                              announcement
                                .author
                                .displayName
                            }
                          </p>
                        </li>
                      ),
                    )}
                  </ul>
                ))}

              {activeTab ===
                "messages" &&
                (messages.length ===
                0 ? (
                  <p className="church-empty-state">
                    {t(
                      "church.communication.empty.messages",
                    )}
                  </p>
                ) : (
                  <ul className="church-feed">
                    {messages.map(
                      (message) => (
                        <li
                          key={
                            message.id
                          }
                          className={`church-feed__item ${
                            message.readAt
                              ? ""
                              : "is-unread"
                          }`}
                        >
                          <div className="church-feed__meta">
                            <span>
                              {
                                message
                                  .sender
                                  .displayName
                              }
                            </span>

                            <span>
                              {new Date(
                                message.sentAt,
                              ).toLocaleString()}
                            </span>
                          </div>

                          <p>
                            {
                              message.body
                            }
                          </p>
                        </li>
                      ),
                    )}
                  </ul>
                ))}

              {activeTab ===
                "department-messages" &&
                (departmentMessages.length ===
                0 ? (
                  <p className="church-empty-state">
                    {t(
                      "church.communication.empty.departmentMessages",
                    )}
                  </p>
                ) : (
                  <ul className="church-feed">
                    {departmentMessages.map(
                      (message) => (
                        <li
                          key={
                            message.id
                          }
                          className={`church-feed__item ${
                            message.readAt
                              ? ""
                              : "is-unread"
                          }`}
                        >
                          <div className="church-feed__meta">
                            <span>
                              {
                                message
                                  .sender
                                  .displayName
                              }
                            </span>

                            <span>
                              {new Date(
                                message.sentAt,
                              ).toLocaleString()}
                            </span>
                          </div>

                          <p>
                            {
                              message.body
                            }
                          </p>
                        </li>
                      ),
                    )}
                  </ul>
                ))}

              {activeTab ===
                "notifications" &&
                (notifications.length ===
                0 ? (
                  <p className="church-empty-state">
                    {t(
                      "church.communication.empty.notifications",
                    )}
                  </p>
                ) : (
                  <ul className="church-feed">
                    {notifications.map(
                      (
                        notification,
                      ) => (
                        <li
                          key={
                            notification.id
                          }
                          className={`church-feed__item ${
                            notification.isRead
                              ? ""
                              : "is-unread"
                          }`}
                        >
                          <div className="church-feed__meta">
                            <span>
                              {
                                notification.category
                              }
                            </span>

                            <span>
                              {new Date(
                                notification.createdAt,
                              ).toLocaleString()}
                            </span>
                          </div>

                          <h3>
                            {
                              notification.title
                            }
                          </h3>

                          <p>
                            {
                              notification.body
                            }
                          </p>

                          {!notification.isRead && (
                            <button
                              type="button"
                              className="church-btn church-btn--ghost church-btn--sm"
                              onClick={() =>
                                void markNotificationRead(
                                  notification.id,
                                )
                              }
                            >
                              {t(
                                "church.communication.markRead",
                              )}
                            </button>
                          )}
                        </li>
                      ),
                    )}
                  </ul>
                ))}
            </>
          )}
        </main>
      </div>
    </div>
  );
}