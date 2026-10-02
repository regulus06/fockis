/**

* ChurchLivestreamPage.tsx
* ---
* Public-facing Fockis Church Livestream page.
*
* All user-facing text is translated through the Fockis i18n system.
*
* PUBLIC
* * Display the current live church service
* * Allow visitors/members to watch
* * Display upcoming live services
* * Share the livestream
* * Display previous livestream/replay content
*
* CHURCH / ADMIN
* * Open the existing Fockis Live Studio
* * Schedule/create a live service
* * Open the existing Fockis Meeting system
*
* IMPORTANT
* ---
* This page does NOT create a second meeting/livestream backend.
*
* The existing Church Live API is the source of truth for:
* * current live state
* * upcoming live services
* * visibility
* * viewer count
*
* The existing Meetings system remains responsible for meetings/studio.
*
* A meetingId in the URL is NOT used to determine whether the church is live.
* The backend LiveEvent state determines that.
* ----------------------------------------------------------------------------- */

import React, {
useCallback,
useEffect,
useMemo,
useState,
} from "react";

import {
Link,
useNavigate,
useParams,
} from "react-router-dom";

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

import "../styles/ChurchLivestreamPage.scss";

const LOGO = "/Fockis-Logo/fockis2.png";

const MEETING_ROUTES = {
dashboard: "/meetings",

room: (meetingId: string) =>
`/meetings/${encodeURIComponent(
      meetingId,
    )}/room`,
};

const CHURCH_ROUTES = {
home: "/church",

livestream: "/church/live",

adminEvents: (organizationId: string) =>
`/church/${encodeURIComponent(
      organizationId,
    )}/admin/events`,

liveStudio: (organizationId: string) =>
`/church/${encodeURIComponent(
      organizationId,
    )}/live/studio`,

meeting: (organizationId: string) =>
`/church/${encodeURIComponent(
      organizationId,
    )}/meeting`,
};

const VISIBILITY_KEYS: Record<
  LiveEventVisibility,
  string
> = {
  [LiveEventVisibility.Public]: "church.livestream.visibility.public",
  [LiveEventVisibility.Members]: "church.livestream.visibility.members",
  [LiveEventVisibility.Private]: "church.livestream.visibility.private",
};

interface PreviousLivestream {
id: string;
date: string;
title: string;
duration: string;
thumbnailUrl?: string;
playbackUrl?: string;
}

const previousLivestreams: Array<
  PreviousLivestream & {
    titleKey: string;
    dateKey: string;
  }
> = [
  {
    id: "aug-17",
    date: "Aug 17",
    dateKey: "church.livestream.replays.aug17Date",
    title: "When Waiting Feels Like Wasting Time",
    titleKey: "church.livestream.replays.aug17Title",
    duration: "41:12",
  },
  {
    id: "aug-10",
    date: "Aug 10",
    dateKey: "church.livestream.replays.aug10Date",
    title: "The Quiet Work of Showing Up",
    titleKey: "church.livestream.replays.aug10Title",
    duration: "35:04",
  },
];

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

function formatDate(
value: string,
language: FockisLanguage,
): string {
const date = new Date(value);

if (Number.isNaN(date.getTime())) {
return value;
}

return date.toLocaleDateString(
getDateLocale(language),
{
month: "short",
day: "numeric",
year: "numeric",
},
);
}

function formatTime(
value: string,
language: FockisLanguage,
): string {
const date = new Date(value);

if (Number.isNaN(date.getTime())) {
return value;
}

return date.toLocaleTimeString(
getDateLocale(language),
{
hour: "numeric",
minute: "2-digit",
},
);
}

export default function ChurchLivestreamPage(): React.JSX.Element {
const navigate = useNavigate();

const {
t,
language,
} = useFockisTranslation();

const {
organizationId = "",
} = useParams<{
organizationId: string;
}>();

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
isJoining,
setIsJoining,
] = useState(false);

const [
error,
setError,
] = useState<string | null>(null);

const [
joinError,
setJoinError,
] = useState<string | null>(null);

