import {

  useCallback,

  useEffect,

  useMemo,

  useState,

  type FormEvent,

  type MouseEvent,

} from "react";



import {

  Link,

  useNavigate,

} from "react-router-dom";



import { musicApi } from "../services/musicApi";



import type {

  MusicAccessType,

  MusicContent,

  MusicContentType,

} from "../types/music.types";



import "../styles/MusicHome.scss";

import LanguageSelector from "../../../i18n/components/LanguageSelector";



// ============================================================================

// TYPES

// ============================================================================



type HomeCategory =

  | "all"

  | "music"

  | "video"

  | "creator";



// ============================================================================

// CONSTANTS

// ============================================================================



/**

 * Canonical music categories supported by the backend.

 *

 * IMPORTANT:

 * Do not put UI-only categories such as:

 *   movie

 *   fashion

 *   event

 *   announcement

 *   creator_update

 *

 * in this list.

 *

 * Those are UI concepts, not backend MusicContentType values.

 */

const MUSIC_TYPES = new Set<MusicContentType>([

  "song",

  "single",

  "album",

  "ep",

  "beat",

  "instrumental",

  "music",

  "audio",

  "track",

]);



/**

 * Canonical video-oriented content types.

 */

const VIDEO_TYPES = new Set<MusicContentType>([

  "video",

  "music_video",

  "live_performance",

  "interview",

  "behind_the_scenes",

  "tutorial",

  "exclusive_video",

]);



/**

 * Creator/lifestyle content is now determined from the actual media

 * and canonical content types rather than invalid backend categories.

 *

 * These are intentionally valid MusicContentType values only.

 */

const CREATOR_TYPES = new Set<MusicContentType>([

  "video",

  "live_performance",

  "interview",

  "behind_the_scenes",

  "tutorial",

  "exclusive_video",

]);



/**

 * Every canonical backend content type gets a display label.

 */

const TYPE_LABELS: Record<MusicContentType, string> = {

  song: "Song",

  single: "Single",

  album: "Album",

  ep: "EP",

  beat: "Beat",

  instrumental: "Instrumental",

  music: "Music",

  audio: "Audio",

  track: "Track",

  music_video: "Music Video",

  video: "Video",

  live_performance: "Live Performance",

  interview: "Interview",

  behind_the_scenes: "Behind the Scenes",

  tutorial: "Tutorial",

  exclusive: "Exclusive",

  exclusive_video: "Exclusive Video",

};



/**

 * Icons for every canonical backend content type.

 */

const TYPE_ICONS: Record<MusicContentType, string> = {

  song: "🎵",

  single: "🎧",

  album: "💿",

  ep: "📀",

  beat: "🥁",

  instrumental: "🎹",

  music: "🎵",

  audio: "🔊",

  track: "🎧",

  music_video: "🎬",

  video: "🎥",

  live_performance: "🎤",

  interview: "🎙️",

  behind_the_scenes: "🎥",

  tutorial: "📚",

  exclusive: "⭐",

  exclusive_video: "⭐",

};



const ACCESS_LABELS: Record<MusicAccessType, string> = {

  free: "Free",

  preview_paid: "Preview + Paid",

  paid: "Paid",

  premium: "Premium",

  exclusive: "Exclusive",

};



// ============================================================================

// ID HELPERS

// ============================================================================



/**

 * Resolve the content identifier defensively.

 *

 * The backend may return:

 *   id

 *   _id

 *   contentId

 *   musicContentId

 *

 * or an ObjectId represented as:

 *

 *   { $oid: "..." }

 *

 * Never allow an undefined ID to reach /music/:id.

 */

function getContentId(

  item: MusicContent,

): string {

  const value = item as MusicContent & {

    id?: unknown;

    _id?: unknown;

    contentId?: unknown;

    musicContentId?: unknown;

  };



  const candidates = [

    value.id,

    value._id,

    value.contentId,

    value.musicContentId,

  ];



  for (const candidate of candidates) {

    if (

      typeof candidate === "string" &&

      candidate.trim()

    ) {

      return candidate.trim();

    }



    if (

      candidate &&

      typeof candidate === "object"

    ) {

      const objectId =

        candidate as {

          $oid?: unknown;

        };



      if (

        typeof objectId.$oid === "string" &&

        objectId.$oid.trim()

      ) {

        return objectId.$oid.trim();

      }

    }

  }



  return "";

}



/**

 * Resolve producer ID defensively.

 */

function getProducerId(

  item: MusicContent,

): string {

  const value = item as MusicContent & {

    producerId?: unknown;

    producer?: unknown;

  };



  if (

    typeof value.producerId === "string" &&

    value.producerId.trim()

  ) {

    return value.producerId.trim();

  }



  if (

    value.producer &&

    typeof value.producer === "object"

  ) {

    const producer =

      value.producer as {

        id?: unknown;

        _id?: unknown;

      };



    if (

      typeof producer.id === "string" &&

      producer.id.trim()

    ) {

      return producer.id.trim();

    }



    if (

      typeof producer._id === "string" &&

      producer._id.trim()

    ) {

      return producer._id.trim();

    }



    if (

      producer._id &&

      typeof producer._id === "object"

    ) {

      const objectId =

        producer._id as {

          $oid?: unknown;

        };



      if (

        typeof objectId.$oid === "string" &&

        objectId.$oid.trim()

      ) {

        return objectId.$oid.trim();

      }

    }

  }



  return "";

}



