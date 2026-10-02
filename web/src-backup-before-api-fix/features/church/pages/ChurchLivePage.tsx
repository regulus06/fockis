import React, {
useEffect,
useMemo,
useState,
} from "react";

import {
Link,
useNavigate,
useParams,
} from "react-router-dom";

import ChurchHeader from "../components/ChurchHeader";
import ChurchSidebar from "../components/ChurchSidebar";

import {
getLiveEvents,
getUpcomingLiveEvents,
joinLiveService,
} from "../api/churchLiveApi";

import {
LiveEventState,
LiveEventVisibility,
type LiveEvent,
} from "../types/church.types";

import {
useFockisTranslation,
} from "../../../i18n/useFockisTranslation";

import type {
FockisLanguage,
} from "../../../i18n/language";

import "../styles/ChurchOrganizationPage.scss";

const LIVE_ROUTES = {
organization: (
organizationId: string,
): string =>
`/church/organizations/${encodeURIComponent(
      organizationId,
    )}`,

leadership: (
organizationId: string,
): string =>
`/church/organizations/${encodeURIComponent(
      organizationId,
    )}#leadership`,

branches: (
organizationId: string,
): string =>
`/church/organizations/${encodeURIComponent(
      organizationId,
    )}#branches`,

livestream: (
organizationId: string,
): string =>
`/church/organizations/${encodeURIComponent(
      organizationId,
    )}/live`,

studio: (
organizationId: string,
): string =>
`/church/${encodeURIComponent(
      organizationId,
    )}/live/studio`,

createLive: (
organizationId: string,
): string =>
`/church/${encodeURIComponent(
      organizationId,
    )}/admin/events`,

meetings: "/meetings",

churchHome: "/church",
};

function isValidOrganizationId(
value: string | undefined,
): value is string {
const normalized =
value?.trim();

if (!normalized) {
return false;
}

if (
normalized === "YOUR_ORG_ID" ||
normalized === "undefined" ||
normalized === "null"
) {
return false;
}

return true;
}

function resolveOrganizationName(
events: LiveEvent[],
): string {
for (const event of events) {
const candidate =
event as LiveEvent & {
organizationName?: string | null;
organization?: {
name?: string | null;
} | null;
};

const organizationName =
  candidate.organizationName?.trim();

if (organizationName) {
  return organizationName;
}

const nestedName =
  candidate.organization?.name?.trim();

if (nestedName) {
  return nestedName;
}

}

return "Organization";
}

function getDateLocale(
language: FockisLanguage,
): string {
switch (language) {
case "ht":
return "ht-HT";

case "fr":
  return "fr-FR";

case "es":
  return "es-ES";

case "en":
default:
  return "en-US";

}
}

function getVisibilityKey(
visibility: LiveEventVisibility,
): string {
switch (visibility) {
case LiveEventVisibility.Public:
return "church.live.visibility.public";

case LiveEventVisibility.Members:
  return "church.live.visibility.members";

case LiveEventVisibility.Private:
  return "church.live.visibility.private";

default:
  return "church.live.visibility.public";

}
}

