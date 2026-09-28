import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import { aiApi } from "../services/aiApi";
import type { AiJob } from "../types/aiTypes";

// ============================================================
// API BASE
// ============================================================

const API_BASE = String(
  import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    `http://${window.location.hostname}:3000`,
).replace(/\/+$/, "");

// ============================================================
// AUTH
// ============================================================

function getAccessToken(): string | null {
  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt")
  );
}

// ============================================================
// TYPES
// ============================================================

interface MediaUrlResponse {
  url?: string;
  signedUrl?: string;
  jobId?: string;
  bucket?: string;
  objectName?: string;
}

// ============================================================
// PAGE
// ============================================================

export default function AiVideoResultPage() {
  const { jobId } =
    useParams<{ jobId: string }>();

  const [job, setJob] =
    useState<AiJob | null>(null);

  const [videoUrl, setVideoUrl] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [videoLoading, setVideoLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [videoError, setVideoError] =
    useState<string | null>(null);

  // ============================================================
  // LOAD JOB
  // ============================================================

  useEffect(() => {
    let cancelled = false;

    async function loadVideo() {
      if (!jobId) {
        setError(
          "No AI video job was specified.",
        );

        setLoading(false);

        return;
      }

      try {
        setLoading(true);
        setError(null);
        setVideoError(null);
        setVideoUrl(null);

        // ------------------------------------------------------
        // STEP 1
        // Load the AI job
        // ------------------------------------------------------

        console.log(
          "[FOCKIS AI] Loading job:",
          jobId,
        );

        const result =
          await aiApi.getJob(jobId);

        if (cancelled) {
          return;
        }

        setJob(result);

        const status =
          String(
            result.status ?? "",
          ).toLowerCase();

        console.log(
          "[FOCKIS AI] Job status:",
          status,
        );

        const completed =
          status === "completed" ||
          status === "complete" ||
          status === "succeeded" ||
          status === "success";

        setLoading(false);

        if (!completed) {
          return;
        }

        // ------------------------------------------------------
        // STEP 2
        // Authentication
        // ------------------------------------------------------

        const token =
          getAccessToken();

        if (!token) {
          throw new Error(
            "Your login session could not be found. Please sign in again.",
          );
        }

        // ------------------------------------------------------
        // STEP 3
        // Request signed GCS URL
        // ------------------------------------------------------

        setVideoLoading(true);

        const mediaUrlEndpoint =
          `${API_BASE}/ai/jobs/${encodeURIComponent(
            jobId,
          )}/media-url`;

        console.log(
          "[FOCKIS AI] Requesting signed video URL:",
          mediaUrlEndpoint,
        );

        const response =
          await fetch(
            mediaUrlEndpoint,
            {
              method: "GET",

              headers: {
                Accept:
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              credentials:
                "include",
            },
          );

        console.log(
          "[FOCKIS AI] Signed URL response:",
          {
            status:
              response.status,

            contentType:
              response.headers.get(
                "content-type",
              ),
          },
        );

        // ------------------------------------------------------
        // STEP 4
        // Handle backend errors
        // ------------------------------------------------------

        if (!response.ok) {
          let message =
            `Unable to get the video URL. HTTP ${response.status}.`;

          try {
            const contentType =
              response.headers.get(
                "content-type",
              ) || "";

            if (
              contentType.includes(
                "application/json",
              )
            ) {
              const body =
                await response.json();

              if (
                body?.message
              ) {
                message =
                  String(
                    body.message,
                  );
              }
            } else {
              const text =
                await response.text();

              if (text.trim()) {
                message =
                  text.trim();
              }
            }
          } catch {
            // Keep default message.
          }

          throw new Error(
            message,
          );
        }

        // ------------------------------------------------------
        // STEP 5
        // Verify JSON response
        // ------------------------------------------------------

        const contentType =
          response.headers.get(
            "content-type",
          ) || "";

        if (
          !contentType.includes(
            "application/json",
          )
        ) {
          throw new Error(
            "The AI media URL endpoint did not return JSON.",
          );
        }

        const data =
          (await response.json()) as MediaUrlResponse;

        console.log(
          "[FOCKIS AI] Media URL data:",
          {
            jobId:
              data.jobId,

            bucket:
              data.bucket,

            objectName:
              data.objectName,

            hasSignedUrl:
              Boolean(
                data.signedUrl,
              ),

            hasUrl:
              Boolean(
                data.url,
              ),
          },
        );

        // ------------------------------------------------------
        // STEP 6
        // Get signed URL
        // ------------------------------------------------------

        const signedUrl =
          typeof data.signedUrl ===
          "string"
            ? data.signedUrl
            : typeof data.url ===
                "string"
              ? data.url
              : null;

        if (!signedUrl) {
          throw new Error(
            "The backend did not return a signed Google Cloud Storage video URL.",
          );
        }

        if (
          !signedUrl.startsWith(
            "https://",
          )
        ) {
          throw new Error(
            "The backend returned an invalid video URL.",
          );
        }

        if (cancelled) {
          return;
        }

        // ------------------------------------------------------
        // STEP 7
        // IMPORTANT:
        //
        // Do NOT fetch the MP4 here.
        //
        // Do NOT convert it into Blob.
        //
        // Give the signed GCS URL directly to <video>.
        // ------------------------------------------------------

        console.log(
          "[FOCKIS AI] Signed video URL received.",
        );

        setVideoUrl(
          signedUrl,
        );
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "[FOCKIS AI] Video loading failed:",
          err,
        );

        setVideoError(
          err instanceof Error
            ? err.message
            : "Unable to load the generated video.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
          setVideoLoading(false);
        }
      }
    }

    void loadVideo();

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  // ============================================================
  // LOADING PAGE
  // ============================================================

  if (loading) {
    return (
      <div
        style={{
          minHeight:
            "100vh",

          display:
            "grid",

          placeItems:
            "center",

          padding: 24,

          background:
            "#f5f7fb",
        }}
      >
        <div
          style={{
            background:
              "#ffffff",

            borderRadius:
              20,

            padding: 32,

            boxShadow:
              "0 10px 40px rgba(0,0,0,.08)",

            textAlign:
              "center",
          }}
        >
          <div
            style={{
              fontSize: 44,
              marginBottom: 14,
            }}
          >
            🎬
          </div>

          <h2
            style={{
              margin:
                "0 0 8px",
            }}
          >
            Loading your video
          </h2>

          <p
            style={{
              margin: 0,
              color: "#666",
            }}
          >
            Getting your generated video...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // ERROR
  // ============================================================

  if (error || videoError) {
    const message =
      error ||
      videoError ||
      "Unable to load the video.";

    return (
      <div
        style={{
          minHeight:
            "100vh",

          display:
            "grid",

          placeItems:
            "center",

          padding: 24,

          background:
            "#f5f7fb",
        }}
      >
        <div
          style={{
            width:
              "100%",

            maxWidth:
              700,

            background:
              "#ffffff",

            borderRadius:
              20,

            padding: 32,

            boxShadow:
              "0 10px 40px rgba(0,0,0,.08)",

            textAlign:
              "center",
          }}
        >
          <div
            style={{
              fontSize: 48,
              marginBottom: 12,
            }}
          >
            ⚠️
          </div>

          <h1
            style={{
              marginTop: 0,
            }}
          >
            Unable to load video
          </h1>

          <p
            style={{
              color: "#666",
              lineHeight: 1.6,
            }}
          >
            {message}
          </p>

          <div
            style={{
              display:
                "flex",

              justifyContent:
                "center",

              gap: 12,

              flexWrap:
                "wrap",

              marginTop: 20,
            }}
          >
            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              style={{
                border:
                  "none",

                borderRadius:
                  10,

                padding:
                  "12px 18px",

                background:
                  "#ff9900",

                color:
                  "#ffffff",

                fontWeight:
                  800,

                cursor:
                  "pointer",
              }}
            >
              Try again
            </button>

            <Link
              to="/create/ai/video"
              style={{
                padding:
                  "12px 18px",

                borderRadius:
                  10,

                background:
                  "#111827",

                color:
                  "#ffffff",

                textDecoration:
                  "none",

                fontWeight:
                  800,
              }}
            >
              Create another video
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  // ============================================================
  // STATUS
  // ============================================================

  const status =
    String(
      job.status ?? "",
    ).toLowerCase();

  const completed =
    status === "completed" ||
    status === "complete" ||
    status === "succeeded" ||
    status === "success";

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div
      style={{
        minHeight:
          "100vh",

        background:
          "linear-gradient(180deg,#0b1020 0%,#111827 100%)",

        color:
          "#ffffff",

        padding:
          "40px 20px 80px",
      }}
    >
      <div
        style={{
          width:
            "100%",

          maxWidth:
            1100,

          margin:
            "0 auto",
        }}
      >
        {/* ======================================================
            HEADER
        ====================================================== */}

        <div
          style={{
            display:
              "flex",

            justifyContent:
              "space-between",

            alignItems:
              "center",

            gap: 16,

            marginBottom:
              28,

            flexWrap:
              "wrap",
          }}
        >
          <div>
            <div
              style={{
                color:
                  "#ff9900",

                fontSize:
                  13,

                fontWeight:
                  800,

                letterSpacing:
                  1.5,

                textTransform:
                  "uppercase",
              }}
            >
              Fockis AI
            </div>

            <h1
              style={{
                margin:
                  "6px 0 0",

                fontSize:
                  32,
              }}
            >
              Your AI video
            </h1>
          </div>

          <Link
            to="/create/ai/video"
            style={{
              padding:
                "11px 16px",

              borderRadius:
                10,

              background:
                "#ffffff",

              color:
                "#111827",

              textDecoration:
                "none",

              fontWeight:
                700,
            }}
          >
            Create another
          </Link>
        </div>

        {/* ======================================================
            VIDEO
        ====================================================== */}

        <div
          style={{
            background:
              "#151c2d",

            borderRadius:
              22,

            padding:
              20,

            boxShadow:
              "0 20px 60px rgba(0,0,0,.35)",
          }}
        >
          {videoLoading ? (
            <div
              style={{
                minHeight:
                  500,

                display:
                  "grid",

                placeItems:
                  "center",

                borderRadius:
                  16,

                background:
                  "#080b12",

                textAlign:
                  "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize:
                      52,

                    marginBottom:
                      16,
                  }}
                >
                  🎬
                </div>

                <h2>
                  Preparing your video
                </h2>

                <p
                  style={{
                    color:
                      "#9ca3af",
                  }}
                >
                  Creating a secure playback URL...
                </p>
              </div>
            </div>
          ) : videoUrl ? (
            <video
              key={videoUrl}
              src={videoUrl}
              controls
              playsInline
              preload="metadata"
              style={{
                width:
                  "100%",

                display:
                  "block",

                borderRadius:
                  16,

                background:
                  "#000000",

                maxHeight:
                  "75vh",

                objectFit:
                  "contain",
              }}
              onLoadedMetadata={() => {
                console.log(
                  "[FOCKIS AI] Video metadata loaded.",
                );
              }}
              onCanPlay={() => {
                console.log(
                  "[FOCKIS AI] Video can play.",
                );
              }}
              onError={(event) => {
                const mediaError =
                  event.currentTarget
                    .error;

                console.error(
                  "[FOCKIS AI] Browser video error:",
                  mediaError,
                );

                setVideoError(
                  mediaError
                    ? `Browser could not play the video. ${mediaError.message || `Media error code: ${mediaError.code}`}`
                    : "The browser could not play the generated video.",
                );
              }}
            />
          ) : completed ? (
            <div
              style={{
                minHeight:
                  500,

                display:
                  "grid",

                placeItems:
                  "center",

                borderRadius:
                  16,

                background:
                  "#080b12",

                textAlign:
                  "center",

                padding:
                  30,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize:
                      52,
                  }}
                >
                  🎬
                </div>

                <h2>
                  Video generation complete
                </h2>

                <p
                  style={{
                    color:
                      "#9ca3af",
                  }}
                >
                  The video completed, but the server did not return a playable URL.
                </p>
              </div>
            </div>
          ) : (
            <div
              style={{
                minHeight:
                  500,

                display:
                  "grid",

                placeItems:
                  "center",

                borderRadius:
                  16,

                background:
                  "#080b12",

                textAlign:
                  "center",
              }}
            >
              <div>
                <h2>
                  Video is not ready
                </h2>

                <p
                  style={{
                    color:
                      "#9ca3af",
                  }}
                >
                  Current status:{" "}
                  {job.status}
                </p>
              </div>
            </div>
          )}

          {/* ====================================================
              FOOTER
          ==================================================== */}

          <div
            style={{
              display:
                "flex",

              justifyContent:
                "space-between",

              alignItems:
                "center",

              gap: 16,

              marginTop:
                18,

              flexWrap:
                "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize:
                    12,

                  color:
                    "#9ca3af",

                  textTransform:
                    "uppercase",

                  letterSpacing:
                    1,
                }}
              >
                Status
              </div>

              <div
                style={{
                  marginTop:
                    4,

                  fontWeight:
                    800,

                  color:
                    completed
                      ? "#4ade80"
                      : "#ffffff",
                }}
              >
                {job.status}
              </div>
            </div>

            {videoUrl && (
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding:
                    "11px 18px",

                  borderRadius:
                    10,

                  background:
                    "#ff9900",

                  color:
                    "#ffffff",

                  textDecoration:
                    "none",

                  fontWeight:
                    800,
                }}
              >
                Open video directly
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}