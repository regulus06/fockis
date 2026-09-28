import {
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from "@nestjs/common";

import {
  InjectModel,
} from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import {
  DesignTemplate,
  type DesignTemplateDocument,
} from "../schemas/design-template.schema";

import type {
  DesignCategory,
} from "../types/design.types";

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORIES: DesignCategory[] = [
  "logo",
  "flyer",
  "banner",
  "badge",
  "business-card",
  "poster",
  "invitation",
  "certificate",
  "social",
  "menu",
];

// ============================================================================
// TYPES
// ============================================================================

type TextAlign =
  | "left"
  | "center"
  | "right";

interface DesignElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  textAlign?: TextAlign;
  fill?: string;
  borderRadius?: number;
  visible: boolean;
  opacity: number;
  zIndex: number;
}

interface DesignDocument {
  canvas: {
    width: number;
    height: number;
    background: string;
  };
  elements: DesignElement[];
  version: number;
}

interface TemplateSeed {
  slug: string;
  name: string;
  category: DesignCategory;
  description: string;
  iconName: string;
  gradient: string;
  dimensions: string;
  popular: boolean;
  premium: boolean;
  tags: string[];
  document: DesignDocument;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class DesignTemplateService
  implements OnModuleInit
{
  private readonly logger =
    new Logger(
      DesignTemplateService.name,
    );

  constructor(
    @InjectModel(
      DesignTemplate.name,
    )
    private readonly model: Model<DesignTemplateDocument>,
  ) {}

  // ==========================================================================
  // MODULE INIT
  // ==========================================================================

  async onModuleInit(): Promise<void> {
    await this.seedDefaults();
  }

  // ==========================================================================
  // LIST
  // ==========================================================================

  async list(params: {
    category?: DesignCategory;
    search?: string;
    premium?: boolean;
    popular?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(
      1,
      params.page ?? 1,
    );

    const limit = Math.min(
      50,
      Math.max(
        1,
        params.limit ?? 24,
      ),
    );

    const filter: Record<
      string,
      unknown
    > = {
      active: true,
    };

    // ------------------------------------------------------------------------
    // CATEGORY
    // ------------------------------------------------------------------------

    if (
      params.category &&
      CATEGORIES.includes(
        params.category,
      )
    ) {
      filter.category =
        params.category;
    }

    // ------------------------------------------------------------------------
    // PREMIUM
    // ------------------------------------------------------------------------

    if (
      params.premium !==
      undefined
    ) {
      filter.premium =
        params.premium;
    }

    // ------------------------------------------------------------------------
    // POPULAR
    // ------------------------------------------------------------------------

    if (
      params.popular !==
      undefined
    ) {
      filter.popular =
        params.popular;
    }

    // ------------------------------------------------------------------------
    // SEARCH
    // ------------------------------------------------------------------------

    if (
      params.search?.trim()
    ) {
      const q =
        params.search
          .trim()
          .replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
          );

      filter.$or = [
        {
          name: new RegExp(
            q,
            "i",
          ),
        },
        {
          description:
            new RegExp(
              q,
              "i",
            ),
        },
        {
          tags: new RegExp(
            q,
            "i",
          ),
        },
      ];
    }

    // ------------------------------------------------------------------------
    // DATABASE
    // ------------------------------------------------------------------------

    const [
      items,
      total,
    ] =
      await Promise.all([
        this.model
          .find(filter)
          .sort({
            popular: -1,
            usageCount: -1,
            createdAt: -1,
          })
          .skip(
            (page - 1) * limit,
          )
          .limit(limit)
          .lean(),

        this.model.countDocuments(
          filter,
        ),
      ]);

    return {
      items,
      page,
      limit,
      total,
      pages: Math.ceil(
        total / limit,
      ),
    };
  }

  // ==========================================================================
  // FIND BY ID OR SLUG
  // ==========================================================================

  async findByIdOrSlug(
    idOrSlug: string,
  ) {
    const conditions: Array<
      Record<string, unknown>
    > = [
      {
        slug: idOrSlug,
      },
    ];

    if (
      Types.ObjectId.isValid(
        idOrSlug,
      )
    ) {
      conditions.push({
        _id: idOrSlug,
      });
    }

    const item =
      await this.model
        .findOne({
          active: true,
          $or: conditions,
        })
        .lean();

    if (!item) {
      throw new NotFoundException(
        "Design template not found",
      );
    }

    return item;
  }

  // ==========================================================================
  // INCREMENT USAGE
  // ==========================================================================

  async incrementUsage(
    id: string,
  ): Promise<void> {
    await this.model.updateOne(
      {
        _id: id,
      },
      {
        $inc: {
          usageCount: 1,
        },
      },
    );
  }

  // ==========================================================================
  // SEED DEFAULT TEMPLATES
  // ==========================================================================

  async seedDefaults() {
    const templates =
      buildTemplates();

    let created = 0;

    for (
      const template of templates
    ) {
      const result =
        await this.model.updateOne(
          {
            slug: template.slug,
          },
          {
            $setOnInsert:
              template,
          },
          {
            upsert: true,
          },
        );

      if (
        result.upsertedCount
      ) {
        created += 1;
      }
    }

    this.logger.log(
      `Design template seed complete: ${created} new templates`,
    );

    return {
      created,
      total: templates.length,
    };
  }
}

// ============================================================================
// DOCUMENT HELPER
// ============================================================================

function doc(
  width: number,
  height: number,
  background: string,
  elements: DesignElement[],
): DesignDocument {
  return {
    canvas: {
      width,
      height,
      background,
    },
    elements,
    version: 1,
  };
}

// ============================================================================
// TEXT ELEMENT
// ============================================================================

function text(
  id: string,
  content: string,
  x: number,
  y: number,
  width: number,
  height: number,
  size: number,
  color: string,
  weight = 700,
  align: TextAlign = "center",
): DesignElement {
  return {
    id,
    type: "text",
    x,
    y,
    width,
    height,
    content,
    fontFamily: "Inter",
    fontSize: size,
    fontWeight: weight,
    color,
    textAlign: align,
    visible: true,
    opacity: 1,
    zIndex: 2,
  };
}

// ============================================================================
// SHAPE ELEMENT
// ============================================================================

function shape(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  radius = 24,
): DesignElement {
  return {
    id,
    type: "shape",
    x,
    y,
    width,
    height,
    fill,
    borderRadius: radius,
    visible: true,
    opacity: 1,
    zIndex: 1,
  };
}

// ============================================================================
// BUILD DEFAULT TEMPLATES
// ============================================================================

function buildTemplates(): TemplateSeed[] {
  const base: TemplateSeed[] = [
    // ========================================================================
    // LOGOS
    // ========================================================================

    {
      slug: "logo-modern",
      name: "Modern Brand Logo",
      category: "logo",
      description:
        "Clean and professional identity for modern brands.",
      iconName: "Sparkles",
      gradient:
        "linear-gradient(135deg,#ff9900,#ff5f6d)",
      dimensions: "1000 × 1000",
      popular: true,
      premium: false,
      tags: [
        "brand",
        "modern",
        "identity",
      ],
      document: doc(
        1000,
        1000,
        "#111827",
        [
          shape(
            "mark",
            300,
            220,
            400,
            400,
            "#ff9900",
            120,
          ),
          text(
            "brand",
            "FOCKIS",
            180,
            670,
            640,
            100,
            72,
            "#ffffff",
            800,
          ),
        ],
      ),
    },

    {
      slug: "logo-luxury",
      name: "Luxury Logo",
      category: "logo",
      description:
        "Elegant identity for premium businesses.",
      iconName: "Star",
      gradient:
        "linear-gradient(135deg,#141414,#6f4e37)",
      dimensions: "1000 × 1000",
      popular: false,
      premium: true,
      tags: [
        "luxury",
        "premium",
        "gold",
      ],
      document: doc(
        1000,
        1000,
        "#15110d",
        [
          shape(
            "ring",
            300,
            220,
            400,
            400,
            "#b8893c",
            200,
          ),
          text(
            "brand",
            "YOUR BRAND",
            180,
            675,
            640,
            80,
            48,
            "#f8e7bd",
            600,
          ),
        ],
      ),
    },

    // ========================================================================
    // FLYERS
    // ========================================================================

    {
      slug: "flyer-sale",
      name: "Flash Sale Flyer",
      category: "flyer",
      description:
        "Bold promotional flyer for sales and special offers.",
      iconName: "Tag",
      gradient:
        "linear-gradient(135deg,#ef4444,#f97316)",
      dimensions: "1080 × 1350",
      popular: true,
      premium: false,
      tags: [
        "sale",
        "promotion",
        "retail",
      ],
      document: doc(
        1080,
        1350,
        "#ef4444",
        [
          text(
            "eyebrow",
            "LIMITED TIME",
            80,
            130,
            920,
            60,
            28,
            "#ffffff",
            800,
          ),
          text(
            "title",
            "FLASH SALE",
            70,
            300,
            940,
            170,
            92,
            "#ffffff",
            900,
          ),
          shape(
            "offer",
            160,
            590,
            760,
            300,
            "#111827",
            42,
          ),
          text(
            "discount",
            "UP TO 50% OFF",
            190,
            650,
            700,
            100,
            54,
            "#ffffff",
            900,
          ),
          text(
            "cta",
            "SHOP NOW",
            190,
            790,
            700,
            70,
            30,
            "#ff9900",
            900,
          ),
        ],
      ),
    },

    {
      slug: "flyer-business",
      name: "Business Promotion",
      category: "flyer",
      description:
        "Professional promotional flyer for your business.",
      iconName: "Megaphone",
      gradient:
        "linear-gradient(135deg,#2563eb,#7c3aed)",
      dimensions: "1080 × 1350",
      popular: false,
      premium: false,
      tags: [
        "business",
        "promotion",
        "corporate",
      ],
      document: doc(
        1080,
        1350,
        "#0f172a",
        [
          text(
            "title",
            "GROW YOUR BUSINESS",
            80,
            180,
            920,
            150,
            64,
            "#ffffff",
            900,
            "left",
          ),
          text(
            "sub",
            "Professional solutions. Powerful results.",
            80,
            390,
            850,
            100,
            28,
            "#cbd5e1",
            500,
            "left",
          ),
          shape(
            "cta",
            80,
            930,
            400,
            110,
            "#2563eb",
            24,
          ),
          text(
            "ctaText",
            "GET STARTED",
            80,
            955,
            400,
            60,
            28,
            "#ffffff",
            800,
          ),
        ],
      ),
    },

    // ========================================================================
    // BANNERS
    // ========================================================================

    {
      slug: "banner-store",
      name: "Store Banner",
      category: "banner",
      description:
        "Wide banner for stores, websites and marketplaces.",
      iconName: "ShoppingBag",
      gradient:
        "linear-gradient(135deg,#ff9900,#f43f5e)",
      dimensions: "1600 × 600",
      popular: true,
      premium: false,
      tags: [
        "store",
        "marketplace",
        "sale",
      ],
      document: doc(
        1600,
        600,
        "#111827",
        [
          text(
            "title",
            "FOCKIS MARKET",
            80,
            150,
            700,
            100,
            60,
            "#ffffff",
            900,
            "left",
          ),
          text(
            "sub",
            "Discover something made for you.",
            80,
            275,
            700,
            70,
            28,
            "#fed7aa",
            500,
            "left",
          ),
          shape(
            "cta",
            1160,
            205,
            300,
            110,
            "#ff9900",
            30,
          ),
          text(
            "ctaText",
            "SHOP NOW",
            1160,
            230,
            300,
            60,
            28,
            "#111827",
            900,
          ),
        ],
      ),
    },

    {
      slug: "banner-business",
      name: "Business Banner",
      category: "banner",
      description:
        "Professional website and social media banner.",
      iconName: "LayoutTemplate",
      gradient:
        "linear-gradient(135deg,#0f172a,#2563eb)",
      dimensions: "1600 × 600",
      popular: false,
      premium: false,
      tags: [
        "website",
        "corporate",
        "header",
      ],
      document: doc(
        1600,
        600,
        "#0b1120",
        [
          text(
            "title",
            "BUILD WITH CONFIDENCE",
            80,
            150,
            900,
            100,
            58,
            "#ffffff",
            900,
            "left",
          ),
          text(
            "sub",
            "Smart tools for ambitious teams.",
            80,
            275,
            800,
            60,
            27,
            "#bfdbfe",
            500,
            "left",
          ),
        ],
      ),
    },

    // ========================================================================
    // BADGE
    // ========================================================================

    {
      slug: "badge-event",
      name: "Event Badge",
      category: "badge",
      description:
        "Professional attendee and staff badge.",
      iconName: "Badge",
      gradient:
        "linear-gradient(135deg,#7c3aed,#ec4899)",
      dimensions: "900 × 1200",
      popular: true,
      premium: false,
      tags: [
        "event",
        "attendee",
        "staff",
      ],
      document: doc(
        900,
        1200,
        "#4c1d95",
        [
          shape(
            "top",
            0,
            0,
            900,
            360,
            "#7c3aed",
            0,
          ),
          text(
            "event",
            "FOCKIS SUMMIT",
            70,
            150,
            760,
            80,
            40,
            "#ffffff",
            900,
          ),
          shape(
            "photo",
            230,
            430,
            440,
            440,
            "#f5f3ff",
            220,
          ),
          text(
            "name",
            "ALEX MORGAN",
            70,
            940,
            760,
            70,
            38,
            "#ffffff",
            900,
          ),
          text(
            "role",
            "ATTENDEE",
            70,
            1015,
            760,
            50,
            22,
            "#ddd6fe",
            700,
          ),
        ],
      ),
    },

    // ========================================================================
    // BUSINESS CARDS
    // ========================================================================

    {
      slug: "business-card",
      name: "Executive Business Card",
      category: "business-card",
      description:
        "Elegant business card for professionals.",
      iconName: "BriefcaseBusiness",
      gradient:
        "linear-gradient(135deg,#111827,#374151)",
      dimensions: "1050 × 600",
      popular: true,
      premium: false,
      tags: [
        "professional",
        "executive",
        "contact",
      ],
      document: doc(
        1050,
        600,
        "#111827",
        [
          text(
            "name",
            "ALEX MORGAN",
            70,
            110,
            910,
            80,
            44,
            "#ffffff",
            900,
            "left",
          ),
          text(
            "role",
            "CREATIVE DIRECTOR",
            70,
            200,
            910,
            50,
            20,
            "#ff9900",
            800,
            "left",
          ),
          text(
            "contact",
            "hello@company.com  •  +1 555 010 2020",
            70,
            455,
            910,
            45,
            17,
            "#d1d5db",
            500,
            "left",
          ),
        ],
      ),
    },

    {
      slug: "business-card-creative",
      name: "Creative Business Card",
      category: "business-card",
      description:
        "Colorful modern business card.",
      iconName: "Palette",
      gradient:
        "linear-gradient(135deg,#f97316,#ec4899)",
      dimensions: "1050 × 600",
      popular: false,
      premium: false,
      tags: [
        "creative",
        "colorful",
        "modern",
      ],
      document: doc(
        1050,
        600,
        "#fff7ed",
        [
          shape(
            "accent",
            700,
            0,
            350,
            600,
            "#f97316",
            0,
          ),
          text(
            "name",
            "YOUR NAME",
            70,
            160,
            580,
            70,
            42,
            "#111827",
            900,
            "left",
          ),
          text(
            "role",
            "DESIGNER • MAKER • CREATOR",
            70,
            245,
            580,
            50,
            16,
            "#c2410c",
            800,
            "left",
          ),
        ],
      ),
    },

    // ========================================================================
    // POSTERS
    // ========================================================================

    {
      slug: "poster-event",
      name: "Event Poster",
      category: "poster",
      description:
        "Large-format poster for events and campaigns.",
      iconName: "Image",
      gradient:
        "linear-gradient(135deg,#0f766e,#14b8a6)",
      dimensions: "1080 × 1440",
      popular: false,
      premium: false,
      tags: [
        "event",
        "poster",
        "campaign",
      ],
      document: doc(
        1080,
        1440,
        "#042f2e",
        [
          text(
            "eyebrow",
            "LIVE EVENT",
            70,
            100,
            940,
            50,
            24,
            "#99f6e4",
            800,
            "left",
          ),
          text(
            "title",
            "MAKE IT HAPPEN",
            70,
            260,
            940,
            300,
            86,
            "#ffffff",
            900,
            "left",
          ),
          text(
            "date",
            "SATURDAY • 7 PM • DOWNTOWN",
            70,
            1060,
            940,
            60,
            24,
            "#ccfbf1",
            700,
            "left",
          ),
        ],
      ),
    },

    {
      slug: "poster-sale",
      name: "Sale Poster",
      category: "poster",
      description:
        "Bold poster for promotions and discounts.",
      iconName: "ShoppingBag",
      gradient:
        "linear-gradient(135deg,#dc2626,#f59e0b)",
      dimensions: "1080 × 1440",
      popular: false,
      premium: false,
      tags: [
        "sale",
        "discount",
        "poster",
      ],
      document: doc(
        1080,
        1440,
        "#7f1d1d",
        [
          text(
            "title",
            "MEGA SALE",
            60,
            190,
            960,
            140,
            88,
            "#ffffff",
            900,
          ),
          text(
            "discount",
            "50% OFF",
            60,
            410,
            960,
            160,
            110,
            "#fde68a",
            900,
          ),
          text(
            "cta",
            "SHOP TODAY",
            60,
            1050,
            960,
            70,
            30,
            "#ffffff",
            800,
          ),
        ],
      ),
    },

    // ========================================================================
    // INVITATIONS
    // ========================================================================

    {
      slug: "invitation-party",
      name: "Party Invitation",
      category: "invitation",
      description:
        "Beautiful invitation for celebrations.",
      iconName: "Gift",
      gradient:
        "linear-gradient(135deg,#db2777,#9333ea)",
      dimensions: "1080 × 1350",
      popular: false,
      premium: false,
      tags: [
        "party",
        "celebration",
        "invitation",
      ],
      document: doc(
        1080,
        1350,
        "#4a044e",
        [
          text(
            "eyebrow",
            "YOU ARE INVITED",
            80,
            130,
            920,
            50,
            24,
            "#fbcfe8",
            700,
          ),
          text(
            "title",
            "LET’S CELEBRATE",
            70,
            390,
            940,
            120,
            66,
            "#ffffff",
            900,
          ),
          text(
            "details",
            "Saturday • 8 PM\n123 Celebration Ave",
            100,
            700,
            880,
            180,
            28,
            "#fce7f3",
            600,
          ),
        ],
      ),
    },

    {
      slug: "invitation-birthday",
      name: "Birthday Invitation",
      category: "invitation",
      description:
        "Fun invitation for birthday celebrations.",
      iconName: "Cake",
      gradient:
        "linear-gradient(135deg,#f472b6,#facc15)",
      dimensions: "1080 × 1350",
      popular: false,
      premium: false,
      tags: [
        "birthday",
        "party",
        "kids",
      ],
      document: doc(
        1080,
        1350,
        "#fff7ed",
        [
          text(
            "title",
            "BIRTHDAY PARTY!",
            70,
            260,
            940,
            120,
            70,
            "#be185d",
            900,
          ),
          text(
            "name",
            "JORDAN’S 10TH",
            70,
            420,
            940,
            90,
            46,
            "#7c2d12",
            800,
          ),
          text(
            "details",
            "Saturday • 3:00 PM\nCome celebrate with us!",
            100,
            760,
            880,
            180,
            28,
            "#7c2d12",
            600,
          ),
        ],
      ),
    },

    // ========================================================================
    // CERTIFICATES
    // ========================================================================

    {
      slug: "certificate-achievement",
      name: "Achievement Certificate",
      category: "certificate",
      description:
        "Elegant certificate for awards and achievements.",
      iconName: "Trophy",
      gradient:
        "linear-gradient(135deg,#a16207,#f59e0b)",
      dimensions: "1600 × 1200",
      popular: false,
      premium: true,
      tags: [
        "award",
        "achievement",
        "certificate",
      ],
      document: doc(
        1600,
        1200,
        "#fffbeb",
        [
          shape(
            "border",
            50,
            50,
            1500,
            1100,
            "#a16207",
            12,
          ),
          text(
            "title",
            "CERTIFICATE OF ACHIEVEMENT",
            130,
            190,
            1340,
            100,
            54,
            "#78350f",
            900,
          ),
          text(
            "recipient",
            "THIS CERTIFICATE IS PRESENTED TO",
            130,
            430,
            1340,
            50,
            22,
            "#92400e",
            600,
          ),
          text(
            "name",
            "YOUR NAME",
            130,
            510,
            1340,
            90,
            50,
            "#111827",
            900,
          ),
          text(
            "reason",
            "For outstanding achievement and dedication.",
            130,
            690,
            1340,
            60,
            24,
            "#78350f",
            500,
          ),
        ],
      ),
    },

    {
      slug: "certificate-award",
      name: "Award Certificate",
      category: "certificate",
      description:
        "Professional certificate for recognition.",
      iconName: "FileBadge",
      gradient:
        "linear-gradient(135deg,#1e3a8a,#312e81)",
      dimensions: "1600 × 1200",
      popular: false,
      premium: false,
      tags: [
        "award",
        "recognition",
        "professional",
      ],
      document: doc(
        1600,
        1200,
        "#eef2ff",
        [
          text(
            "title",
            "CERTIFICATE OF RECOGNITION",
            100,
            180,
            1400,
            90,
            50,
            "#1e3a8a",
            900,
          ),
          text(
            "name",
            "YOUR NAME",
            100,
            470,
            1400,
            90,
            54,
            "#111827",
            900,
          ),
          text(
            "reason",
            "In recognition of excellence and commitment.",
            100,
            610,
            1400,
            70,
            24,
            "#475569",
            500,
          ),
        ],
      ),
    },

    // ========================================================================
    // SOCIAL
    // ========================================================================

    {
      slug: "social-instagram",
      name: "Social Media Post",
      category: "social",
      description:
        "Modern social media post template.",
      iconName: "Share2",
      gradient:
        "linear-gradient(135deg,#f97316,#ec4899,#8b5cf6)",
      dimensions: "1080 × 1080",
      popular: true,
      premium: false,
      tags: [
        "instagram",
        "social",
        "post",
      ],
      document: doc(
        1080,
        1080,
        "#111827",
        [
          text(
            "eyebrow",
            "FOCKIS",
            70,
            80,
            940,
            50,
            22,
            "#fed7aa",
            800,
            "left",
          ),
          text(
            "title",
            "CREATE\nSOMETHING\nGREAT.",
            70,
            260,
            940,
            350,
            82,
            "#ffffff",
            900,
            "left",
          ),
          text(
            "cta",
            "SAVE • SHARE • CREATE",
            70,
            900,
            940,
            50,
            20,
            "#fce7f3",
            700,
            "left",
          ),
        ],
      ),
    },

    {
      slug: "social-story",
      name: "Story Promotion",
      category: "social",
      description:
        "Vertical story template for promotions.",
      iconName: "Camera",
      gradient:
        "linear-gradient(135deg,#7c3aed,#db2777)",
      dimensions: "1080 × 1920",
      popular: false,
      premium: false,
      tags: [
        "story",
        "promotion",
        "mobile",
      ],
      document: doc(
        1080,
        1920,
        "#4c1d95",
        [
          text(
            "title",
            "NEW DROP",
            70,
            350,
            940,
            120,
            76,
            "#ffffff",
            900,
          ),
          text(
            "sub",
            "AVAILABLE NOW",
            70,
            510,
            940,
            70,
            30,
            "#fbcfe8",
            700,
          ),
          shape(
            "cta",
            240,
            1450,
            600,
            120,
            "#ffffff",
            32,
          ),
          text(
            "ctaText",
            "SHOP NOW",
            240,
            1475,
            600,
            60,
            28,
            "#7c3aed",
            900,
          ),
        ],
      ),
    },

    // ========================================================================
    // MENUS
    // ========================================================================

    {
      slug: "menu-restaurant",
      name: "Restaurant Menu",
      category: "menu",
      description:
        "Beautiful menu design for restaurants and cafés.",
      iconName: "Menu",
      gradient:
        "linear-gradient(135deg,#92400e,#f97316)",
      dimensions: "1200 × 1600",
      popular: true,
      premium: false,
      tags: [
        "restaurant",
        "food",
        "menu",
      ],
      document: doc(
        1200,
        1600,
        "#fff7ed",
        [
          text(
            "brand",
            "YOUR RESTAURANT",
            80,
            100,
            1040,
            80,
            42,
            "#7c2d12",
            900,
          ),
          text(
            "section",
            "SIGNATURE MENU",
            80,
            300,
            1040,
            60,
            28,
            "#c2410c",
            800,
            "left",
          ),
          text(
            "item1",
            "Grilled Salmon ........ $24",
            80,
            430,
            1040,
            60,
            24,
            "#292524",
            600,
            "left",
          ),
          text(
            "item2",
            "Herb Chicken .......... $19",
            80,
            520,
            1040,
            60,
            24,
            "#292524",
            600,
            "left",
          ),
          text(
            "item3",
            "House Pasta ........... $17",
            80,
            610,
            1040,
            60,
            24,
            "#292524",
            600,
            "left",
          ),
        ],
      ),
    },

    {
      slug: "menu-modern",
      name: "Modern Menu",
      category: "menu",
      description:
        "Minimal modern menu for food businesses.",
      iconName: "FileText",
      gradient:
        "linear-gradient(135deg,#111827,#4b5563)",
      dimensions: "1200 × 1600",
      popular: false,
      premium: false,
      tags: [
        "menu",
        "minimal",
        "cafe",
      ],
      document: doc(
        1200,
        1600,
        "#f8fafc",
        [
          text(
            "brand",
            "MENU",
            90,
            120,
            1020,
            100,
            64,
            "#111827",
            900,
            "left",
          ),
          text(
            "section",
            "STARTERS",
            90,
            360,
            1020,
            50,
            22,
            "#64748b",
            800,
            "left",
          ),
          text(
            "items",
            "Bruschetta\nTruffle Fries\nSeasonal Salad",
            90,
            440,
            1020,
            240,
            28,
            "#111827",
            600,
            "left",
          ),
        ],
      ),
    },
  ];

  return base;
}