export default function ChurchLivePage(): React.JSX.Element {
const navigate = useNavigate();

const {
t,
language,
} = useFockisTranslation();

const {
organizationId: rawOrganizationId,
} = useParams<{
organizationId?: string;
}>();

const organizationId =
rawOrganizationId?.trim() ?? "";

const [
liveEvents,
setLiveEvents,
] = useState<LiveEvent[]>([]);

const [
upcoming,
setUpcoming,
] = useState<LiveEvent[]>([]);

const [
playback,
setPlayback,
] = useState<{
eventId: string;
url: string;
} | null>(null);

const [
guestEmail,
setGuestEmail,
] = useState("");

const [
isLoading,
setIsLoading,
] = useState(true);

const [
error,
setError,
] = useState<string | null>(null);

const [
joinError,
setJoinError,
] = useState<string | null>(null);

const [
isJoining,
setIsJoining,
] = useState(false);

const locale =
getDateLocale(language);

const organizationName =
useMemo(
() =>
resolveOrganizationName([
...liveEvents,
...upcoming,
]),
[
liveEvents,
upcoming,
],
);

useEffect(() => {
const controller =
new AbortController();

async function load(): Promise<void> {
  if (
    !isValidOrganizationId(
      organizationId,
    )
  ) {
    setLiveEvents([]);
    setUpcoming([]);

    setError(
      t(
        "church.live.errors.noOrganization",
      ),
    );

    setIsLoading(false);

    return;
  }

  setIsLoading(true);
  setError(null);

  try {
    const [
      all,
      next,
    ] = await Promise.all([
      getLiveEvents(
        organizationId,
        {
          page: 1,
          pageSize: 10,
        },
        controller.signal,
      ),

      getUpcomingLiveEvents(
        organizationId,
        {
          page: 1,
          pageSize: 6,
        },
        controller.signal,
      ),
    ]);

    if (
      controller.signal.aborted
    ) {
      return;
    }

    setLiveEvents(
      all.items ?? [],
    );

    setUpcoming(
      next.items ?? [],
    );
  } catch (err) {
    if (
      controller.signal.aborted
    ) {
      return;
    }

    setError(
      err instanceof Error
        ? err.message
        : t(
            "church.live.errors.load",
          ),
    );
  } finally {
    if (
      !controller.signal.aborted
    ) {
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
t,
]);

const currentLive =
liveEvents.find(
(event) =>
event.state ===
LiveEventState.Live,
);

const requireOrganization =
(
message: string,
): boolean => {
if (
!isValidOrganizationId(
organizationId,
)
) {
setError(message);
return false;
}

  return true;
};

const handleOpenLiveStudio =
(): void => {
if (
!requireOrganization(
t(
"church.live.errors.organizationRequiredStudio",
),
)
) {
return;
}

  navigate(
    LIVE_ROUTES.studio(
      organizationId,
    ),
  );
};

const handleCreateLive =
(): void => {
if (
!requireOrganization(
t(
"church.live.errors.organizationRequiredSchedule",
),
)
) {
return;
}

  navigate(
    LIVE_ROUTES.createLive(
      organizationId,
    ),
  );
};

const handleOpenMeeting =
(): void => {
navigate(
LIVE_ROUTES.meetings,
);
};

const handleJoin = async (
event: LiveEvent,
): Promise<void> => {
setJoinError(null);

if (
  !isValidOrganizationId(
    organizationId,
  )
) {
  setJoinError(
    t(
      "church.live.errors.organizationRequired",
    ),
  );

  return;
}

const requiresGuestEmail =
  event.visibility ===
    LiveEventVisibility.Private &&
  !event.currentUserHasAccess;

if (
  requiresGuestEmail &&
  !guestEmail.trim()
) {
  setJoinError(
    t(
      "church.live.errors.guestEmailRequired",
    ),
  );

  return;
}

setIsJoining(true);

try {
  const result =
    await joinLiveService(
      organizationId,
      event.id,
      requiresGuestEmail
        ? {
            guestEmail:
              guestEmail.trim(),
          }
        : undefined,
    );

  setPlayback({
    eventId: event.id,
    url: result.playbackUrl,
  });
} catch (err) {
  setJoinError(
    err instanceof Error
      ? err.message
      : t(
          "church.live.errors.join",
        ),
  );
} finally {
  setIsJoining(false);
}

};

return ( <div className="church-page"> <ChurchHeader />

  <div className="church-container church-org-layout">
    <ChurchSidebar
      organizationId={
        organizationId
      }
    />

    <main className="church-org-content">
      <nav
        className="church-live-breadcrumbs"
        aria-label={t(
          "church.live.organizationNavigation",
        )}
      >
        <Link
          to={
            LIVE_ROUTES.organization(
              organizationId,
            )
          }
          className="church-live-breadcrumbs__brand"
        >
          {organizationName}
        </Link>

        <span
          className="church-live-breadcrumbs__separator"
          aria-hidden="true"
        >
          /
        </span>

        <Link
          to={
            LIVE_ROUTES.organization(
              organizationId,
            )
          }
        >
          {t(
            "church.navigation.overview",
          )}
        </Link>

        <span
          className="church-live-breadcrumbs__separator"
          aria-hidden="true"
        >
          /
        </span>

        <Link
          to={
            LIVE_ROUTES.leadership(
              organizationId,
            )
          }
        >
          {t(
            "church.navigation.leadership",
          )}
        </Link>

        <span
          className="church-live-breadcrumbs__separator"
          aria-hidden="true"
        >
          /
        </span>

        <Link
          to={
            LIVE_ROUTES.branches(
              organizationId,
            )
          }
        >
          {t(
            "church.navigation.branches",
          )}
        </Link>
      </nav>

      <div className="church-section__heading">
        <div>
          <span className="church-eyebrow">
            {t(
              "church.live.header.eyebrow",
            )}
          </span>

          <h1>
            {t(
              "church.live.title",
            )}
          </h1>

          <p>
            {t(
              "church.live.header.description",
              {
                organization:
                  organizationName,
              },
            )}
          </p>
        </div>
      </div>

      <section className="church-org-section">
        <div
          className="church-live-actions"
          aria-label={t(
            "church.live.actions.ariaLabel",
          )}
        >
          <button
            type="button"
            className="church-btn church-btn--primary church-btn--lg"
            onClick={
              handleOpenLiveStudio
            }
          >
            <span
              aria-hidden="true"
            >
              🎥
            </span>

            <span>
              {t(
                "church.live.actions.openStudio",
              )}
            </span>
          </button>

          <button
            type="button"
            className="church-btn church-btn--secondary church-btn--lg"
            onClick={
              handleCreateLive
            }
          >
            <span
              aria-hidden="true"
            >
              📅
            </span>

            <span>
              {t(
                "church.live.actions.scheduleLive",
              )}
            </span>
          </button>

          <button
            type="button"
            className="church-btn church-btn--secondary church-btn--lg"
            onClick={
              handleOpenMeeting
            }
          >
            <span
              aria-hidden="true"
            >
              👥
            </span>

            <span>
              {t(
                "church.live.actions.openMeetings",
              )}
            </span>
          </button>
        </div>
      </section>

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
            "church.live.loading",
          )}
        </p>
      ) : currentLive ? (
        <section className="church-live-player">
          <div className="church-live-player__badge">
            <span
              aria-hidden="true"
            >
              ●
            </span>

            {t(
              "church.live.liveNow",
            )}
          </div>

          <h2>
            {currentLive.title}
          </h2>

          {currentLive.description && (
            <p>
              {
                currentLive.description
              }
            </p>
          )}

          {playback?.eventId ===
          currentLive.id ? (
            <div className="church-live-player__frame">
              <video
                controls
                autoPlay
                playsInline
                src={
                  playback.url
                }
                poster={
                  currentLive.posterUrl ??
                  undefined
                }
              />
            </div>
          ) : (
            <div className="church-live-player__gate">
              <div className="church-live-player__gate-content">
                <span className="church-eyebrow">
                  {organizationName}
                </span>

                <h3>
                  {t(
                    "church.live.watchService",
                  )}
                </h3>

                <p>
                  {t(
                    "church.live.joinCurrentBroadcast",
                    {
                      organization:
                        organizationName,
                    },
                  )}
                </p>
              </div>

              {currentLive.visibility ===
                LiveEventVisibility.Private &&
                !currentLive.currentUserHasAccess && (
                  <input
                    type="email"
                    className="church-input"
                    placeholder={t(
                      "church.live.guestEmailPlaceholder",
                    )}
                    value={
                      guestEmail
                    }
                    autoComplete="email"
                    inputMode="email"
                    onChange={(
                      event,
                    ) =>
                      setGuestEmail(
                        event.target
                          .value,
                      )
                    }
                    aria-label={t(
                      "church.live.guestEmailLabel",
                    )}
                  />
                )}

              <button
                type="button"
                className="church-btn church-btn--primary church-btn--lg"
                onClick={() =>
                  handleJoin(
                    currentLive,
                  )
                }
                disabled={
                  isJoining
                }
              >
                {isJoining
                  ? t(
                      "church.live.connecting",
                    )
                  : t(
                      "church.live.watchNow",
                    )}
              </button>

              {joinError && (
                <p
                  className="church-alert church-alert--error"
                  role="alert"
                >
                  {joinError}
                </p>
              )}
            </div>
          )}

          {typeof currentLive.viewerCount ===
            "number" && (
            <p className="church-live-player__viewers">
              <span
                aria-hidden="true"
              >
                👁
              </span>

              {" "}

              {currentLive.viewerCount.toLocaleString(
                locale,
              )}

              {" "}

              {t(
                "church.live.watching",
              )}
            </p>
          )}
        </section>
      ) : (
        <section className="church-org-section">
          <div className="church-empty-state">
            <div
              className="church-live-empty-icon"
              aria-hidden="true"
            >
              📺
            </div>

            <h2>
              {t(
                "church.live.nothingStreaming",
              )}
            </h2>

            <p>
              {t(
                "church.live.noCurrentBroadcast",
                {
                  organization:
                    organizationName,
                },
              )}
            </p>

            <div
              className="church-live-actions"
              style={{
                marginTop:
                  "1rem",
              }}
            >
              <button
                type="button"
                className="church-btn church-btn--primary"
                onClick={
                  handleOpenLiveStudio
                }
              >
                🎥{" "}
                {t(
                  "church.live.actions.openStudio",
                )}
              </button>

              <button
                type="button"
                className="church-btn church-btn--secondary"
                onClick={
                  handleCreateLive
                }
              >
                📅{" "}
                {t(
                  "church.live.actions.scheduleService",
                )}
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="church-org-section">
        <div className="church-section__heading">
          <div>
            <span className="church-eyebrow">
              {t(
                "church.live.schedule.eyebrow",
              )}
            </span>

            <h2>
              {t(
                "church.live.schedule.title",
              )}
            </h2>
          </div>

          <button
            type="button"
            className="church-btn church-btn--secondary"
            onClick={
              handleCreateLive
            }
          >
            +{" "}
            {t(
              "church.live.actions.scheduleLive",
            )}
          </button>
        </div>

        {upcoming.length === 0 ? (
          <div className="church-empty-state">
            <p>
              {t(
                "church.live.schedule.empty",
              )}
            </p>

            <button
              type="button"
              className="church-btn church-btn--primary"
              onClick={
                handleCreateLive
              }
            >
              {t(
                "church.live.schedule.createFirst",
              )}
            </button>
          </div>
        ) : (
          <ul className="church-live-schedule">
            {upcoming.map(
              (event) => (
                <li
                  key={
                    event.id
                  }
                  className="church-live-schedule__item"
                >
                  <div>
                    <span className="church-eyebrow">
                      {t(
                        getVisibilityKey(
                          event.visibility,
                        ),
                      )}
                    </span>

                    <h3>
                      {
                        event.title
                      }
                    </h3>

                    <p>
                      {new Date(
                        event.scheduledStart,
                      ).toLocaleString(
                        locale,
                      )}
                    </p>

                    {event.description && (
                      <p>
                        {
                          event.description
                        }
                      </p>
                    )}
                  </div>

                  <div className="church-live-schedule__actions">
                    <button
                      type="button"
                      className="church-btn church-btn--secondary church-btn--sm"
                      onClick={
                        handleOpenLiveStudio
                      }
                    >
                      {t(
                        "church.live.actions.openStudio",
                      )}
                    </button>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </section>

      <section className="church-org-section">
        <div className="church-live-meeting-card">
          <div>
            <span className="church-eyebrow">
              {t(
                "church.live.meetings.eyebrow",
              )}
            </span>

            <h2>
              {t(
                "church.live.meetings.title",
                {
                  organization:
                    organizationName,
                },
              )}
            </h2>

            <p>
              {t(
                "church.live.meetings.description",
              )}
            </p>
          </div>

          <div className="church-live-actions">
            <button
              type="button"
              className="church-btn church-btn--primary church-btn--lg"
              onClick={
                handleOpenMeeting
              }
            >
              👥{" "}
              {t(
                "church.live.actions.openMeetings",
              )}
            </button>

            <button
              type="button"
              className="church-btn church-btn--secondary church-btn--lg"
              onClick={
                handleCreateLive
              }
            >
              📅{" "}
              {t(
                "church.live.actions.scheduleService",
              )}
            </button>
          </div>
        </div>
      </section>

      <section className="church-org-section">
        <div className="church-live-church-links">
          <div>
            <span className="church-eyebrow">
              {t(
                "church.live.organization.eyebrow",
              )}
            </span>

            <h2>
              {organizationName}
            </h2>

            <p>
              {t(
                "church.live.organization.description",
              )}
            </p>
          </div>

          <div className="church-live-actions">
            <Link
              to={
                LIVE_ROUTES.organization(
                  organizationId,
                )
              }
              className="church-btn church-btn--secondary"
            >
              {t(
                "church.navigation.overview",
              )}
            </Link>

            <Link
              to={
                LIVE_ROUTES.leadership(
                  organizationId,
                )
              }
              className="church-btn church-btn--secondary"
            >
              {t(
                "church.navigation.leadership",
              )}
            </Link>

            <Link
              to={
                LIVE_ROUTES.branches(
                  organizationId,
                )
              }
              className="church-btn church-btn--secondary"
            >
              {t(
                "church.navigation.branches",
              )}
            </Link>

            <Link
              to={
                LIVE_ROUTES.churchHome
              }
              className="church-btn church-btn--primary"
            >
              {t(
                "church.live.organization.allOrganizations",
              )}
            </Link>
          </div>
        </div>
      </section>
    </main>
  </div>
</div>
);
}