import {
  Controller,
  Get,
  Param,
  NotFoundException,
  Req,
  UseGuards,
} from "@nestjs/common";

import type { Request } from "express";

import {
  JwtAuthGuard,
} from "../../auth/jwt-auth.guard";

import {
  BusinessesService,
} from "../../businesses/businesses.service";

import {
  UsersService,
} from "../../users/users.service";

import {
  AnalyticsService,
} from "../services/analytics.service";

import {
  CampaignsService,
} from "../services/campaign.service";

import {
  AdvertisementService,
} from "../services/advertisement.service";

/* ============================================================
   AUTHENTICATED USER
============================================================ */

interface MarketingRequestUser {
  id?: string;
  _id?: string;
  userId?: string;
  sub?: string;

  name?: string;
  firstName?: string;
  lastName?: string;

  email?: string;

  role?: string;
  permissions?: string[];
}

type MarketingRequest = Request & {
  user?: MarketingRequestUser;
};

/* ============================================================
   FRONTEND MARKETING TYPES

   These are intentionally kept local so this backend module
   does not depend on frontend TypeScript files.
============================================================ */

type MarketingBusinessStatus =
  | "active"
  | "onboarding"
  | "paused"
  | "archived";

type MarketingBusinessType =
  | "restaurant"
  | "retail"
  | "ecommerce"
  | "barbershop"
  | "salon"
  | "real_estate"
  | "construction"
  | "professional_services"
  | "consulting"
  | "gym_fitness"
  | "church_organization"
  | "creator"
  | "nonprofit"
  | "local_service"
  | "other";

type MarketingPermission =
  | "agency.view"
  | "agency.manage_clients"
  | "agency.review_applications"
  | "billing.view"
  | "billing.purchase"
  | "billing.manage_client_credits"
  | "campaigns.send";

interface MarketingViewerResponse {
  id: string;
  name: string;
  role:
    | "agency_admin"
    | "agency_member"
    | "client_owner";
  permissions: MarketingPermission[];
}

interface MarketingBusinessResponse {
  id: string;
  workspaceId: string;
  name: string;
  type: MarketingBusinessType;
  status: MarketingBusinessStatus;

  logo: string;
  accent: string;

  isAgencyOwner: boolean;

  sizeHint: number;

  planId: string;

  services: Record<
    string,
    "active" | "paused" | "not_included"
  >;

  profile: {
    description: string;
    website: string;
    phone: string;
    email: string;
    address: string;
    serviceArea: string;

    hours: Array<{
      day:
        | "Mon"
        | "Tue"
        | "Wed"
        | "Thu"
        | "Fri"
        | "Sat"
        | "Sun";
      open: string;
      close: string;
      closed: boolean;
    }>;

    timezone: string;
    currency: string;

    brandColors: string[];
    brandFonts: string[];

    social: {
      website?: string;
      facebook?: string;
      instagram?: string;
      tiktok?: string;
      fockis?: string;
    };

    goals: string[];

    defaultSenderName: string;
    defaultSenderEmail: string;
    replyToEmail: string;
  };

  sourceApplicationId?: string;

  createdAt: string;
  lastActivityAt: string;
}

/* ============================================================
   MARKETING SERVICE KEYS
============================================================ */

const MARKETING_SERVICE_KEYS = [
  "email_marketing",
  "social_media",
  "sms_marketing",
  "advertising",
  "lead_generation",
  "marketing_automation",
  "customer_retention",
  "content_creation",
  "landing_pages",
  "analytics_reporting",
  "ecommerce_marketing",
  "local_marketing",
  "campaign_management",
  "promotions",
] as const;

/* ============================================================
   BUSINESS CATEGORY CONVERSION
============================================================ */