const loadLiveData = useCallback(
async (
signal: AbortSignal,
): Promise<void> => {
if (!organizationId) {
setLiveEvents([]);
setUpcoming([]);

    setError(
      t(
        "church.livestream.errors.noOrganization",
      ),
    );

    setIsLoading(false);

    return;
  }

  setIsLoading(true);
  setError(null);

  try {
    const [
      liveResult,
      upcomingResult,
    ] = await Promise.all([
      getLiveEvents(
        organizationId,
        {
          page: 1,
          pageSize: 20,
        },
        signal,
      ),

      getUpcomingLiveEvents(
        organizationId,
        {
          page: 1,
          pageSize: 10,
        },
        signal,
      ),
    ]);

    if (signal.aborted) {
      return;
    }

    setLiveEvents(
      liveResult.items ?? [],
    );

    setUpcoming(
      upcomingResult.items ?? [],
    );
  } catch (err) {
    if (signal.aborted) {
      return;
    }

    setError(
      err instanceof Error
        ? err.message
        : t(
            "church.livestream.errors.load",
          ),
    );
  } finally {
    if (!signal.aborted) {
      setIsLoading(false);
    }
  }
},
[
  organizationId,
  t,
],
);

useEffect(() => {
const controller =
new AbortController();

void loadLiveData(
  controller.signal,
);

return () => {
  controller.abort();
};

}, [loadLiveData]);

const currentLive =
  useMemo(
  () =>
  liveEvents.find(
  (event) =>
  event.state ===
  LiveEventState.Live,
  ),
  [liveEvents],
  );

const handleOpenLiveStudio =
useCallback(() => {
if (!organizationId) {
setError(
t(
"church.livestream.errors.organizationRequiredStudio",
),
);

    return;
  }

  navigate(
    CHURCH_ROUTES.liveStudio(
      organizationId,
    ),
  );
}, [
  navigate,
  organizationId,
  t,
]);

const handleScheduleLive =
useCallback(() => {
if (!organizationId) {
setError(
t(
"church.livestream.errors.organizationRequiredSchedule",
),
);

    return;
  }

  navigate(
    CHURCH_ROUTES.adminEvents(
      organizationId,
    ),
  );
}, [
  navigate,
  organizationId,
  t,
]);

const handleOpenMeeting =
useCallback(() => {
navigate(
MEETING_ROUTES.dashboard,
);
}, [navigate]);

const handleWatchLive =
useCallback(
async (
event: LiveEvent,
): Promise<void> => {
setJoinError(null);

    if (!organizationId) {
      setJoinError(
        t(
          "church.livestream.errors.organizationRequired",
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
          "church.livestream.errors.guestEmailRequired",
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
        url:
          result.playbackUrl,
      });
    } catch (err) {
      setJoinError(
        err instanceof Error
          ? err.message
          : t(
              "church.livestream.errors.join",
            ),
      );
    } finally {
      setIsJoining(false);
    }
  },
  [
    guestEmail,
    organizationId,
    t,
  ],
);

const handleShare =
useCallback(async (): Promise<void> => {
const shareData = {
title:
currentLive?.title ??
t(
"church.livestream.share.title",
),

    text:
      t(
        "church.livestream.share.text",
      ),

    url:
      window.location.href,
  };

  try {
    if (
      typeof navigator.share ===
      "function"
    ) {
      await navigator.share(
        shareData,
      );

      return;
    }

    if (
      navigator.clipboard
    ) {
      await navigator.clipboard.writeText(
        window.location.href,
      );
    }
  } catch (shareError) {
    console.debug(
      "Share cancelled or unavailable.",
      shareError,
    );
  }
}, [
  currentLive,
  t,
]);