// ============================================================================

// CONTENT HELPERS

// ============================================================================



function getProducerName(

  item: MusicContent,

): string {

  return (

    item.producerName?.trim() ||

    "Fockis Creator"

  );

}



function getType(

  item: MusicContent,

): MusicContentType {

  return item.type;

}



function getTypeLabel(

  item: MusicContent,

): string {

  return (

    TYPE_LABELS[getType(item)] ||

    "Content"

  );

}



function getTypeIcon(

  item: MusicContent,

): string {

  return (

    TYPE_ICONS[getType(item)] ||

    (item.mediaKind === "video"

      ? "🎬"

      : "🎵")

  );

}



function getAccessLabel(

  item: MusicContent,

): string {

  return (

    ACCESS_LABELS[item.accessType] ||

    "Content"

  );

}



// ============================================================================

// CATEGORY CLASSIFICATION

// ============================================================================



/**

 * Determines whether content belongs to the music section.

 *

 * Includes:

 *   song

 *   single

 *   album

 *   ep

 *   beat

 *   instrumental

 *   music

 *   audio

 *   track

 */

function isMusic(

  item: MusicContent,

): boolean {

  return MUSIC_TYPES.has(item.type);

}



/**

 * Determines whether content belongs to the video section.

 *

 * mediaKind is also checked because the backend may eventually introduce

 * additional video-oriented content types.

 */

function isVideo(

  item: MusicContent,

): boolean {

  return (

    item.mediaKind === "video" ||

    VIDEO_TYPES.has(item.type)

  );

}



/**

 * Creator & Lifestyle is a UI grouping.

 *

 * It is intentionally NOT a backend MusicContentType.

 *

 * This lets the home page show creator-oriented content without inventing

 * invalid API categories.

 */

function isCreatorContent(

  item: MusicContent,

): boolean {

  return (

    isVideo(item) &&

    CREATOR_TYPES.has(item.type)

  );

}



// ============================================================================

// ACCESS HELPERS

// ============================================================================



function isFree(

  item: MusicContent,

): boolean {

  return item.accessType === "free";

}



function isPaid(

  item: MusicContent,

): boolean {

  return item.accessType !== "free";

}



function isPremiumAccess(

  item: MusicContent,

): boolean {

  return (

    item.accessType === "premium" ||

    item.accessType === "exclusive" ||

    item.isExclusive === true

  );

}



// ============================================================================

// ANALYTICS HELPERS

// ============================================================================



function getPlayCount(

  item: MusicContent,

): number {

  return Math.max(

    0,

    item.playCount ?? 0,

  );

}



function getViewCount(

  item: MusicContent,

): number {

  return Math.max(

    0,

    item.viewCount ?? 0,

  );

}



function getPurchaseCount(

  item: MusicContent,

): number {

  return Math.max(

    0,

    item.purchaseCount ?? 0,

  );

}



function getFavoriteCount(

  item: MusicContent,

): number {

  return Math.max(

    0,

    item.favoriteCount ?? 0,

  );

}



function getReleaseTime(

  item: MusicContent,

): number {

  const value =

    item.releaseDate ||

    item.createdAt;



  if (!value) {

    return 0;

  }



  const time =

    new Date(value).getTime();



  return Number.isFinite(time)

    ? time

    : 0;

}



/**

 * Client-side display ranking only.

 *

 * This is not official Fockis analytics.

 */

function getPopularityScore(

  item: MusicContent,

): number {

  return (

    getPlayCount(item) * 3 +

    getViewCount(item) +

    getPurchaseCount(item) * 8 +

    getFavoriteCount(item) * 2

  );

}



// ============================================================================

// IMAGE / PRICE HELPERS

// ============================================================================



function getCoverImage(

  item: MusicContent,

): string | undefined {

  const candidates = [

    item.coverImageUrl,

    item.thumbnailUrl,

  ];



  return candidates.find(

    (value) =>

      typeof value === "string" &&

      value.trim().length > 0,

  );

}



function formatNumber(

  value: number,

): string {

  if (

    !Number.isFinite(value) ||

    value <= 0

  ) {

    return "0";

  }



  if (value >= 1_000_000) {

    return `${(

      value / 1_000_000

    )

      .toFixed(1)

      .replace(/\.0$/, "")}M`;

  }



  if (value >= 1_000) {

    return `${(

      value / 1_000

    )

      .toFixed(1)

      .replace(/\.0$/, "")}K`;

  }



  return value.toLocaleString(

    "en-US",

  );

}