function normalizeBusinessType(
  category: unknown,
): MarketingBusinessType {
  const value = String(category ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const valid: MarketingBusinessType[] = [
    "restaurant",
    "retail",
    "ecommerce",
    "barbershop",
    "salon",
    "real_estate",
    "construction",
    "professional_services",
    "consulting",
    "gym_fitness",
    "church_organization",
    "creator",
    "nonprofit",
    "local_service",
    "other",
  ];

  return valid.includes(
    value as MarketingBusinessType,
  )
    ? (value as MarketingBusinessType)
    : "other";
}

/* ============================================================
   BUSINESS STATUS CONVERSION

   The core Businesses module has more states than the marketing
   UI. Marketing only needs active/onboarding/paused/archived.
============================================================ */

function normalizeBusinessStatus(
  status: unknown,
): MarketingBusinessStatus {
  const value = String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (
    value === "active" ||
    value === "published"
  ) {
    return "active";
  }

  if (
    value === "paused" ||
    value === "suspended"
  ) {
    return "paused";
  }

  if (
    value === "archived" ||
    value === "deleted"
  ) {
    return "archived";
  }

  return "onboarding";
}

/* ============================================================
   DATE NORMALIZATION
============================================================ */

function toIsoDate(
  value: unknown,
  fallback = new Date(),
): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return fallback.toISOString();
}

/* ============================================================
   BUSINESS ADAPTER

   Converts the real BusinessesService document into the shape
   expected by Fockis Mail.
============================================================ */

function toMarketingBusiness(
  business: any,
): MarketingBusinessResponse {
  const id = String(
    business?.id ??
      business?._id ??
      "",
  );

  const now = new Date();

  const createdAt = toIsoDate(
    business?.createdAt,
    now,
  );

  const lastActivityAt = toIsoDate(
    business?.updatedAt ??
      business?.createdAt,
    now,
  );

  const website =
    String(
      business?.websiteUrl ??
        "",
    ).trim();

  const email =
    String(
      business?.email ??
        "",
    ).trim();

  const phone =
    String(
      business?.phone ??
        "",
    ).trim();

  const addressParts = [
    business?.address,
    business?.city,
    business?.state,
    business?.zipCode ??
      business?.postalCode,
    business?.country,
  ]
    .map((value) =>
      String(value ?? "").trim(),
    )
    .filter(Boolean);

  const address =
    addressParts.join(", ");

  const serviceArea =
    [
      business?.city,
      business?.state,
      business?.country,
    ]
      .map((value) =>
        String(value ?? "").trim(),
      )
      .filter(Boolean)
      .join(", ");

  const logo =
    String(
      business?.logoUrl ??
        "",
    ).trim();

  const accent =
    "#2563eb";

  const socialLinks =
    business?.socialLinks ??
    {};

  const services: Record<
    string,
    "active" | "paused" | "not_included"
  > = {};

  for (
    const service of MARKETING_SERVICE_KEYS
  ) {
    services[service] = "active";
  }

  return {
    id,

    /*
     * The existing Business schema does not have a workspaceId.
     * Keep this deterministic so the same business always maps
     * to the same marketing workspace.
     */
    workspaceId: `ws_${id}`,

    name:
      String(
        business?.name ??
          "Business",
      ).trim(),

    type: normalizeBusinessType(
      business?.category,
    ),

    status: normalizeBusinessStatus(
      business?.status,
    ),

    logo,

    accent,

    /*
     * The existing Business schema represents the owner's
     * business account, not an agency-owned marketing client.
     */
    isAgencyOwner: false,

    /*
     * The core Business schema does not currently store an
     * audience-size field. This is kept as a neutral value
     * until the marketing audience system supplies it.
     */
    sizeHint: 0,

    /*
     * The current Business schema does not have a planId.
     */
    planId: "standard",

    services,

    profile: {
      description:
        String(
          business?.description ??
            "",
        ).trim(),

      website,

      phone,

      email,

      address,

      serviceArea,

      hours: [
        {
          day: "Mon",
          open: "09:00",
          close: "17:00",
          closed: false,
        },
        {
          day: "Tue",
          open: "09:00",
          close: "17:00",
          closed: false,
        },
        {
          day: "Wed",
          open: "09:00",
          close: "17:00",
          closed: false,
        },
        {
          day: "Thu",
          open: "09:00",
          close: "17:00",
          closed: false,
        },
        {
          day: "Fri",
          open: "09:00",
          close: "17:00",
          closed: false,
        },
        {
          day: "Sat",
          open: "09:00",
          close: "17:00",
          closed: false,
        },
        {
          day: "Sun",
          open: "09:00",
          close: "17:00",
          closed: true,
        },
      ],

      timezone:
        "America/New_York",

      currency:
        "USD",

      brandColors: [
        accent,
      ],

      brandFonts: [],

      social: {
        website:
          website || undefined,

        facebook:
          socialLinks.facebook,

        instagram:
          socialLinks.instagram,

        tiktok:
          socialLinks.tiktok,

        fockis:
          undefined,
      },

      goals: [],

      defaultSenderName:
        String(
          business?.name ??
            "",
        ).trim(),

      defaultSenderEmail:
        email,

      replyToEmail:
        email,
    },

    createdAt,

    lastActivityAt,
  };
}