return ( <div className="church-live-page">
  <header className="church-live-header">
    <div className="church-live-header__inner">
      <Link
        to={CHURCH_ROUTES.home}
        className="church-live-brand"
      >
        <img
          src={LOGO}
          alt={t(
            "church.livestream.brand.logoAlt",
          )}
          className="church-live-brand__logo"
        />

        <div className="church-live-brand__text">
          <strong>
            Fockis
          </strong>

          <span>
            {t(
              "church.livestream.brand.church",
            )}
          </span>
        </div>
      </Link>

      <nav
        className="church-live-nav"
        aria-label={t(
          "church.livestream.navigation.label",
        )}
      >
        <Link
          to={CHURCH_ROUTES.home}
        >
          {t(
            "church.navigation.home",
          )}
        </Link>

        <Link to="/church#welcome">
          {t(
            "church.navigation.about",
          )}
        </Link>

        <Link to="/church#ministries">
          {t(
            "church.navigation.ministries",
          )}
        </Link>

        <Link to="/church#events">
          {t(
            "church.navigation.events",
          )}
        </Link>

        <Link to="/church#sermons">
          {t(
            "church.navigation.sermons",
          )}
        </Link>

        <Link
          to={CHURCH_ROUTES.livestream}
          className="church-live-nav__active"
          aria-current="page"
        >
          {t(
            "church.navigation.livestream",
          )}
        </Link>

        <Link to="/church#locations">
          {t(
            "church.navigation.locations",
          )}
        </Link>

        <Link to="/church#explore">
          {t(
            "church.navigation.explore",
          )}
        </Link>

        <Link to="/church#give">
          {t(
            "church.navigation.give",
          )}
        </Link>
      </nav>

      <Link
        to="/profile"
        className="church-live-header__member"
      >
        {t(
          "church.livestream.navigation.memberPortal",
        )}
      </Link>
    </div>
  </header>

  <main>
    <section className="church-live-hero">
      <div className="church-live-hero__content">
        <span className="church-live-eyebrow">
          {t(
            "church.livestream.hero.eyebrow",
          )}
        </span>

        <h1>
          {t(
            "church.livestream.hero.title",
          )}
        </h1>

        <p>
          {t(
            "church.livestream.hero.description",
          )}
        </p>
      </div>
    </section>

    <section className="church-live-admin-actions">
      <div className="church-live-container">
        <div className="church-live-admin-actions__inner">
          <div>
            <span className="church-live-eyebrow">
              {t(
                "church.livestream.tools.eyebrow",
              )}
            </span>

            <h2>
              {t(
                "church.livestream.tools.title",
              )}
            </h2>

            <p>
              {t(
                "church.livestream.tools.description",
              )}
            </p>
          </div>

          <div className="church-live-service__actions">
            <button
              type="button"
              className="church-live-watch-button"
              onClick={
                handleOpenLiveStudio
              }
            >
              <span
                aria-hidden="true"
              >
                🎥
              </span>

              {t(
                "church.livestream.actions.openStudio",
              )}
            </button>

            <button
              type="button"
              className="church-live-secondary-button"
              onClick={
                handleScheduleLive
              }
            >
              <span
                aria-hidden="true"
              >
                +
              </span>

              {t(
                "church.livestream.actions.scheduleLive",
              )}
            </button>

            <button
              type="button"
              className="church-live-secondary-button"
              onClick={
                handleOpenMeeting
              }
            >
              <span
                aria-hidden="true"
              >
                👥
              </span>

              {t(
                "church.livestream.actions.openMeeting",
              )}
            </button>
          </div>
        </div>
      </div>
    </section>

    {error && (
      <div className="church-live-container">
        <div
          className="church-alert church-alert--error"
          role="alert"
        >
          {error}
        </div>
      </div>
    )}

    <section className="church-live-service">
      <div className="church-live-container">
        {isLoading ? (
          <div
            className="church-empty-state"
            role="status"
          >
            {t(
              "church.livestream.loading",
            )}
          </div>
        ) : currentLive ? (
          <>
            <div className="church-live-service__header">
              <div>
                <div className="church-live-status">
                  <span
                    className="church-live-status__dot"
                    aria-hidden="true"
                  />

                  <span>
                    {t(
                      "church.livestream.liveNow",
                    )}
                  </span>
                </div>

                {typeof currentLive.viewerCount ===
                  "number" && (
                  <span className="church-live-viewers">
                    {currentLive.viewerCount.toLocaleString(
                      getDateLocale(
                        language,
                      ),
                    )}{" "}
                    {t(
                      "church.livestream.watching",
                    )}
                  </span>
                )}
              </div>
            </div>

            <div className="church-live-service__grid">
              <div className="church-live-service__info">
                <div className="church-live-service__location">
                  {currentLive.isOnline
                    ? t(
                        "church.livestream.service.online",
                      )
                    : currentLive.location ||
                      t(
                        "church.livestream.brand.name",
                      )}
                </div>

                <h2>
                  {currentLive.title}
                </h2>

                <div className="church-live-service__speaker">
                  <div
                    className="church-live-service__speaker-avatar"
                    aria-hidden="true"
                  >
                    FC
                  </div>

                  <div>
                    <span>
                      {t(
                        "church.livestream.brand.name",
                      )}
                    </span>

                    <strong>
                      {t(
                        "church.livestream.service.liveWorship",
                      )}
                    </strong>
                  </div>
                </div>

                {currentLive.description && (
                  <p className="church-live-service__description">
                    {
                      currentLive.description
                    }
                  </p>
                )}

                {currentLive.visibility ===
                  LiveEventVisibility.Private &&
                  !currentLive.currentUserHasAccess && (
                    <div>
                      <label
                        htmlFor="church-live-guest-email"
                        className="church-live-eyebrow"
                      >
                        {t(
                          "church.livestream.guestAccess",
                        )}
                      </label>

                      <input
                        id="church-live-guest-email"
                        type="email"
                        className="church-input"
                        placeholder={t(
                          "church.livestream.guestEmailPlaceholder",
                        )}
                        autoComplete="email"
                        value={
                          guestEmail
                        }
                        onChange={(
                          event,
                        ) => {
                          setGuestEmail(
                            event.target
                              .value,
                          );

                          if (
                            joinError
                          ) {
                            setJoinError(
                              null,
                            );
                          }
                        }}
                      />
                    </div>
                  )}

                <div className="church-live-service__actions">
                  <button
                    type="button"
                    className="church-live-watch-button"
                    onClick={() =>
                      void handleWatchLive(
                        currentLive,
                      )
                    }
                    disabled={
                      isJoining
                    }
                    aria-busy={
                      isJoining
                    }
                  >
                    <span className="church-live-watch-button__icon">
                      ▶
                    </span>

                    {isJoining
                      ? t(
                          "church.livestream.connecting",
                        )
                      : t(
                          "church.livestream.actions.watchLive",
                        )}
                  </button>

                  <button
                    type="button"
                    className="church-live-secondary-button"
                    onClick={() =>
                      void handleShare()
                    }
                  >
                    {t(
                      "church.livestream.actions.share",
                    )}
                  </button>
                </div>

                {joinError && (
                  <p
                    className="church-alert church-alert--error"
                    role="alert"
                  >
                    {joinError}
                  </p>
                )}
              </div>

              <div className="church-live-preview">
                <div className="church-live-preview__screen">
                  {playback?.eventId ===
                  currentLive.id ? (
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
                      style={{
                        width:
                          "100%",
                        height:
                          "100%",
                        objectFit:
                          "cover",
                      }}
                    >
                      {t(
                        "church.livestream.video.unsupported",
                      )}
                    </video>
                  ) : (
                    <div className="church-live-preview__overlay">
                      <div className="church-live-preview__live">
                        <span
                          aria-hidden="true"
                        />
                        {t(
                          "church.livestream.liveNowShort",
                        )}
                      </div>

                      <div className="church-live-preview__center">
                        <button
                          type="button"
                          aria-label={t(
                            "church.livestream.actions.watchLive",
                          )}
                          onClick={() =>
                            void handleWatchLive(
                              currentLive,
                            )
                          }
                          className="church-live-preview__play"
                          disabled={
                            isJoining
                          }
                          aria-busy={
                            isJoining
                          }
                        >
                          ▶
                        </button>
                      </div>

                      <div className="church-live-preview__bottom">
                        <span>
                          {t(
                            "church.livestream.brand.name",
                          )}
                        </span>

                        {typeof currentLive.viewerCount ===
                          "number" && (
                          <span>
                            {currentLive.viewerCount.toLocaleString(
                              getDateLocale(
                                language,
                              ),
                            )}{" "}
                            {t(
                              "church.livestream.watching",
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="church-live-service__empty">
            <span className="church-live-eyebrow">
              {t(
                "church.livestream.brand.name",
              )}
            </span>

            <h2>
              {t(
                "church.livestream.empty.title",
              )}
            </h2>

            <p>
              {t(
                "church.livestream.empty.description",
              )}
            </p>

            <div className="church-live-service__actions">
              <button
                type="button"
                className="church-live-watch-button"
                onClick={
                  handleScheduleLive
                }
              >
                {t(
                  "church.livestream.actions.scheduleService",
                )}
              </button>

              <button
                type="button"
                className="church-live-secondary-button"
                onClick={
                  handleOpenMeeting
                }
              >
                {t(
                  "church.livestream.actions.openMeeting",
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>

    <section className="church-live-info-section">
      <div className="church-live-container">
        <div className="church-live-info-grid">
          <article className="church-live-info-card">
            <span
              className="church-live-info-card__icon"
              aria-hidden="true"
            >
              ♡
            </span>

            <div>
              <h3>
                {t(
                  "church.livestream.info.prayer.title",
                )}
              </h3>

              <p>
                {t(
                  "church.livestream.info.prayer.description",
                )}
              </p>

              <button
                type="button"
              >
                {t(
                  "church.livestream.info.prayer.action",
                )}
              </button>
            </div>
          </article>

          <article className="church-live-info-card">
            <span
              className="church-live-info-card__icon"
              aria-hidden="true"
            >
              ◷
            </span>

            <div>
              <h3>
                {t(
                  "church.livestream.info.upcoming.title",
                )}
              </h3>

              <p>
                {t(
                  "church.livestream.info.upcoming.description",
                )}
              </p>

              <Link to="/church#events">
                {t(
                  "church.livestream.info.upcoming.action",
                )}
              </Link>
            </div>
          </article>

          <article className="church-live-info-card">
            <span
              className="church-live-info-card__icon"
              aria-hidden="true"
            >
              $
            </span>

            <div>
              <h3>
                {t(
                  "church.livestream.info.mission.title",
                )}
              </h3>

              <p>
                {t(
                  "church.livestream.info.mission.description",
                )}
              </p>

              <Link to="/church#give">
                {t(
                  "church.livestream.info.mission.action",
                )}
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section className="church-live-upcoming">
      <div className="church-live-container">
        <div className="church-live-section-heading">
          <div>
            <span>
              {t(
                "church.livestream.upcoming.eyebrow",
              )}
            </span>

            <h2>
              {t(
                "church.livestream.upcoming.title",
              )}
            </h2>
          </div>

          <button
            type="button"
            className="church-live-secondary-button"
            onClick={
              handleScheduleLive
            }
          >
            {t(
              "church.livestream.actions.scheduleLive",
            )}
          </button>
        </div>

        {upcoming.length === 0 ? (
          <div className="church-empty-state">
            <p>
              {t(
                "church.livestream.upcoming.empty",
              )}
            </p>

            <button
              type="button"
              className="church-live-watch-button"
              onClick={
                handleScheduleLive
              }
            >
              {t(
                "church.livestream.actions.scheduleFirstService",
              )}
            </button>
          </div>
        ) : (
          <div className="church-live-schedule">
            {upcoming.map(
              (event) => (
                <article
                  key={event.id}
                  className="church-live-schedule__item"
                >
                  <div>
                    <span className="church-live-eyebrow">
                      {t(
                        VISIBILITY_KEYS[
                          event.visibility
                        ],
                      )}
                    </span>

                    <h3>
                      {event.title}
                    </h3>

                    <p>
                      {formatDate(
                        event.scheduledStart,
                        language,
                      )}{" "}
                      ·{" "}
                      {formatTime(
                        event.scheduledStart,
                        language,
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
                      className="church-live-secondary-button"
                      onClick={() =>
                        void handleShare()
                      }
                    >
                      {t(
                        "church.livestream.actions.share",
                      )}
                    </button>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </div>
    </section>

    <section className="church-live-previous">
      <div className="church-live-container">
        <div className="church-live-section-heading">
          <div>
            <span>
              {t(
                "church.livestream.replays.eyebrow",
              )}
            </span>

            <h2>
              {t(
                "church.livestream.replays.title",
              )}
            </h2>
          </div>

          <Link to="/church#sermons">
            {t(
              "church.livestream.replays.viewAll",
            )}
          </Link>
        </div>

        <div className="church-live-replay-grid">
          {previousLivestreams.map(
            (stream) => (
              <article
                key={stream.id}
                className="church-live-replay-card"
              >
                <div className="church-live-replay-card__thumbnail">
                  {stream.thumbnailUrl ? (
                    <img
                      src={
                        stream.thumbnailUrl
                      }
                      alt=""
                      loading="lazy"
                    />
                  ) : null}

                  <div
                    className="church-live-replay-card__play"
                    aria-hidden="true"
                  >
                    ▶
                  </div>

                  <span>
                    {stream.duration}
                  </span>
                </div>

                <div className="church-live-replay-card__content">
                  <span>
                    {t(
                      stream.dateKey,
                    )}
                  </span>

                  <h3>
                    {t(
                      stream.titleKey,
                    )}
                  </h3>

                  {stream.playbackUrl ? (
                    <a
                      href={
                        stream.playbackUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t(
                        "church.livestream.replays.watch",
                      )}
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          "/church#sermons",
                        )
                      }
                    >
                      {t(
                        "church.livestream.replays.watch",
                      )}
                    </button>
                  )}
                </div>
              </article>
            ),
          )}
        </div>
      </div>
    </section>

    <section className="church-live-upcoming">
      <div className="church-live-container">
        <div className="church-live-upcoming__inner">
          <div>
            <span>
              {t(
                "church.livestream.nextService.eyebrow",
              )}
            </span>

            <h2>
              {t(
                "church.livestream.nextService.title",
              )}
            </h2>

            <p>
              {t(
                "church.livestream.nextService.description",
              )}
            </p>
          </div>

          {upcoming[0] && (
            <div className="church-live-upcoming__details">
              <div>
                <strong>
                  {formatDate(
                    upcoming[0]
                      .scheduledStart,
                    language,
                  )}
                </strong>

                <span>
                  {formatTime(
                    upcoming[0]
                      .scheduledStart,
                    language,
                  )}
                </span>
              </div>

              <div>
                <strong>
                  {upcoming[0]
                    .location ||
                    t(
                      "church.livestream.brand.name",
                    )}
                </strong>

                <span>
                  {upcoming[0]
                    .isOnline
                    ? t(
                        "church.livestream.service.onlineShort",
                      )
                    : t(
                        "church.livestream.service.inPerson",
                      )}
                </span>
              </div>
            </div>
          )}

          <div className="church-live-upcoming__actions">
            <Link to="/church#locations">
              {t(
                "church.livestream.nextService.findLocation",
              )}
            </Link>

            <Link to="/church#events">
              {t(
                "church.livestream.nextService.viewEvents",
              )}
            </Link>
          </div>
        </div>
      </div>
    </section>
  </main>

  <footer className="church-live-footer">
    <div className="church-live-container">
      <div className="church-live-footer__main">
        <Link
          to={CHURCH_ROUTES.home}
          className="church-live-footer__brand"
        >
          <img
            src={LOGO}
            alt={t(
              "church.livestream.brand.logoAlt",
            )}
          />

          <div>
            <strong>
              {t(
                "church.livestream.brand.name",
              )}
            </strong>

            <span>
              {t(
                "church.livestream.footer.welcome",
              )}
            </span>
          </div>
        </Link>

        <div className="church-live-footer__links">
          <Link to="/church">
            {t(
              "church.navigation.home",
            )}
          </Link>

          <Link to="/church#welcome">
            {t(
              "church.navigation.about",
            )}
          </Link>

          <Link to="/church#events">
            {t(
              "church.navigation.events",
            )}
          </Link>

          <Link to="/church#sermons">
            {t(
              "church.navigation.sermons",
            )}
          </Link>

          <Link to="/church/live">
            {t(
              "church.navigation.livestream",
            )}
          </Link>

          <Link to="/church#give">
            {t(
              "church.navigation.give",
            )}
          </Link>
        </div>
      </div>

      <div className="church-live-footer__bottom">
        <span>
          {t(
            "church.livestream.footer.copyright",
          )}
        </span>

        <span>
          {t(
            "church.livestream.footer.poweredBy",
          )}
        </span>
      </div>
    </div>
  </footer>
</div>
);
}