function formatCurrency(

  minor: number,

  currency = "USD",

): string {

  try {

    return new Intl.NumberFormat(

      "en-US",

      {

        style: "currency",

        currency:

          currency.toUpperCase(),

        maximumFractionDigits: 2,

      },

    ).format(minor / 100);

  } catch {

    return `$${(

      minor / 100

    ).toFixed(2)}`;

  }

}



function formatPrice(

  item: MusicContent,

): string {

  if (isFree(item)) {

    return "Free";

  }



  const extended =

    item as MusicContent & {

      priceMinor?: unknown;

    };



  const amount =

    typeof extended.priceMinor ===

    "number"

      ? extended.priceMinor

      : item.priceCents;



  if (

    !Number.isFinite(amount) ||

    amount <= 0

  ) {

    return getAccessLabel(item);

  }



  return formatCurrency(

    amount,

    item.currency || "USD",

  );

}



// ============================================================================

// ARRAY HELPERS

// ============================================================================



/**

 * Remove records without a usable content ID and remove duplicates.

 */

function dedupeContent(

  items: MusicContent[],

): MusicContent[] {

  const seen =

    new Set<string>();



  return items.filter(

    (item) => {

      const id =

        getContentId(item);



      if (!id) {

        console.warn(

          "[Fockis Music] Ignoring content item without an ID:",

          item,

        );



        return false;

      }



      if (seen.has(id)) {

        return false;

      }



      seen.add(id);



      return true;

    },

  );

}



function takeUnique(

  items: MusicContent[],

  limit: number,

): MusicContent[] {

  return dedupeContent(items).slice(

    0,

    limit,

  );

}



// ============================================================================

// CONTENT CARD

// ============================================================================



function MusicCard({

  item,

}: {

  item: MusicContent;

}) {

  const navigate =

    useNavigate();



  const id =

    getContentId(item);



  const producerId =

    getProducerId(item);



  const cover =

    getCoverImage(item);



  const openContent =

    () => {

      if (!id) {

        console.warn(

          "[Fockis Music] Cannot open content without an ID:",

          item,

        );



        return;

      }



      navigate(

        `/music/${encodeURIComponent(

          id,

        )}`,

      );

    };



  const openProducer =

    (

      event: MouseEvent<HTMLButtonElement>,

    ) => {

      event.stopPropagation();



      if (!producerId) {

        return;

      }



      navigate(

        `/music/producers/${encodeURIComponent(

          producerId,

        )}`,

      );

    };



  return (

    <article className="music-home-card">

      <button

        type="button"

        className="music-home-card-art-button"

        onClick={openContent}

        disabled={!id}

        aria-label={`Open ${item.title}`}

      >

        <div className="music-home-card-art">

          {cover ? (

            <img

              src={cover}

              alt=""

              loading="lazy"

              onError={(event) => {

                event.currentTarget.style.display =

                  "none";

              }}

            />

          ) : (

            <div className="music-home-card-art-placeholder">

              <span>

                {getTypeIcon(item)}

              </span>

            </div>

          )}



          <span className="music-home-card-play">

            ▶

          </span>



          <span className="music-home-card-type">

            {getTypeIcon(item)}{" "}

            {getTypeLabel(item)}

          </span>



          <span className="music-home-card-access">

            {getAccessLabel(item)}

          </span>

        </div>

      </button>



      <div className="music-home-card-body">

        <button

          type="button"

          className="music-home-card-title-button"

          onClick={openContent}

          disabled={!id}

          aria-label={`Open ${item.title}`}

        >

          <h3>{item.title}</h3>

        </button>



        <button

          type="button"

          className="music-home-card-producer-button"

          onClick={openProducer}

          disabled={!producerId}

        >

          {getProducerName(item)}

        </button>



        <div className="music-home-card-meta">

          <span>

            {formatNumber(

              getPlayCount(item),

            )}{" "}

            plays

          </span>



          <span>

            {formatNumber(

              getViewCount(item),

            )}{" "}

            views

          </span>



          <span>

            {formatPrice(item)}

          </span>

        </div>



        {item.genre && (

          <div className="music-home-card-exclusive">

            #

            {item.genre.replace(

              /_/g,

              " ",

            )}

          </div>

        )}



        {item.isExclusive && (

          <div className="music-home-card-exclusive">

            🔒 Exclusive

          </div>

        )}

      </div>

    </article>

  );

}



// ============================================================================

// RANKING CARD

// ============================================================================