/* ============================================================
   VIEWER ROLE
============================================================ */

function normalizeViewerRole(
  user: MarketingRequestUser,
): MarketingViewerResponse["role"] {
  const role =
    String(
      user.role ??
        "",
    )
      .trim()
      .toLowerCase();

  if (
    role === "admin" ||
    role === "super_admin"
  ) {
    return "agency_admin";
  }

  return "client_owner";
}

/* ============================================================
   VIEWER PERMISSIONS
============================================================ */

function normalizePermissions(
  user: MarketingRequestUser,
  viewerRole: MarketingViewerResponse["role"],
): MarketingPermission[] {
  const allowed: MarketingPermission[] = [
    "agency.view",
    "agency.manage_clients",
    "agency.review_applications",
    "billing.view",
    "billing.purchase",
    "billing.manage_client_credits",
    "campaigns.send",
  ];

  const supplied =
    Array.isArray(user.permissions)
      ? user.permissions
          .map((permission) =>
            String(permission),
          )
      : [];

  /*
   * Preserve permissions that already exist in the
   * authenticated user when they match the marketing
   * permission contract.
   */
  const matched =
    supplied.filter(
      (permission): permission is MarketingPermission =>
        allowed.includes(
          permission as MarketingPermission,
        ),
    );

  if (matched.length > 0) {
    return Array.from(
      new Set(matched),
    );
  }

  /*
   * Administrative Fockis users receive the marketing
   * agency permissions.
   */
  if (
    viewerRole === "agency_admin"
  ) {
    return [...allowed];
  }

  /*
   * Normal business owners can manage their own
   * marketing workspace and campaigns.
   */
  return [
    "billing.view",
    "billing.purchase",
    "campaigns.send",
  ];
}

/* ============================================================
   CONTROLLER
============================================================ */

@Controller("marketing")
@UseGuards(JwtAuthGuard)
export class MarketingController {
  constructor(
    private readonly analyticsService:
      AnalyticsService,

    private readonly campaignsService:
      CampaignsService,

    private readonly advertisementService:
      AdvertisementService,

    private readonly businessesService:
      BusinessesService,

    private readonly usersService:
      UsersService,
  ) {}

  /* ==========================================================
     GET CURRENT MARKETING VIEWER

     GET /marketing/me
  ========================================================== */

