import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

import {
  NestExpressApplication,
} from "@nestjs/platform-express";

import {
  ValidationPipe,
} from "@nestjs/common";

import { join } from "path";

import {
  SubscriptionPlanService,
} from "./subscriptions/services/subscription-plan.service";

/* ============================================================================
   BOOTSTRAP
============================================================================ */

async function bootstrap() {
  const app =
    await NestFactory.create<NestExpressApplication>(
      AppModule,
    );

  /* ==========================================================================
     TRUST PROXY
  ========================================================================== */

  app.set("trust proxy", 1);

  /* ==========================================================================
     CORS
  ========================================================================== */

  app.enableCors({
    origin: true,

    credentials: true,

    methods: [
      "GET",
      "HEAD",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Accept",
      "Authorization",
      "Origin",
      "X-Requested-With",
    ],
  });

  /* ==========================================================================
     GLOBAL VALIDATION
  ========================================================================== */

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  /* ==========================================================================
     STATIC UPLOADS
     
     IMPORTANT SECURITY RULE:
     
     /uploads/music/*
     
     MUST NEVER be publicly served.
     
     Music playback must go through:
     
     /music/entitlements/:contentId/playback-url
     
     and then:
     
     /music/entitlements/playback/:token
     
     The public static upload handler remains available for other
     application assets such as images, ads, PDFs, etc.
  ========================================================================== */

  const uploadsPath = join(
    process.cwd(),
    "uploads",
  );

  /*
   * SECURITY BARRIER
   *
   * This middleware runs BEFORE Nest's static file middleware.
   *
   * Therefore:
   *
   * /uploads/music/song.mp3
   *
   * will NOT be served directly.
   *
   * This prevents users from bypassing checkout by opening the
   * storage URL directly.
   */

  app.use(
    (req, res, next) => {
      const requestPath =
        String(req.path || "")
          .replace(/\\/g, "/")
          .toLowerCase();

      if (
        requestPath === "/uploads/music" ||
        requestPath.startsWith(
          "/uploads/music/",
        )
      ) {
        console.warn(
          `[SECURITY] Blocked direct public music-media request: ${req.method} ${req.originalUrl}`,
        );

        res
          .status(403)
          .json({
            statusCode: 403,
            message:
              "Direct music media access is not allowed. Use the authorized playback endpoint.",
            code:
              "DIRECT_MUSIC_MEDIA_ACCESS_BLOCKED",
          });

        return;
      }

      next();
    },
  );

  /*
   * Public uploads remain available for non-music assets.
   *
   * Examples:
   *
   * /uploads/images/...
   * /uploads/ads/...
   * /uploads/documents/...
   *
   * But:
   *
   * /uploads/music/...
   *
   * is blocked by the security middleware above.
   */

  app.useStaticAssets(
    uploadsPath,
    {
      prefix: "/uploads/",

      setHeaders: (
        res,
        filePath,
      ) => {
        const lowerPath =
          filePath.toLowerCase();

        /* ====================================================================
           IMAGES
        ==================================================================== */

        if (
          lowerPath.endsWith(".jpg") ||
          lowerPath.endsWith(".jpeg")
        ) {
          res.setHeader(
            "Content-Type",
            "image/jpeg",
          );
        }

        if (
          lowerPath.endsWith(".png")
        ) {
          res.setHeader(
            "Content-Type",
            "image/png",
          );
        }

        if (
          lowerPath.endsWith(".webp")
        ) {
          res.setHeader(
            "Content-Type",
            "image/webp",
          );
        }

        if (
          lowerPath.endsWith(".gif")
        ) {
          res.setHeader(
            "Content-Type",
            "image/gif",
          );
        }

        if (
          lowerPath.endsWith(".avif")
        ) {
          res.setHeader(
            "Content-Type",
            "image/avif",
          );
        }

        /* ====================================================================
           PDF
        ==================================================================== */

        if (
          lowerPath.endsWith(".pdf")
        ) {
          res.setHeader(
            "Content-Type",
            "application/pdf",
          );

          res.setHeader(
            "Content-Disposition",
            "inline",
          );
        }

        /* ====================================================================
           VIDEO
           
           NOTE:
           
           Music media is blocked before reaching this static handler.
           
           These headers remain useful for other public video assets.
        ==================================================================== */

        if (
          lowerPath.endsWith(".mp4")
        ) {
          res.setHeader(
            "Content-Type",
            "video/mp4",
          );

          res.setHeader(
            "Accept-Ranges",
            "bytes",
          );

          res.setHeader(
            "Cache-Control",
            "public, max-age=3600",
          );
        }

        if (
          lowerPath.endsWith(".webm")
        ) {
          res.setHeader(
            "Content-Type",
            "video/webm",
          );

          res.setHeader(
            "Accept-Ranges",
            "bytes",
          );

          res.setHeader(
            "Cache-Control",
            "public, max-age=3600",
          );
        }

        if (
          lowerPath.endsWith(".mov")
        ) {
          res.setHeader(
            "Content-Type",
            "video/quicktime",
          );

          res.setHeader(
            "Accept-Ranges",
            "bytes",
          );

          res.setHeader(
            "Cache-Control",
            "public, max-age=3600",
          );
        }

        if (
          lowerPath.endsWith(".mkv")
        ) {
          res.setHeader(
            "Content-Type",
            "video/x-matroska",
          );

          res.setHeader(
            "Accept-Ranges",
            "bytes",
          );

          res.setHeader(
            "Cache-Control",
            "public, max-age=3600",
          );
        }

        /* ====================================================================
           AUDIO
           
           IMPORTANT:
           
           Any audio under /uploads/music/ has already been blocked above.
           
           These remain available for non-music application assets.
        ==================================================================== */

        if (
          lowerPath.endsWith(".mp3")
        ) {
          res.setHeader(
            "Content-Type",
            "audio/mpeg",
          );

          res.setHeader(
            "Accept-Ranges",
            "bytes",
          );

          res.setHeader(
            "Cache-Control",
            "public, max-age=3600",
          );
        }

        if (
          lowerPath.endsWith(".wav")
        ) {
          res.setHeader(
            "Content-Type",
            "audio/wav",
          );

          res.setHeader(
            "Accept-Ranges",
            "bytes",
          );

          res.setHeader(
            "Cache-Control",
            "public, max-age=3600",
          );
        }

        if (
          lowerPath.endsWith(".m4a")
        ) {
          res.setHeader(
            "Content-Type",
            "audio/mp4",
          );

          res.setHeader(
            "Accept-Ranges",
            "bytes",
          );

          res.setHeader(
            "Cache-Control",
            "public, max-age=3600",
          );
        }

        if (
          lowerPath.endsWith(".aac")
        ) {
          res.setHeader(
            "Content-Type",
            "audio/aac",
          );

          res.setHeader(
            "Accept-Ranges",
            "bytes",
          );

          res.setHeader(
            "Cache-Control",
            "public, max-age=3600",
          );
        }

        if (
          lowerPath.endsWith(".ogg")
        ) {
          res.setHeader(
            "Content-Type",
            "audio/ogg",
          );

          res.setHeader(
            "Accept-Ranges",
            "bytes",
          );

          res.setHeader(
            "Cache-Control",
            "public, max-age=3600",
          );
        }

        if (
          lowerPath.endsWith(".oga")
        ) {
          res.setHeader(
            "Content-Type",
            "audio/ogg",
          );

          res.setHeader(
            "Accept-Ranges",
            "bytes",
          );

          res.setHeader(
            "Cache-Control",
            "public, max-age=3600",
          );
        }

        if (
          lowerPath.endsWith(".opus")
        ) {
          res.setHeader(
            "Content-Type",
            "audio/opus",
          );

          res.setHeader(
            "Accept-Ranges",
            "bytes",
          );

          res.setHeader(
            "Cache-Control",
            "public, max-age=3600",
          );
        }

        if (
          lowerPath.endsWith(".flac")
        ) {
          res.setHeader(
            "Content-Type",
            "audio/flac",
          );

          res.setHeader(
            "Accept-Ranges",
            "bytes",
          );

          res.setHeader(
            "Cache-Control",
            "public, max-age=3600",
          );
        }

        /* ====================================================================
           AD CACHE
        ==================================================================== */

        if (
          lowerPath.includes("/ads/")
        ) {
          res.setHeader(
            "Cache-Control",
            "public, max-age=3600",
          );
        }
      },
    },
  );

  /* ==========================================================================
     SUBSCRIPTION PLANS
  ========================================================================== */

  try {
    const subscriptionPlanService =
      app.get(
        SubscriptionPlanService,
      );

    await subscriptionPlanService.initializeDefaults();

    console.log(
      "✅ Subscription plans initialized.",
    );
  } catch (error) {
    console.error(
      "❌ Failed to initialize subscription plans:",
      error,
    );
  }

  /* ==========================================================================
     PORT
  ========================================================================== */

  const configuredPort =
    Number(
      process.env.PORT || 3000,
    );

  const port =
    Number.isFinite(
      configuredPort,
    ) &&
    configuredPort > 0
      ? configuredPort
      : 3000;

  /* ==========================================================================
     START SERVER
  ========================================================================== */

  try {
    await app.listen(
      port,
      "0.0.0.0",
    );
  } catch (error) {
    const code =
      error &&
      typeof error === "object" &&
      "code" in error
        ? String(
            (
              error as {
                code?: unknown;
              }
            ).code,
          )
        : "";

    if (
      code === "EADDRINUSE"
    ) {
      console.error("");

      console.error(
        "============================================================",
      );

      console.error(
        "❌ FOCKIS API COULD NOT START",
      );

      console.error(
        "============================================================",
      );

      console.error(
        `Port ${port} is already being used.`,
      );

      console.error("");

      console.error(
        "Run:",
      );

      console.error(
        `netstat -ano | findstr :${port}`,
      );

      console.error("");

      console.error(
        "Then:",
      );

      console.error(
        "taskkill /PID <PID> /F",
      );

      console.error(
        "============================================================",
      );

      console.error("");

      process.exit(1);
    }

    console.error(
      "❌ Failed to start Fockis API:",
      error,
    );

    process.exit(1);
  }

  /* ==========================================================================
     STARTUP LOGS
  ========================================================================== */

  console.log("");

  console.log(
    "============================================================",
  );

  console.log(
    "🚀 FOCKIS API SERVER",
  );

  console.log(
    "============================================================",
  );

  console.log(
    `🌐 Local API: http://localhost:${port}`,
  );

  console.log(
    `📡 LAN API: http://192.168.1.112:${port}`,
  );

  console.log(
    `📡 Server listening on: 0.0.0.0:${port}`,
  );

  console.log(
    `🎵 MUSIC: http://192.168.1.112:${port}/music`,
  );

  console.log(
    `🎬 LIVE: http://192.168.1.112:${port}/live`,
  );

  console.log(
    `📁 Public Uploads: http://192.168.1.112:${port}/uploads/`,
  );

  console.log(
    `🔒 Protected Music: /uploads/music/* BLOCKED`,
  );

  console.log(
    `🎧 Authorized Music Playback: /music/entitlements/...`,
  );

  console.log(
    `📄 Scanner: http://192.168.1.112:${port}/document-scanner`,
  );

  console.log(
    "============================================================",
  );

  console.log("");

  console.log(
    "📱 LAN access is enabled.",
  );

  console.log(
    "   Use http://192.168.1.112:3000 from phones",
  );

  console.log(
    "   and other devices on the same network.",
  );

  console.log("");

  console.log(
    "🔐 Music media protection is enabled.",
  );

  console.log("");
}

/* ============================================================================
   START
============================================================================ */

bootstrap().catch(
  (error) => {
    console.error(
      "❌ Fockis API bootstrap failed:",
      error,
    );

    process.exit(1);
  },
);