function RankingCard({

  item,

  rank,

}: {

  item: MusicContent;

  rank: number;

}) {

  const navigate =

    useNavigate();



  const id =

    getContentId(item);



  const cover =

    getCoverImage(item);



  const openContent =

    () => {

      if (!id) {

        console.warn(

          "[Fockis Music] Cannot open ranking item without an ID:",

          item,

        );



        return;

      }



      navigate(

        `/music/${encodeURIComponent(

          id,

        )}`,

      );

    };



  const rankLabel =

    rank === 1

      ? "🥇"

      : rank === 2

        ? "🥈"

        : rank === 3

          ? "🥉"

          : `#${rank}`;



  return (

    <article className="music-ranking-card">

      <div className="music-ranking-position">

        {rankLabel}

      </div>



      <button

        type="button"

        className="music-ranking-art-button"

        onClick={openContent}

        disabled={!id}

        aria-label={`Open ${item.title}`}

      >

        <div className="music-ranking-art">

          {cover ? (

            <img

              src={cover}

              alt=""

              loading="lazy"

            />

          ) : (

            <div className="music-ranking-placeholder">

              {getTypeIcon(item)}

            </div>

          )}



          <span className="music-ranking-play">

            ▶

          </span>

        </div>

      </button>



      <div className="music-ranking-info">

        <div className="music-ranking-topline">

          <span>

            {getTypeIcon(item)}{" "}

            {getTypeLabel(item)}

          </span>



          <span>

            {getAccessLabel(item)}

          </span>

        </div>



        <button

          type="button"

          className="music-ranking-title-button"

          onClick={openContent}

          disabled={!id}

          aria-label={`Open ${item.title}`}

        >

          <h3>{item.title}</h3>

        </button>



        <p>

          {getProducerName(item)}

        </p>



        <div className="music-ranking-stats">

          <strong>

            {formatNumber(

              getPlayCount(item),

            )}{" "}

            plays

          </strong>



          <span>

            {formatPrice(item)}

          </span>

        </div>

      </div>



      <div className="music-ranking-action">

        <button

          type="button"

          onClick={openContent}

          disabled={!id}

        >

          ▶ Open

        </button>



        {isPaid(item) && (

          <span>

            🔓 {getAccessLabel(item)}

          </span>

        )}

      </div>

    </article>

  );

}



// ============================================================================

// SECTION

// ============================================================================



function MusicSection({

  title,

  icon,

  description,

  items,

  viewAllTo,

  emptyTitle = "Nothing here yet",

  emptyDescription =

    "New creator content will appear here when it is published.",

}: {

  title: string;

  icon?: string;

  description?: string;

  items: MusicContent[];

  viewAllTo: string;

  emptyTitle?: string;

  emptyDescription?: string;

}) {

  return (

    <section className="music-home-section">

      <div className="music-section-heading">

        <div>

          <h2>

            {icon && (

              <span aria-hidden="true">

                {icon}{" "}

              </span>

            )}



            {title}

          </h2>



          <p>

            {description ||

              "Discover content from Fockis creators."}

          </p>

        </div>



        <Link

          to={viewAllTo}

          className="music-section-view-all"

        >

          View all →

        </Link>

      </div>



      {items.length > 0 ? (

        <div className="music-card-grid">

          {items.map((item) => (

            <MusicCard

              key={getContentId(item)}

              item={item}

            />

          ))}

        </div>

      ) : (

        <div className="music-empty-state">

          <span aria-hidden="true">

            {icon || "✨"}

          </span>



          <h3>

            {emptyTitle}

          </h3>



          <p>

            {emptyDescription}

          </p>

        </div>

      )}

    </section>

  );

}



// ============================================================================

// STAT CARD

// ============================================================================



function StatCard({

  icon,

  value,

  label,

  description,

}: {

  icon: string;

  value: string;

  label: string;

  description: string;

}) {

  return (

    <div className="music-stat-card">

      <span

        className="music-stat-icon"

        aria-hidden="true"

      >

        {icon}

      </span>



      <div className="music-stat-body">

        <span className="music-stat-label">

          {label}

        </span>



        <strong className="music-stat-value">

          {value}

        </strong>



        <span className="music-stat-description">

          {description}

        </span>

      </div>

    </div>

  );

}



// ============================================================================

// PAGE

// ============================================================================



