import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  SyntheticEvent,
} from "react";

/* ============================================================================
TYPES

Supports:

Database gift:
_id
name

Realtime gift:
giftId
giftName

Additional optional fields are supported when your
backend/socket sends them.
============================================================================ */

interface GiftAnimationData {
  _id?: string;
  giftId?: string;

  name?: string;
  giftName?: string;

  emoji?: string;

  animation?: string;

  sound?: string;

  duration?: number;

  fullScreenAnimation?: boolean;

  senderId?: string;
  senderName?: string;

  receiverId?: string;

  liveId?: string;

  rarity?: string;

  price?: number;
  coinPrice?: number;
}

interface Props {
  gift: GiftAnimationData | null;
}

/* ============================================================================
API
============================================================================ */

const API_URL =
  "http://localhost:3000";

/* ============================================================================
PARTICLE DATA
============================================================================ */

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  rotation: number;
  drift: number;
}

function createParticles(
  count: number,
): Particle[] {
  return Array.from(
    {
      length: count,
    },
    (_, index) => ({
      id: index,

      x:
        Math.random() * 100,

      y:
        Math.random() * 100,

      size:
        Math.random() * 8 + 3,

      delay:
        Math.random() * 1.5,

      duration:
        Math.random() * 2.5 + 2,

      rotation:
        Math.random() * 360,

      drift:
        Math.random() * 160 - 80,
    }),
  );
}

/* ============================================================================
COMPONENT
============================================================================ */