  @Get("me")
  async me(
    @Req() req: MarketingRequest,
  ): Promise<MarketingViewerResponse> {
    const user = req.user;

    const userId =
      user?.id ??
      user?._id ??
      user?.userId ??
      user?.sub;

    if (!userId) {
      throw new NotFoundException(
        "Authenticated user ID is missing from the request.",
      );
    }

    let dbUser: any = null;

    try {
      dbUser =
        await this.usersService.getUserById(
          String(userId),
        );
    } catch {
      dbUser = null;
    }

    const firstName =
      String(
        dbUser?.firstName ??
          user?.firstName ??
          "",
      ).trim();

    const lastName =
      String(
        dbUser?.lastName ??
          user?.lastName ??
          "",
      ).trim();

    const databaseName =
      [firstName, lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

    const name =
      databaseName ||
      String(
        user?.name ??
          dbUser?.username ??
          dbUser?.email ??
          user?.email ??
          "Fockis User",
      ).trim();

    const viewerRole =
      normalizeViewerRole({
        ...user,
        role:
          dbUser?.role ??
          user?.role,
        permissions:
          dbUser?.permissions ??
          user?.permissions,
      });

    const permissions =
      normalizePermissions(
        {
          ...user,
          role:
            dbUser?.role ??
            user?.role,
          permissions:
            dbUser?.permissions ??
            user?.permissions,
        },
        viewerRole,
      );

    return {
      id: String(userId),
      name,
      role: viewerRole,
      permissions,
    };
  }

  /* ==========================================================
     GET MARKETING BUSINESSES

     GET /marketing/businesses

     IMPORTANT:
     Uses BusinessesService.findMine(), which filters by
     authenticated ownerId.
  ========================================================== */

  @Get("businesses")
  async businesses(
    @Req() req: MarketingRequest,
  ): Promise<MarketingBusinessResponse[]> {
    const user = req.user;

    const userId =
      user?.id ??
      user?._id ??
      user?.userId ??
      user?.sub;

    if (!userId) {
      throw new NotFoundException(
        "Authenticated user ID is missing from the request.",
      );
    }

    const businesses =
      await this.businessesService.findMine(
        String(userId),
      );

    if (!Array.isArray(businesses)) {
      return [];
    }

    return businesses
      .map((business) =>
        toMarketingBusiness(
          business,
        ),
      )
      .filter(
        (business) =>
          business.status !==
          "archived",
      );
  }

  /* ==========================================================
     GET ONE MARKETING BUSINESS

     GET /marketing/businesses/:id
  ========================================================== */

  @Get("businesses/:id")
  async business(
    @Req() req: MarketingRequest,
    @Param("id") businessId: string,
  ): Promise<MarketingBusinessResponse> {
    const user = req.user;

    const userId =
      user?.id ??
      user?._id ??
      user?.userId ??
      user?.sub;

    if (!userId) {
      throw new NotFoundException(
        "Authenticated user ID is missing from the request.",
      );
    }

    const businesses =
      await this.businessesService.findMine(
        String(userId),
      );

    const business =
      Array.isArray(businesses)
        ? businesses.find(
            (item: any) =>
              String(
                item?.id ??
                  item?._id ??
                  "",
              ) ===
              String(businessId),
          )
        : undefined;

    if (!business) {
      throw new NotFoundException(
        "Marketing business not found.",
      );
    }

    return toMarketingBusiness(
      business,
    );
  }

  /* ==========================================================
     GET MARKETING DASHBOARD

     GET /marketing/dashboard

     Existing endpoint preserved.
  ========================================================== */

  @Get("dashboard")
  async dashboard(
    @Req() req: MarketingRequest,
  ) {
    const user = req.user;

    const userId =
      user?.id ??
      user?._id ??
      user?.userId ??
      user?.sub;

    if (!userId) {
      throw new Error(
        "Authenticated user ID is missing from the request.",
      );
    }

    const advertiserId =
      String(userId);

    const [
      analytics,
      campaigns,
      ads,
    ] = await Promise.all([
      this.analyticsService.getAdvertiserOverview(
        advertiserId,
      ),

      this.campaignsService.findAll(
        advertiserId,
      ),

      this.advertisementService.findMine(
        advertiserId,
      ),
    ]);

    return {
      analytics,

      campaigns:
        campaigns.slice(
          0,
          10,
        ),

      ads:
        ads.slice(
          0,
          10,
        ),
    };
  }
}