export default function MusicHomePage() {

  const navigate =

    useNavigate();



  const [

    allContent,

    setAllContent,

  ] = useState<MusicContent[]>([]);



  const [

    totalContent,

    setTotalContent,

  ] = useState(0);



  const [

    loading,

    setLoading,

  ] = useState(true);



  const [

    error,

    setError,

  ] = useState<string | null>(null);



  const [

    search,

    setSearch,

  ] = useState("");



  const [

    activeCategory,

    setActiveCategory,

  ] =

    useState<HomeCategory>("all");



  // ==========================================================================

  // LOAD HOME DATA

  // ==========================================================================



  const loadHome =

    useCallback(

      async (

        signal?: AbortSignal,

      ) => {

        setLoading(true);

        setError(null);



        try {

          const response =

            await musicApi.home();



          if (signal?.aborted) {

            return;

          }



          const rawItems =

            Array.isArray(

              response.items,

            )

              ? response.items

              : [];



          /*

           * Critical protection:

           *

           * Remove malformed API records before

           * they can create /music/undefined URLs.

           */

          const items =

            dedupeContent(

              rawItems,

            );



          setAllContent(items);



          setTotalContent(

            Math.max(

              0,

              response.total ?? 0,

            ),

          );

        } catch (err) {

          if (signal?.aborted) {

            return;

          }



          setError(

            err instanceof Error

              ? err.message

              : "Fockis Music could not be loaded.",

          );

        } finally {

          if (!signal?.aborted) {

            setLoading(false);

          }

        }

      },

      [],

    );



  useEffect(() => {

    const controller =

      new AbortController();



    void loadHome(

      controller.signal,

    );



    return () => {

      controller.abort();

    };

  }, [loadHome]);



  // ==========================================================================

  // CATEGORY FILTER

  // ==========================================================================



  const visibleContent =

    useMemo(() => {

      switch (activeCategory) {

        case "music":

          return allContent.filter(

            isMusic,

          );



        case "video":

          return allContent.filter(

            isVideo,

          );



        case "creator":

          return allContent.filter(

            isCreatorContent,

          );



        case "all":

        default:

          return allContent;

      }

    }, [

      allContent,

      activeCategory,

    ]);



  // ==========================================================================

  // TRENDING

  // ==========================================================================



  const trending =

    useMemo(

      () =>

        takeUnique(

          [...visibleContent].sort(

            (a, b) =>

              getPopularityScore(b) -

              getPopularityScore(a),

          ),

          5,

        ),

      [visibleContent],

    );



  // ==========================================================================

  // TOP PERFORMERS

  // ==========================================================================



  const topPerformers =

    useMemo(

      () =>

        takeUnique(

          [...visibleContent].sort(

            (a, b) =>

              getPopularityScore(b) -

              getPopularityScore(a),

          ),

          8,

        ),

      [visibleContent],

    );



  // ==========================================================================

  // MUSIC

  // ==========================================================================



  const musicContent =

    useMemo(

      () =>

        takeUnique(

          allContent

            .filter(isMusic)

            .sort(

              (a, b) =>

                getPopularityScore(b) -

                getPopularityScore(a),

            ),

          8,

        ),

      [allContent],

    );



  // ==========================================================================

  // VIDEO

  // ==========================================================================



  const videoContent =

    useMemo(

      () =>

        takeUnique(

          allContent

            .filter(isVideo)

            .sort(

              (a, b) =>

                getPopularityScore(b) -

                getPopularityScore(a),

            ),

          8,

        ),

      [allContent],

    );



  // ==========================================================================

  // CREATOR / LIFESTYLE

  // ==========================================================================



  const creatorContent =

    useMemo(

      () =>

        takeUnique(

          allContent

            .filter(isCreatorContent)

            .sort(

              (a, b) =>

                getPopularityScore(b) -

                getPopularityScore(a),

            ),

          8,

        ),

      [allContent],

    );



  // ==========================================================================

  // MOST PURCHASED

  // ==========================================================================



  const mostPurchased =

    useMemo(

      () =>

        takeUnique(

          allContent

            .filter(isPaid)

            .sort(

              (a, b) =>

                getPurchaseCount(b) -

                getPurchaseCount(a),

            ),

          8,

        ),

      [allContent],

    );



  // ==========================================================================

  // RISING

  // ==========================================================================



  const risingContent =

    useMemo(() => {

      const now =

        Date.now();



      return takeUnique(

        [...allContent].sort(

          (a, b) => {

            const getRisingScore =

              (

                item: MusicContent,

              ) => {

                const release =

                  getReleaseTime(item);



                const ageDays =

                  release > 0

                    ? Math.max(

                        1,

                        (now - release) /

                          86_400_000,

                      )

                    : 30;



                const freshness =

                  Math.max(

                    0.25,

                    Math.min(

                      30 / ageDays,

                      8,

                    ),

                  );



                return (

                  getPopularityScore(item) *

                  freshness

                );

              };



            return (

              getRisingScore(b) -

              getRisingScore(a)

            );

          },

        ),

        8,

      );

    }, [allContent]);



  // ==========================================================================

  // NEW RELEASES

  // ==========================================================================



  const newReleases =

    useMemo(

      () =>

        takeUnique(

          [...allContent].sort(

            (a, b) =>

              getReleaseTime(b) -

              getReleaseTime(a),

          ),

          8,

        ),

      [allContent],

    );



  // ==========================================================================

  // FREE

  // ==========================================================================



  const freeContent =

    useMemo(

      () =>

        takeUnique(

          allContent

            .filter(isFree)

            .sort(

              (a, b) =>

                getPopularityScore(b) -

                getPopularityScore(a),

            ),

          8,

        ),

      [allContent],

    );



  // ==========================================================================

  // FEATURED

  // ==========================================================================



  const featured =

    useMemo(() => {

      const featuredItems =

        allContent.filter(

          (item) =>

            item.isFeatured === true,

        );



      if (

        featuredItems.length > 0

      ) {

        return takeUnique(

          [...featuredItems].sort(

            (a, b) =>

              getPopularityScore(b) -

              getPopularityScore(a),

          ),

          8,

        );

      }



      return takeUnique(

        [...allContent].sort(

          (a, b) =>

            getPopularityScore(b) -

            getPopularityScore(a),

        ),

        8,

      );

    }, [allContent]);



  // ==========================================================================

  // PREMIUM / EXCLUSIVE

  // ==========================================================================



  const premiumContent =

    useMemo(

      () =>

        takeUnique(

          allContent

            .filter(isPremiumAccess)

            .sort(

              (a, b) =>

                getPopularityScore(b) -

                getPopularityScore(a),

            ),

          8,

        ),

      [allContent],

    );



  // ==========================================================================

  // TOTALS

  // ==========================================================================



  const communityPlays =

    useMemo(

      () =>

        allContent.reduce(

          (total, item) =>

            total +

            getPlayCount(item),

          0,

        ),

      [allContent],

    );



  const communityViews =

    useMemo(

      () =>

        allContent.reduce(

          (total, item) =>

            total +

            getViewCount(item),

          0,

        ),

      [allContent],

    );



  const paidPurchases =

    useMemo(

      () =>

        allContent.reduce(

          (total, item) =>

            total +

            getPurchaseCount(item),

          0,

        ),

      [allContent],

    );



  const totalCreators =

    useMemo(() => {

      const producers =

        new Set<string>();



      allContent.forEach(

        (item) => {

          const producerId =

            getProducerId(item);



          if (producerId) {

            producers.add(

              producerId,

            );

          }

        },

      );



      return producers.size;

    }, [allContent]);



  // ==========================================================================

  // SEARCH

  // ==========================================================================



  const handleSearchSubmit =

    (

      event: FormEvent<HTMLFormElement>,

    ) => {

      event.preventDefault();



      const value =

        search.trim();



      if (!value) {

        navigate(

          "/music/explore",

        );



        return;

      }



      navigate(

        `/music/explore?search=${encodeURIComponent(

          value,

        )}`,

      );

    };



  // ==========================================================================

  // RETRY

  // ==========================================================================



  const handleRetry =

    () => {

      void loadHome();

    };



  // ==========================================================================

  // RENDER

  // ==========================================================================



  return (

    <main className="music-home">
      <div
        className="music-home-language-bar"
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          padding: "12px 20px",
          position: "relative",
          zIndex: 20,
        }}
      >
        <LanguageSelector />
      </div>

      {/* ================================================================== */}

      {/* HERO                                                               */}

      {/* ================================================================== */}



      <section className="music-home-hero">

        <div className="music-hero-content">

          <span className="music-hero-kicker">

            FOCKIS MUSIC

          </span>



          <h1>

            Your content.

            <br />

            Your stage.

            <br />

            Your audience.

          </h1>



          <p>

            Discover music, videos,

            beats, performances,

            tutorials and exclusive

            creator content from the

            Fockis community.

          </p>



          <form

            className="music-search"

            onSubmit={

              handleSearchSubmit

            }

          >

            <span

              className="music-search-icon"

              aria-hidden="true"

            >

              🔎

            </span>



            <input

              type="search"

              value={search}

              onChange={(event) =>

                setSearch(

                  event.target.value,

                )

              }

              placeholder="Search music, videos, beats, creators..."

              aria-label="Search Fockis Music"

            />



            <button

              type="submit"

              className="music-primary-button"

            >

              Search

            </button>

          </form>



          <div className="music-hero-actions">

            <Link

              to="/music/explore"

              className="music-primary-button"

            >

              Explore Content

            </Link>



            <Link

              to="/music/charts"

              className="music-secondary-button"

            >

              🏆 Browse Charts

            </Link>



            <Link

              to="/music/studio"

              className="music-studio-button"

            >

              🎙️ Creator Studio

            </Link>

          </div>

        </div>



        <div

          className="music-hero-visual"

          aria-hidden="true"

        >

          <div className="music-hero-glow" />



          <div className="music-hero-disc">

            <div className="music-disc-center">

              🎵

            </div>

          </div>



          <div className="music-floating-card music-floating-card-one">

            <span>🔥</span>



            <div>

              <strong>

                Trending

              </strong>



              <small>

                Right now

              </small>

            </div>

          </div>



          <div className="music-floating-card music-floating-card-two">

            <span>🏆</span>



            <div>

              <strong>

                Top Content

              </strong>



              <small>

                On Fockis Music

              </small>

            </div>

          </div>

        </div>

      </section>



      {/* ================================================================== */}

      {/* NAVIGATION                                                         */}

      {/* ================================================================== */}



      <nav

        className="music-home-nav"

        aria-label="Fockis Music navigation"

      >

        <Link

          className="music-home-nav-active"

          to="/music"

          aria-current="page"

        >

          Home

        </Link>



        <Link to="/music/explore">

          Explore

        </Link>



        <Link to="/music/charts">

          🏆 Charts

        </Link>



        <Link to="/music/tracks">

          🎵 Music

        </Link>



        <Link to="/music/videos">

          🎬 Videos

        </Link>



        <Link to="/music/albums">

          💿 Albums

        </Link>



        <Link to="/music/producers">

          ✨ Creators

        </Link>



        <Link

          to="/music/studio"

          className="music-home-nav-studio"

        >

          🎙️ Creator Studio

        </Link>

      </nav>



      {/* ================================================================== */}

      {/* DISCOVERY FILTERS                                                  */}

      {/* ================================================================== */}



      <section className="music-home-section music-home-discovery">

        <div className="music-section-heading">

          <div>

            <h2>

              Discover on Fockis

            </h2>



            <p>

              Explore creator content

              across the Fockis Music

              marketplace.

            </p>

          </div>

        </div>



        <div className="music-home-category-filters">

          {(

            [

              [

                "all",

                "✨",

                "All Content",

              ],

              [

                "music",

                "🎵",

                "Music",

              ],

              [

                "video",

                "🎬",

                "Video",

              ],

              [

                "creator",

                "✨",

                "Creator & Lifestyle",

              ],

            ] as const

          ).map(

            ([value, icon, label]) => {

              const active =

                activeCategory ===

                value;



              return (

                <button

                  key={value}

                  type="button"

                  className={

                    active

                      ? "music-home-category-filter active"

                      : "music-home-category-filter"

                  }

                  onClick={() =>

                    setActiveCategory(

                      value,

                    )

                  }

                  aria-pressed={active}

                >

                  <span aria-hidden="true">

                    {icon}

                  </span>



                  {label}

                </button>

              );

            },

          )}

        </div>

      </section>



      {/* ================================================================== */}

      {/* ERROR                                                              */}

      {/* ================================================================== */}



      {error && (

        <section

          className="music-error"

          role="alert"

        >

          <strong>

            Fockis Music could not

            be loaded.

          </strong>



          <span>{error}</span>



          <button

            type="button"

            onClick={

              handleRetry

            }

          >

            Try again

          </button>

        </section>

      )}



      {/* ================================================================== */}

      {/* STATS                                                              */}

      {/* ================================================================== */}



      {!error && (

        <div className="music-stats">

          <StatCard

            icon="🎧"

            value={formatNumber(

              communityPlays,

            )}

            label="Plays"

            description="In loaded content"

          />



          <StatCard

            icon="👁️"

            value={formatNumber(

              communityViews,

            )}

            label="Views"

            description="In loaded content"

          />



          <StatCard

            icon="💳"

            value={formatNumber(

              paidPurchases,

            )}

            label="Purchases"

            description="Content purchases"

          />



          <StatCard

            icon="✨"

            value={formatNumber(

              totalCreators,

            )}

            label="Creators"

            description="Represented on Fockis"

          />

        </div>

      )}



      {/* ================================================================== */}

      {/* LOADING                                                             */}

      {/* ================================================================== */}



      {!error && loading && (

        <section className="music-home-section">

          <div className="music-section-heading">

            <div>

              <h2>

                Loading Fockis Music

              </h2>



              <p>

                Discovering music,

                videos and creator

                content.

              </p>

            </div>

          </div>



          <div className="music-card-grid">

            {Array.from({

              length: 8,

            }).map(

              (_, index) => (

                <div

                  key={index}

                  className="music-home-card music-skeleton-card"

                >

                  <div className="music-skeleton-art" />



                  <div className="music-skeleton-body">

                    <div className="music-skeleton-line" />



                    <div className="music-skeleton-line short" />



                    <div className="music-skeleton-line tiny" />

                  </div>

                </div>

              ),

            )}

          </div>

        </section>

      )}



      {/* ================================================================== */}

      {/* CONTENT                                                            */}

      {/* ================================================================== */}



      {!error &&

        !loading && (

          <>

            {/* ============================================================ */}

            {/* TRENDING                                                      */}

            {/* ============================================================ */}



            <section className="music-home-section music-trending-section">

              <div className="music-section-heading">

                <div>

                  <h2>

                    🔥 Trending Now

                  </h2>



                  <p>

                    Popular content based

                    on the engagement data

                    returned by Fockis.

                  </p>

                </div>



                <Link

                  to="/music/charts"

                  className="music-section-view-all"

                >

                  Full Charts →

                </Link>

              </div>



              {trending.length > 0 ? (

                <div className="music-ranking-list">

                  {trending.map(

                    (

                      item,

                      index,

                    ) => (

                      <RankingCard

                        key={getContentId(

                          item,

                        )}

                        item={item}

                        rank={

                          index + 1

                        }

                      />

                    ),

                  )}

                </div>

              ) : (

                <div className="music-empty-state">

                  <span>

                    🔥

                  </span>



                  <h3>

                    No trending

                    content yet

                  </h3>



                  <p>

                    Published content

                    will begin appearing

                    here as creators build

                    their audiences.

                  </p>

                </div>

              )}

            </section>



            {/* ============================================================ */}

            {/* TOP PERFORMERS                                               */}

            {/* ============================================================ */}



            <MusicSection

              title="Top Performers"

              icon="🏆"

              description="Content receiving the strongest engagement in the Home feed."

              items={topPerformers}

              viewAllTo="/music/charts"

            />



            {/* ============================================================ */}

            {/* MUSIC                                                          */}

            {/* ============================================================ */}



            <MusicSection

              title="Music"

              icon="🎵"

              description="Songs, singles, albums, EPs, beats, instrumentals and audio tracks."

              items={musicContent}

              viewAllTo="/music/tracks"

              emptyTitle="No music yet"

              emptyDescription="Songs, albums, beats and instrumentals will appear here when creators publish them."

            />



            {/* ============================================================ */}

            {/* VIDEO                                                          */}

            {/* ============================================================ */}



            <MusicSection

              title="Video"

              icon="🎬"

              description="Music videos, performances, interviews, tutorials and exclusive videos."

              items={videoContent}

              viewAllTo="/music/videos"

              emptyTitle="No videos yet"

              emptyDescription="Video content will appear here when creators publish it."

            />



            {/* ============================================================ */}

            {/* CREATOR & LIFESTYLE                                           */}

            {/* ============================================================ */}



            <MusicSection

              title="Creator & Lifestyle"

              icon="✨"

              description="Performances, interviews, behind-the-scenes content, tutorials and other creator-focused videos."

              items={creatorContent}

              viewAllTo="/music/videos"

              emptyTitle="No creator content yet"

              emptyDescription="Creator-focused content will appear here when creators publish it."

            />



            {/* ============================================================ */}

            {/* MOST PURCHASED                                                */}

            {/* ============================================================ */}



            <MusicSection

              title="Most Purchased"

              icon="🛒"

              description="Paid content receiving the most purchases."

              items={mostPurchased}

              viewAllTo="/music/explore?sort=most_purchased"

              emptyTitle="No purchases yet"

              emptyDescription="Paid creator content will appear here as your community makes purchases."

            />



            {/* ============================================================ */}

            {/* RISING                                                         */}

            {/* ============================================================ */}



            <MusicSection

              title="Rising Content"

              icon="📈"

              description="Recently released content gaining momentum."

              items={risingContent}

              viewAllTo="/music/explore?sort=trending"

            />



            {/* ============================================================ */}

            {/* NEW RELEASES                                                   */}

            {/* ============================================================ */}



            <MusicSection

              title="New Content"

              icon="🆕"

              description="Freshly published content from Fockis creators."

              items={newReleases}

              viewAllTo="/music/explore?sort=newest"

            />



            {/* ============================================================ */}

            {/* FREE                                                           */}

            {/* ============================================================ */}



            <MusicSection

              title="Free to Explore"

              icon="🆓"

              description="Content available without a purchase."

              items={freeContent}

              viewAllTo="/music/explore?accessType=free"

              emptyTitle="No free content yet"

              emptyDescription="Free content will appear here when creators publish it."

            />



            {/* ============================================================ */}

            {/* FEATURED                                                       */}

            {/* ============================================================ */}



            <MusicSection

              title="Featured on Fockis"

              icon="⭐"

              description="Creator content selected for special visibility."

              items={featured}

              viewAllTo="/music/explore?featured=true"

            />



            {/* ============================================================ */}

            {/* PREMIUM                                                        */}

            {/* ============================================================ */}



            {premiumContent.length > 0 && (

              <MusicSection

                title="Premium & Exclusive"

                icon="🔒"

                description="Premium and exclusive creator content."

                items={premiumContent}

                viewAllTo="/music/explore?accessType=premium"

                emptyTitle="No premium content yet"

                emptyDescription="Premium and exclusive releases will appear here when creators publish them."

              />

            )}



            {/* ============================================================ */}

            {/* CREATOR CTA                                                    */}

            {/* ============================================================ */}



            <section className="music-producer-banner">

              <div>

                <span>

                  FOR CREATORS

                </span>



                <h2>

                  Turn your content

                  into an audience.

                </h2>



                <p>

                  Publish songs, beats,

                  albums, videos,

                  performances,

                  tutorials,

                  interviews,

                  behind-the-scenes

                  content and exclusive

                  releases. Offer free,

                  paid, premium or

                  exclusive access and

                  build your audience on

                  Fockis.

                </p>

              </div>



              <Link

                to="/music/studio"

                className="music-primary-button"

              >

                🎙️ Open Creator

                Studio →

              </Link>

            </section>



            {/* ============================================================ */}

            {/* DATA NOTE                                                      */}

            {/* ============================================================ */}



            {totalContent >

              allContent.length && (

              <div className="music-home-data-note">

                Showing{" "}

                <strong>

                  {allContent.length}

                </strong>{" "}

                of approximately{" "}

                <strong>

                  {totalContent}

                </strong>{" "}

                available Music items.{" "}

                <Link to="/music/explore">

                  Explore all content →

                </Link>

              </div>

            )}

          </>

        )}

    </main>

  );

}