export default function GiftAnimation({
  gift,
}: Props) {
  const [
    visible,
    setVisible,
  ] = useState(false);

  const [
    videoError,
    setVideoError,
  ] = useState(false);

  /* ==========================================================================
  NORMALIZED VALUES
  ========================================================================== */

  const giftId =
    gift?._id ??
    gift?.giftId ??
    "";

  const giftName =
    gift?.name ??
    gift?.giftName ??
    "Fockis Gift";

  const giftEmoji =
    gift?.emoji ??
    "🎁";

  const senderName =
    gift?.senderName ??
    "Someone";

  const rarity =
    String(
      gift?.rarity ??
        "",
    )
      .trim()
      .toLowerCase();

  const giftPrice =
    gift?.price ??
    gift?.coinPrice ??
    0;

  /* ==========================================================================
  ANIMATION POWER

  Higher value / rarity = more dramatic effect.
  ========================================================================== */

  const animationLevel =
    useMemo(() => {
      if (
        gift?.fullScreenAnimation
      ) {
        return "ultimate";
      }

      if (
        rarity === "diamond"
      ) {
        return "diamond";
      }

      if (
        rarity === "legendary"
      ) {
        return "legendary";
      }

      if (
        rarity === "epic"
      ) {
        return "epic";
      }

      if (
        giftPrice >= 5000
      ) {
        return "ultimate";
      }

      if (
        giftPrice >= 1000
      ) {
        return "legendary";
      }

      if (
        giftPrice >= 500
      ) {
        return "epic";
      }

      if (
        giftPrice >= 100
      ) {
        return "rare";
      }

      return "common";
    }, [
      gift?.fullScreenAnimation,
      rarity,
      giftPrice,
    ]);

  /* ==========================================================================
  PARTICLES

  Regenerated for each new gift.
  ========================================================================== */

  const particles =
    useMemo(
      () =>
        createParticles(
          animationLevel === "ultimate"
            ? 70
            : animationLevel === "legendary"
              ? 55
              : animationLevel === "diamond"
                ? 50
                : animationLevel === "epic"
                  ? 40
                  : 28,
        ),
      [
        giftId,
        animationLevel,
      ],
    );

  /* ==========================================================================
  RAYS
  ========================================================================== */

  const rays =
    useMemo(
      () =>
        Array.from(
          {
            length:
              animationLevel === "ultimate"
                ? 20
                : animationLevel === "legendary"
                  ? 16
                  : 12,
          },
          (_, index) => index,
        ),
      [
        giftId,
        animationLevel,
      ],
    );

  /* ==========================================================================
  ANIMATION URL
  ========================================================================== */

  const animationUrl =
    useMemo(() => {
      if (!gift?.animation) {
        return "";
      }

      const animation =
        String(
          gift.animation,
        ).trim();

      if (!animation) {
        return "";
      }

      if (
        animation.startsWith(
          "http://",
        ) ||
        animation.startsWith(
          "https://",
        )
      ) {
        return animation;
      }

      const cleanAnimation =
        animation.replace(
          /^\/+/,
          "",
        );

      if (
        cleanAnimation.startsWith(
          "uploads/",
        )
      ) {
        return `${API_URL}/${cleanAnimation}`;
      }

      return `${API_URL}/uploads/gifts/${cleanAnimation}`;
    }, [
      gift?.animation,
    ]);

  /* ==========================================================================
  SOUND URL
  ========================================================================== */

  const soundUrl =
    useMemo(() => {
      if (!gift?.sound) {
        return "";
      }

      const sound =
        String(
          gift.sound,
        ).trim();

      if (!sound) {
        return "";
      }

      if (
        sound.startsWith(
          "http://",
        ) ||
        sound.startsWith(
          "https://",
        )
      ) {
        return sound;
      }

      const cleanSound =
        sound.replace(
          /^\/+/,
          "",
        );

      if (
        cleanSound.startsWith(
          "uploads/",
        )
      ) {
        return `${API_URL}/${cleanSound}`;
      }

      return `${API_URL}/uploads/gifts/${cleanSound}`;
    }, [
      gift?.sound,
    ]);

  /* ==========================================================================
  SHOW NEW GIFT
  ========================================================================== */

  useEffect(() => {
    if (!gift) {
      setVisible(false);
      setVideoError(false);
      return;
    }

    console.log(
      "[GiftAnimation] Cinematic gift received:",
      {
        giftId,
        giftName,
        giftEmoji,
        senderName,
        rarity,
        giftPrice,
        animationLevel,
        animationUrl,
        soundUrl,
      },
    );

    setVideoError(false);

    /*
     * Force a fresh animation.
     */
    setVisible(false);

    const showTimer =
      window.setTimeout(
        () => {
          setVisible(true);
        },
        20,
      );

    /*
     * Powerful gifts stay visible longer.
     */
    const backendDuration =
      typeof gift.duration === "number" &&
      gift.duration > 0
        ? gift.duration
        : 8;

    const visualDuration =
      Math.max(
        backendDuration,
        animationLevel === "ultimate"
          ? 7
          : animationLevel === "legendary"
            ? 6
            : animationLevel === "diamond"
              ? 5.5
              : animationLevel === "epic"
                ? 5
                : 4,
      );

    const hideTimer =
      window.setTimeout(
        () => {
          setVisible(false);
        },
        visualDuration * 1000,
      );

    return () => {
      window.clearTimeout(
        showTimer,
      );

      window.clearTimeout(
        hideTimer,
      );
    };
  }, [
    gift,
    giftId,
    giftName,
    giftEmoji,
    senderName,
    rarity,
    giftPrice,
    animationLevel,
    animationUrl,
    soundUrl,
  ]);

  /* ==========================================================================
  VIDEO ENDED
  ========================================================================== */

  const handleVideoEnded =
    () => {
      /*
       * Do not immediately kill the entire cinematic overlay.
       *
       * Let the surrounding particles finish.
       */
      window.setTimeout(
        () => {
          setVisible(false);
        },
        900,
      );
    };

  /* ==========================================================================
  VIDEO ERROR
  ========================================================================== */

  const handleVideoError =
    (
      event: SyntheticEvent<
        HTMLVideoElement,
        Event
      >,
    ) => {
      console.error(
        "[GiftAnimation] Animation failed to load.",
        {
          animationUrl,
          animation:
            gift?.animation,
          event,
        },
      );

      setVideoError(true);
    };

  /* ==========================================================================
  NOTHING TO SHOW
  ========================================================================== */

  if (
    !visible ||
    !gift
  ) {
    return null;
  }

  /* ==========================================================================
  RENDER
  ========================================================================== */

  return (
    <div
      className={[
        "gift-animation",
        `gift-animation-${animationLevel}`,
      ].join(" ")}

      aria-live="polite"

      aria-label={
        `${giftName} gift from ${senderName}`
      }
    >

      {/* ================================================================
          CINEMATIC BACKDROP
      ================================================================ */}

      <div
        className="gift-animation-backdrop"
      />

      {/* ================================================================
          SCREEN FLASH
      ================================================================ */}

      <div
        className="gift-animation-flash"
      />

      {/* ================================================================
          GLOW ORB
      ================================================================ */}

      <div
        className="gift-animation-orb"
      />

      {/* ================================================================
          RADIAL RAYS
      ================================================================ */}

      <div
        className="gift-animation-rays"
      >
        {rays.map(
          (ray) => (
            <span
              key={ray}
              className="gift-animation-ray"
              style={{
                "--ray-index":
                  ray,
                "--ray-count":
                  rays.length,
              } as React.CSSProperties}
            />
          ),
        )}
      </div>

      {/* ================================================================
          PARTICLES
      ================================================================ */}

      <div
        className="gift-animation-particles"
      >
        {particles.map(
          (particle) => (
            <span
              key={
                particle.id
              }
              className="gift-animation-particle"
              style={{
                "--particle-x":
                  `${particle.x}%`,
                "--particle-y":
                  `${particle.y}%`,
                "--particle-size":
                  `${particle.size}px`,
                "--particle-delay":
                  `${particle.delay}s`,
                "--particle-duration":
                  `${particle.duration}s`,
                "--particle-rotation":
                  `${particle.rotation}deg`,
                "--particle-drift":
                  `${particle.drift}px`,
              } as React.CSSProperties}
            />
          ),
        )}
      </div>

      {/* ================================================================
          EXPLOSION RINGS
      ================================================================ */}

      <div
        className="gift-animation-rings"
      >
        <span />
        <span />
        <span />
        <span />
      </div>

      {/* ================================================================
          MAIN GIFT CONTENT
      ================================================================ */}

      <div
        className="gift-animation-center"
      >

        {/* Sender */}

        <div
          className="gift-animation-sender"
        >
          <span>
            {senderName}
          </span>

          <strong>
            SENT YOU
          </strong>
        </div>

        {/* Gift stage */}

        <div
          className="gift-animation-stage"
        >

          {/* Emoji glow behind gift */}

          <div
            className="gift-animation-emoji-glow"
          />

          {/* Video */}

          {animationUrl &&
          !videoError ? (
            <video
              key={
                `${giftId}-${animationUrl}-${giftPrice}`
              }

              className="gift-animation-video"

              src={
                animationUrl
              }

              autoPlay

              playsInline

              muted

              preload="auto"

              onEnded={
                handleVideoEnded
              }

              onError={
                handleVideoError
              }
            />
          ) : (
            <div
              className="gift-animation-fallback"
            >
              <span
                className="gift-animation-emoji"
              >
                {giftEmoji}
              </span>
            </div>
          )}

        </div>

        {/* Gift name */}

        <div
          className="gift-animation-title"
        >
          {giftName}
        </div>

        {/* Rarity */}

        {rarity && (
          <div
            className={
              `gift-animation-rarity gift-rarity-${rarity}`
            }
          >
            {rarity}
          </div>
        )}

        {/* Coin value */}

        {giftPrice > 0 && (
          <div
            className="gift-animation-value"
          >
            <span>
              🪙
            </span>

            <strong>
              {giftPrice.toLocaleString()}
            </strong>

            <span>
              COINS
            </span>
          </div>
        )}

        {/* Legendary label */}

        {(animationLevel ===
          "legendary" ||
          animationLevel ===
            "diamond" ||
          animationLevel ===
            "ultimate") && (
          <div
            className="gift-animation-special"
          >
            ✨ SPECIAL FOCKIS GIFT ✨
          </div>
        )}

      </div>

      {/* ================================================================
          CORNER SPARKLES
      ================================================================ */}

      <div
        className="gift-animation-sparkles"
        aria-hidden="true"
      >
        <span>✦</span>
        <span>✧</span>
        <span>✦</span>
        <span>✧</span>
        <span>✦</span>
        <span>✧</span>
      </div>

      {/* ================================================================
          AUDIO
      ================================================================ */}

      {soundUrl && (
        <audio
          key={
            `${giftId}-${soundUrl}`
          }

          src={
            soundUrl
          }

          autoPlay

          preload="auto"

          onError={() => {
            console.warn(
              "[GiftAnimation] Gift sound failed to load:",
              soundUrl,
            );
          }}
        />
      )}

    </div>
  );
}