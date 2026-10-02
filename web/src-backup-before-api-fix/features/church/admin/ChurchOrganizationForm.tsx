/**
 * ChurchOrganizationForm.tsx
 * -----------------------------------------------------------------------------
 * GENERAL FOCKIS ORGANIZATION CREATE / EDIT FORM
 *
 * Supports:
 * - Any Fockis organization category/type
 * - REQUIRED Fockis organization domain during creation
 * - Fockis domain prefix + suffix selector
 * - Domain availability checking
 * - Organization logo URL
 * - Organization cover photo URL
 * - Cover photo selected from the user's device
 * - Immediate cover photo preview
 * - Responsive professional Fockis styling
 * - Leadership display
 * - Branch/location management
 * - No hard-coded organization IDs
 *
 * IMPORTANT:
 * - The backend organization field is `bannerUrl`.
 * - Device-selected images are previewed locally.
 * - URL-based cover photos are persisted through `bannerUrl`.
 * - A real uploaded-device image URL must come from the backend upload
 *   service before it can survive a page refresh.
 * - Organization domains are permanent Fockis namespaces.
 * - Domain changes are intentionally disabled in edit mode.
 */

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  createOrganization,
  getOrganization,
  updateOrganization,
} from "../api/organizationsApi";

import {
  LeadershipRole,
  OrganizationType,
  ORGANIZATION_TYPE_LABELS,
  type Branch,
  type CreateOrganizationInput,
  type LeadershipMember,
  type Organization,
} from "../types/church.types";

import "../styles/ChurchAdmin.scss";

/* ============================================================================
   FOCKIS DOMAIN CONFIGURATION
   ========================================================================== */

const FOCKIS_DOMAIN_SUFFIXES = [
  ".fockis.com",
  ".fockis.org",
  ".fockis.net",
  ".fockis.edu",
  ".fockis.church",
  ".fockis.co",
  ".fockis.io",
] as const;

type FockisDomainSuffix =
  (typeof FOCKIS_DOMAIN_SUFFIXES)[number];

const DEFAULT_FOCKIS_DOMAIN_SUFFIX: FockisDomainSuffix =
  ".fockis.com";

/*
 * Organization namespace:
 *
 *   springfieldchurch.fockis.com
 *
 * The prefix is intentionally limited to DNS-safe characters.
 */
const FOCKIS_ORGANIZATION_PREFIX_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/*
 * Complete organization domain:
 *
 *   springfieldchurch.fockis.com
 *   springfieldchurch.fockis.church
 */
const FOCKIS_ORGANIZATION_DOMAIN_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.fockis\.(?:com|org|net|edu|church|co|io)$/i;

/* ============================================================================
   LAYOUT
   ========================================================================== */

const styleFormRoot: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "18px",
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
};

const stylePanel: React.CSSProperties = {
  display: "block",
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
};

const stylePanelHeading: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  flexWrap: "wrap",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
  width: "100%",
};

const styleField: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
  marginTop: "20px",
};

const styleFieldFirst: React.CSSProperties = {
  ...styleField,
  marginTop: 0,
};

const styleFieldRow: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  flexWrap: "wrap",
  gap: "16px",
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
};

const styleFieldInRow: React.CSSProperties = {
  ...styleField,
  marginTop: "20px",
  flex: "1 1 220px",
  minWidth: "0",
};

const styleCheckboxField: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: "8px",
  marginTop: "20px",
  flex: "0 0 auto",
};

const styleFormActions: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: "11px",
  width: "100%",
  boxSizing: "border-box",
};

const styleTypeGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fill, minmax(190px, 1fr))",
  gap: "10px",
  marginTop: "8px",
  width: "100%",
  boxSizing: "border-box",
};

const styleInfoBox: React.CSSProperties = {
  marginTop: "16px",
  padding: "14px 16px",
  borderRadius: "10px",
  background: "rgba(0, 90, 141, 0.06)",
  border: "1px solid rgba(0, 90, 141, 0.12)",
  width: "100%",
  boxSizing: "border-box",
};

const styleSelectCategoryFirstBox: React.CSSProperties = {
  marginTop: "10px",
  padding: "16px 18px",
  borderRadius: "10px",
  background: "rgba(0, 90, 141, 0.06)",
  border: "1px solid rgba(0, 90, 141, 0.14)",
  width: "100%",
  boxSizing: "border-box",
};

const styleBranchEditor: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  width: "100%",
  boxSizing: "border-box",
  paddingTop: "18px",
  marginTop: "18px",
  borderTop:
    "1px solid var(--admin-border, #dce4ea)",
};

/* ============================================================================
   PROPS
   ========================================================================== */

export interface ChurchOrganizationFormProps {
  mode?: "create" | "edit";
}

/* ============================================================================
   TYPES
   ========================================================================== */

type BranchDraft = Omit<
  Branch,
  "id" | "organizationId"
>;

type OrganizationCategory =
  | "all"
  | "faith"
  | "education"
  | "civic"
  | "social"
  | "nonprofit"
  | "business"
  | "sports"
  | "arts"
  | "health"
  | "youth"
  | "clubs"
  | "technology"
  | "environment"
  | "other";

interface OrganizationCategoryDefinition {
  id: OrganizationCategory;
  label: string;
  description: string;
}

/* ============================================================================
   CATEGORIES
   ========================================================================== */

const ORGANIZATION_CATEGORIES:
  OrganizationCategoryDefinition[] = [
  {
    id: "all",
    label: "All organizations",
    description:
      "Show every organization type.",
  },
  {
    id: "faith",
    label: "Faith & Religion",
    description:
      "Churches, ministries, missions, fellowships and religious organizations.",
  },
  {
    id: "education",
    label: "Education",
    description:
      "Schools, colleges, universities, academies and education organizations.",
  },
  {
    id: "civic",
    label: "Civic & Political",
    description:
      "Civic, political, advocacy and public-interest organizations.",
  },
  {
    id: "social",
    label: "Community & Social",
    description:
      "Community groups, social organizations and neighborhood organizations.",
  },
  {
    id: "nonprofit",
    label: "Nonprofit & Charity",
    description:
      "Nonprofits, charities, foundations, humanitarian and relief organizations.",
  },
  {
    id: "business",
    label: "Business & Professional",
    description:
      "Businesses, companies, professional organizations and industry groups.",
  },
  {
    id: "sports",
    label: "Sports & Recreation",
    description:
      "Sports clubs, teams, leagues, fitness and recreation organizations.",
  },
  {
    id: "arts",
    label: "Arts & Culture",
    description:
      "Arts, music, theater, dance and cultural organizations.",
  },
  {
    id: "health",
    label: "Health & Wellness",
    description:
      "Health, medical, wellness and care organizations.",
  },
  {
    id: "youth",
    label: "Youth & Family",
    description:
      "Youth, children, parents and family organizations.",
  },
  {
    id: "clubs",
    label: "Clubs & Associations",
    description:
      "Clubs, societies, alumni organizations and associations.",
  },
  {
    id: "technology",
    label: "Technology",
    description:
      "Technology, software, developer and innovation organizations.",
  },
  {
    id: "environment",
    label: "Environment",
    description:
      "Environmental, conservation, climate and sustainability organizations.",
  },
  {
    id: "other",
    label: "Other",
    description:
      "Organization types that do not fit another category.",
  },
];

/* ============================================================================
   TYPE → CATEGORY
   ========================================================================== */

const EXPLICIT_TYPE_CATEGORY_BY_LABEL:
  Record<string, OrganizationCategory> = {
  church: "faith",
  "christian church": "faith",
  "christian ministry": "faith",
  "christian fellowship": "faith",
  mission: "faith",
  "prayer organization": "faith",
  "christian network": "faith",
  "christian nonprofit": "faith",
  "bible study organization": "faith",
  mosque: "faith",
  "islamic organization": "faith",
  synagogue: "faith",
  "jewish organization": "faith",
  temple: "faith",
  "religious organization": "faith",
  "religious institution": "faith",
  "faith organization": "faith",

  school: "education",
  "elementary school": "education",
  "middle school": "education",
  "high school": "education",
  "private school": "education",
  "public school": "education",
  "charter school": "education",
  college: "education",
  university: "education",
  "community college": "education",
  "vocational school": "education",
  "technical school": "education",
  "trade school": "education",
  academy: "education",
  "training institute": "education",
  "training organization": "education",
  "educational organization": "education",
  "educational institution": "education",
  "student organization": "education",
  "education organization": "education",
  institute: "education",

  "political organization": "civic",
  "political party": "civic",
  "civic organization": "civic",
  "advocacy organization": "civic",
  "government organization": "civic",
  "public affairs organization": "civic",
  "community action organization": "civic",

  "social organization": "social",
  "community organization": "social",
  "community group": "social",
  "neighborhood organization": "social",
  "support group": "social",

  nonprofit: "nonprofit",
  "nonprofit organization": "nonprofit",
  "non-profit organization": "nonprofit",
  charity: "nonprofit",
  foundation: "nonprofit",
  "humanitarian organization": "nonprofit",
  "relief organization": "nonprofit",
  "volunteer organization": "nonprofit",

  business: "business",
  company: "business",
  "professional organization": "business",
  "professional association": "business",
  "trade association": "business",
  "industry association": "business",
  "business association": "business",

  "sports club": "sports",
  "sports organization": "sports",
  "sports league": "sports",
  "athletic team": "sports",
  "athletic organization": "sports",
  "recreation organization": "sports",
  "fitness organization": "sports",

  "arts organization": "arts",
  "cultural organization": "arts",
  "music organization": "arts",
  "theater organization": "arts",
  "theatre organization": "arts",
  "dance organization": "arts",
  "creative organization": "arts",
  "performing arts organization": "arts",

  "health organization": "health",
  "healthcare organization": "health",
  "medical organization": "health",
  "wellness organization": "health",
  "mental health organization": "health",

  "youth organization": "youth",
  "family organization": "youth",
  "children's organization": "youth",
  "children organization": "youth",
  "parent organization": "youth",

  club: "clubs",
  association: "clubs",
  society: "clubs",
  "alumni organization": "clubs",
  "alumni association": "clubs",

  "technology organization": "technology",
  "technology group": "technology",
  "developer organization": "technology",
  "software organization": "technology",
  "innovation organization": "technology",
  "startup organization": "technology",

  "environmental organization": "environment",
  "environment organization": "environment",
  "conservation organization": "environment",
  "climate organization": "environment",
};

/* ============================================================================
   LEADERSHIP LABELS
   ========================================================================== */

const LEADERSHIP_ROLE_LABELS:
  Record<LeadershipRole, string> = {
  [LeadershipRole.Owner]: "Owner",
  [LeadershipRole.Administrator]:
    "Administrator",
  [LeadershipRole.PastorDirector]:
    "Pastor / Director",
  [LeadershipRole.Leader]: "Leader",
  [LeadershipRole.Staff]: "Staff",
};

/* ============================================================================
   DEFAULT BRANCH
   ========================================================================== */

const EMPTY_BRANCH: BranchDraft = {
  name: "",
  isMainLocation: false,
  address: {
    line1: "",
    city: "",
    country: "",
  },
};

/* ============================================================================
   HELPERS
   ========================================================================== */

function getErrorMessage(
  error: unknown,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    const message = (
      error as {
        message?: unknown;
      }
    ).message;

    if (typeof message === "string") {
      return message;
    }
  }

  return "Something went wrong. Please try again.";
}

function isValidOrganizationId(
  value: string,
): boolean {
  const id = value.trim();

  if (!id) {
    return false;
  }

  if (
    id === "YOUR_ORG_ID" ||
    id === "undefined" ||
    id === "null"
  ) {
    return false;
  }

  return /^[a-fA-F0-9]{24}$/.test(id);
}

function getOrganizationIdFromResponse(
  organization: unknown,
): string {
  if (
    typeof organization !== "object" ||
    organization === null
  ) {
    return "";
  }

  const value = organization as {
    id?: unknown;
    _id?: unknown;
  };

  if (typeof value.id === "string") {
    return value.id.trim();
  }

  if (typeof value._id === "string") {
    return value._id.trim();
  }

  return "";
}

function normalizeText(
  value: unknown,
): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/* ============================================================================
   DOMAIN HELPERS
   ========================================================================== */

function normalizeDomainPrefix(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildFockisDomain(
  prefix: string,
  suffix: FockisDomainSuffix,
): string {
  return `${normalizeDomainPrefix(prefix)}${suffix}`;
}

function isValidFockisOrganizationDomain(
  value: string,
): boolean {
  return FOCKIS_ORGANIZATION_DOMAIN_PATTERN.test(
    value.trim().toLowerCase(),
  );
}

function getDomainPrefix(
  domain: string,
): string {
  const normalized =
    domain.trim().toLowerCase();

  const suffix =
    FOCKIS_DOMAIN_SUFFIXES.find(
      (candidate) =>
        normalized.endsWith(candidate),
    );

  if (!suffix) {
    return "";
  }

  return normalized.slice(
    0,
    -suffix.length,
  );
}

function getDomainSuffix(
  domain: string,
): FockisDomainSuffix {
  const normalized =
    domain.trim().toLowerCase();

  const suffix =
    FOCKIS_DOMAIN_SUFFIXES.find(
      (candidate) =>
        normalized.endsWith(candidate),
    );

  return (
    suffix ??
    DEFAULT_FOCKIS_DOMAIN_SUFFIX
  );
}

function getCategoryForOrganizationType(
  type: OrganizationType,
): OrganizationCategory {
  const label = normalizeText(
    ORGANIZATION_TYPE_LABELS[type] ?? type,
  );

  const explicitCategory =
    EXPLICIT_TYPE_CATEGORY_BY_LABEL[label];

  if (explicitCategory) {
    return explicitCategory;
  }

  if (
    /church|christian|christ|ministr|mission|fellowship|prayer|bible|religious|religion|faith|mosque|islam|muslim|synagogue|jewish|temple|spiritual|pastor/.test(
      label,
    )
  ) {
    return "faith";
  }

  if (
    /school|college|university|education|educational|academy|training|student|learning|institute|vocational|technical|trade/.test(
      label,
    )
  ) {
    return "education";
  }

  if (
    /political|politics|civic|advocacy|government|campaign|public affairs|community action/.test(
      label,
    )
  ) {
    return "civic";
  }

  if (
    /social|community|neighborhood|support group|community group/.test(
      label,
    )
  ) {
    return "social";
  }

  if (
    /nonprofit|non-profit|charity|foundation|humanitarian|volunteer|relief/.test(
      label,
    )
  ) {
    return "nonprofit";
  }

  if (
    /business|professional|company|trade|commerce|entrepreneur|industry/.test(
      label,
    )
  ) {
    return "business";
  }

  if (
    /sport|athletic|recreation|league|fitness|team/.test(
      label,
    )
  ) {
    return "sports";
  }

  if (
    /art|culture|cultural|music|theater|theatre|dance|creative|performing/.test(
      label,
    )
  ) {
    return "arts";
  }

  if (
    /health|wellness|medical|healthcare|mental|therapy|care/.test(
      label,
    )
  ) {
    return "health";
  }

  if (
    /youth|family|children|child|parent|young/.test(
      label,
    )
  ) {
    return "youth";
  }

  if (
    /club|association|society|alumni|organization|organisation|group/.test(
      label,
    )
  ) {
    return "clubs";
  }

  if (
    /technology|tech|developer|software|innovation|startup|digital/.test(
      label,
    )
  ) {
    return "technology";
  }

  if (
    /environment|environmental|conservation|climate|green|sustainability|nature/.test(
      label,
    )
  ) {
    return "environment";
  }

  return "other";
}

function getOrganizationTypes(): OrganizationType[] {
  return Object.values(
    OrganizationType,
  ).filter(
    (
      value,
    ): value is OrganizationType =>
      typeof value === "string",
  );
}

/* ============================================================================
   IMAGE URL VALIDATION
   ========================================================================== */

function isValidImageUrl(
  value: string,
): boolean {
  const url = value.trim();

  if (!url) {
    return true;
  }

  try {
    const parsed = new URL(url);

    return (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:"
    );
  } catch {
    return false;
  }
}

/* ============================================================================
   COMPONENT
   ========================================================================== */

export default function ChurchOrganizationForm({
  mode = "edit",
}: ChurchOrganizationFormProps): React.JSX.Element {
  const navigate = useNavigate();

  const params =
    useParams<{
      organizationId?: string;
    }>();

  const organizationId =
    params.organizationId?.trim() ?? "";

  const isCreateMode =
    mode === "create";

  const isEditMode =
    mode === "edit";

  /* ==========================================================================
     PROFILE
     ======================================================================== */

  const [profile, setProfile] =
    useState<
      CreateOrganizationInput & {
        bannerUrl?: string;
        domain?: string;
      }
    >({
      name: "",
      organizationType:
        OrganizationType.Church,
      domain: "",
      description: "",
      website: "",
      logoUrl: "",
      bannerUrl: "",
      contact: {
        email: "",
        phone: "",
      },
    });

  /* ==========================================================================
     DOMAIN
     ======================================================================== */

  const [
    domainPrefix,
    setDomainPrefix,
  ] = useState("");

  const [
    domainSuffix,
    setDomainSuffix,
  ] =
    useState<FockisDomainSuffix>(
      DEFAULT_FOCKIS_DOMAIN_SUFFIX,
    );

  const [
    domainAvailability,
    setDomainAvailability,
  ] = useState<
    "idle" | "checking" | "available" | "unavailable"
  >("idle");

  const [
    domainAvailabilityMessage,
    setDomainAvailabilityMessage,
  ] = useState<string | null>(null);

  const fullFockisDomain =
    useMemo(
      () =>
        buildFockisDomain(
          domainPrefix,
          domainSuffix,
        ),
      [
        domainPrefix,
        domainSuffix,
      ],
    );

  /* ==========================================================================
     COVER PHOTO
     ======================================================================== */

  const [coverPhotoFile, setCoverPhotoFile] =
    useState<File | null>(null);

  const [coverPhotoPreview, setCoverPhotoPreview] =
    useState<string>("");

  const [coverPhotoUrlMode, setCoverPhotoUrlMode] =
    useState(true);

  /* ==========================================================================
     CATEGORY
     ======================================================================== */

  const [
    organizationCategory,
    setOrganizationCategory,
  ] =
    useState<OrganizationCategory>(
      "all",
    );

  const [
    organizationTypeSearch,
    setOrganizationTypeSearch,
  ] = useState("");

  const organizationTypes = useMemo(
    () => getOrganizationTypes(),
    [],
  );

  const filteredOrganizationTypes =
    useMemo(() => {
      const search =
        normalizeText(
          organizationTypeSearch,
        );

      return organizationTypes.filter(
        (type) => {
          const label = String(
            ORGANIZATION_TYPE_LABELS[
              type
            ] ?? type,
          );

          const typeCategory =
            getCategoryForOrganizationType(
              type,
            );

          const categoryMatches =
            typeCategory ===
            organizationCategory;

          const searchMatches =
            !search ||
            normalizeText(
              label,
            ).includes(search);

          return (
            categoryMatches &&
            searchMatches
          );
        },
      );
    }, [
      organizationTypes,
      organizationCategory,
      organizationTypeSearch,
    ]);

  /* ==========================================================================
     LEADERSHIP
     ======================================================================== */

  const [
    leadership,
    setLeadership,
  ] = useState<LeadershipMember[]>([]);

  /* ==========================================================================
     BRANCHES
     ======================================================================== */

  const [
    branches,
    setBranches,
  ] = useState<BranchDraft[]>([
    {
      ...EMPTY_BRANCH,
      isMainLocation: true,
    },
  ]);

  /* ==========================================================================
     STATE
     ======================================================================== */

  const [
    isLoading,
    setIsLoading,
  ] = useState(isEditMode);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<string | null>(null);

  /* ==========================================================================
     DOMAIN INPUT
     ======================================================================== */

  const handleDomainPrefixChange = (
    value: string,
  ): void => {
    const normalized =
      normalizeDomainPrefix(value);

    setDomainPrefix(normalized);

    setDomainAvailability("idle");

    setDomainAvailabilityMessage(null);
  };

  const handleDomainSuffixChange = (
    value: FockisDomainSuffix,
  ): void => {
    setDomainSuffix(value);

    setDomainAvailability("idle");

    setDomainAvailabilityMessage(null);
  };

  /* ==========================================================================
     DOMAIN AVAILABILITY
     ======================================================================== */

  const checkDomainAvailability = async (): Promise<void> => {
    if (!isCreateMode) {
      return;
    }

    const normalizedPrefix =
      normalizeDomainPrefix(
        domainPrefix,
      );

    const candidate =
      buildFockisDomain(
        normalizedPrefix,
        domainSuffix,
      );

    if (!normalizedPrefix) {
      setDomainAvailability(
        "unavailable",
      );

      setDomainAvailabilityMessage(
        "Enter an organization domain prefix.",
      );

      return;
    }

    if (
      !FOCKIS_ORGANIZATION_PREFIX_PATTERN.test(
        normalizedPrefix,
      )
    ) {
      setDomainAvailability(
        "unavailable",
      );

      setDomainAvailabilityMessage(
        "Use 1–63 lowercase letters, numbers, or hyphens. The prefix cannot start or end with a hyphen.",
      );

      return;
    }

    if (
      !isValidFockisOrganizationDomain(
        candidate,
      )
    ) {
      setDomainAvailability(
        "unavailable",
      );

      setDomainAvailabilityMessage(
        "Enter a valid Fockis organization domain.",
      );

      return;
    }

    setDomainAvailability(
      "checking",
    );

    setDomainAvailabilityMessage(
      null,
    );

    try {
      /*
       * The current organization API may not yet expose a domain availability
       * endpoint. When it does, wire the call here.
       *
       * Until then, creation is still protected by the backend's unique
       * domain constraint.
       *
       * We deliberately do not pretend that a client-side availability check
       * succeeded when no API endpoint exists.
       */

      setDomainAvailability(
        "idle",
      );

      setDomainAvailabilityMessage(
        "Domain format is valid. Final availability will be verified by the server when you create the organization.",
      );
    } catch (err) {
      setDomainAvailability(
        "unavailable",
      );

      setDomainAvailabilityMessage(
        getErrorMessage(err),
      );
    }
  };

  /* ==========================================================================
     COVER PHOTO FILE
     ======================================================================== */

  const handleCoverPhotoFile = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Cover photo must be JPG, PNG, or WebP.",
      );

      event.target.value = "";

      return;
    }

    const maxSize =
      10 * 1024 * 1024;

    if (file.size > maxSize) {
      setError(
        "Cover photo cannot be larger than 10 MB.",
      );

      event.target.value = "";

      return;
    }

    setError(null);

    setCoverPhotoFile(file);

    const objectUrl =
      URL.createObjectURL(file);

    setCoverPhotoPreview(objectUrl);

    setCoverPhotoUrlMode(false);
  };

  /* ==========================================================================
     CLEAR COVER PHOTO
     ======================================================================== */

  const clearCoverPhoto = (): void => {
    if (coverPhotoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(
        coverPhotoPreview,
      );
    }

    setCoverPhotoFile(null);
    setCoverPhotoPreview("");

    setProfile(
      (current) => ({
        ...current,
        bannerUrl: "",
      }),
    );

    setCoverPhotoUrlMode(true);
  };

  /* ==========================================================================
     COVER URL CHANGE
     ======================================================================== */

  const handleCoverPhotoUrlChange = (
    value: string,
  ): void => {
    setCoverPhotoFile(null);
    setCoverPhotoUrlMode(true);

    if (coverPhotoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(
        coverPhotoPreview,
      );
    }

    setCoverPhotoPreview("");

    setProfile(
      (current) => ({
        ...current,
        bannerUrl: value,
      }),
    );
  };

  /* ==========================================================================
     COVER PREVIEW
     ======================================================================== */

  const activeCoverPreview =
    coverPhotoPreview ||
    profile.bannerUrl ||
    "";

  /* ==========================================================================
     LOAD EXISTING ORGANIZATION
     ======================================================================== */

  useEffect(() => {
    if (!isEditMode) {
      setIsLoading(false);
      return;
    }

    if (!organizationId) {
      setError(
        "No organization ID was provided.",
      );

      setIsLoading(false);

      return;
    }

    if (
      !isValidOrganizationId(
        organizationId,
      )
    ) {
      setError(
        "The organization ID is invalid.",
      );

      setIsLoading(false);

      return;
    }

    let cancelled = false;

    async function loadOrganization(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const organization: Organization =
          await getOrganization(
            organizationId,
          );

        if (cancelled) {
          return;
        }

        const organizationWithBanner =
          organization as Organization & {
            bannerUrl?: string | null;
            domain?: string | null;
          };

        const existingDomain =
          organizationWithBanner.domain?.trim()
            .toLowerCase() ?? "";

        setProfile({
          name:
            organization.name ?? "",

          organizationType:
            organization.organizationType,

          domain:
            existingDomain,

          logoUrl:
            organization.logoUrl ?? "",

          bannerUrl:
            organizationWithBanner.bannerUrl ??
            "",

          description:
            organization.description ?? "",

          website:
            organization.website ?? "",

          contact:
            organization.contact ?? {
              email: "",
              phone: "",
            },
        });

        if (existingDomain) {
          setDomainPrefix(
            getDomainPrefix(
              existingDomain,
            ),
          );

          setDomainSuffix(
            getDomainSuffix(
              existingDomain,
            ),
          );
        }

        setOrganizationCategory(
          getCategoryForOrganizationType(
            organization.organizationType,
          ),
        );

        setOrganizationTypeSearch("");

        setLeadership(
          Array.isArray(
            organization.leadership,
          )
            ? organization.leadership
            : [],
        );

        setBranches(
          Array.isArray(
            organization.branches,
          ) &&
            organization.branches.length >
              0
            ? organization.branches.map(
                (branch) => ({
                  name:
                    branch.name ?? "",

                  isMainLocation:
                    Boolean(
                      branch.isMainLocation,
                    ),

                  address:
                    branch.address ?? {
                      line1: "",
                      city: "",
                      country: "",
                    },
                }),
              )
            : [
                {
                  ...EMPTY_BRANCH,
                  isMainLocation: true,
                },
              ],
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            getErrorMessage(err),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadOrganization();

    return () => {
      cancelled = true;
    };
  }, [
    isEditMode,
    organizationId,
  ]);

  /* ==========================================================================
     CLEANUP OBJECT URL
     ======================================================================== */

  useEffect(() => {
    return () => {
      if (coverPhotoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(
          coverPhotoPreview,
        );
      }
    };
  }, [coverPhotoPreview]);

  /* ==========================================================================
     BRANCH FUNCTIONS
     ======================================================================== */

  const updateBranch = (
    index: number,
    patch: Partial<BranchDraft>,
  ): void => {
    setBranches((items) =>
      items.map(
        (
          branch,
          branchIndex,
        ) =>
          branchIndex === index
            ? {
                ...branch,
                ...patch,
              }
            : branch,
      ),
    );
  };

  const updateBranchAddress = (
    index: number,
    patch: Partial<
      NonNullable<
        BranchDraft["address"]
      >
    >,
  ): void => {
    setBranches((items) =>
      items.map(
        (
          branch,
          branchIndex,
        ) =>
          branchIndex === index
            ? {
                ...branch,
                address: {
                  ...(branch.address ?? {
                    line1: "",
                    city: "",
                    country: "",
                  }),
                  ...patch,
                },
              }
            : branch,
      ),
    );
  };

  const addBranch = (): void => {
    setBranches((items) => [
      ...items,
      {
        ...EMPTY_BRANCH,
      },
    ]);
  };

  const removeBranch = (
    index: number,
  ): void => {
    setBranches((items) => {
      const next = items.filter(
        (
          _,
          branchIndex,
        ) =>
          branchIndex !== index,
      );

      if (
        next.length > 0 &&
        !next.some(
          (branch) =>
            branch.isMainLocation,
        )
      ) {
        next[0] = {
          ...next[0],
          isMainLocation: true,
        };
      }

      return next;
    });
  };

  const setMainBranch = (
    index: number,
    checked: boolean,
  ): void => {
    setBranches((items) =>
      items.map(
        (
          branch,
          branchIndex,
        ) => ({
          ...branch,
          isMainLocation:
            checked
              ? branchIndex === index
              : branch.isMainLocation,
        }),
      ),
    );
  };

  /* ==========================================================================
     ORGANIZATION TYPE
     ======================================================================== */

  const selectOrganizationType = (
    type: OrganizationType,
  ): void => {
    setProfile(
      (current) => ({
        ...current,
        organizationType:
          type,
      }),
    );

    setOrganizationCategory(
      getCategoryForOrganizationType(
        type,
      ),
    );

    setOrganizationTypeSearch("");
  };

  /* ==========================================================================
     CATEGORY
     ======================================================================== */

  const selectOrganizationCategory = (
    category: OrganizationCategory,
  ): void => {
    setOrganizationCategory(
      category,
    );

    setOrganizationTypeSearch("");

    if (category === "all") {
      return;
    }

    const currentType =
      profile.organizationType;

    if (!currentType) {
      return;
    }

    const currentTypeCategory =
      getCategoryForOrganizationType(
        currentType,
      );

    if (
      currentTypeCategory !==
      category
    ) {
      setProfile(
        (current) => ({
          ...current,
          organizationType:
            "" as OrganizationType,
        }),
      );
    }
  };

  /* ==========================================================================
     SUBMIT
     ======================================================================== */

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    setError(null);
    setSuccessMessage(null);

    const name =
      profile.name.trim();

    if (!name) {
      setError(
        "Organization name is required.",
      );

      return;
    }

    if (!profile.organizationType) {
      setError(
        "Please select an organization type.",
      );

      return;
    }

    if (
      organizationCategory ===
      "all"
    ) {
      setError(
        "Please select an organization category.",
      );

      return;
    }

    if (
      getCategoryForOrganizationType(
        profile.organizationType,
      ) !==
      organizationCategory
    ) {
      setError(
        "Please select an organization type from the selected category.",
      );

      return;
    }

    /* ======================================================================
       CREATE MODE DOMAIN VALIDATION
       ==================================================================== */

    let organizationDomain =
      profile.domain?.trim().toLowerCase() ??
      "";

    if (isCreateMode) {
      const normalizedPrefix =
        normalizeDomainPrefix(
          domainPrefix,
        );

      if (!normalizedPrefix) {
        setError(
          "A Fockis organization domain is required.",
        );

        return;
      }

      if (
        !FOCKIS_ORGANIZATION_PREFIX_PATTERN.test(
          normalizedPrefix,
        )
      ) {
        setError(
          "Your Fockis domain prefix must contain only letters, numbers, and hyphens, and cannot start or end with a hyphen.",
        );

        return;
      }

      organizationDomain =
        buildFockisDomain(
          normalizedPrefix,
          domainSuffix,
        );

      if (
        !isValidFockisOrganizationDomain(
          organizationDomain,
        )
      ) {
        setError(
          "Please enter a valid Fockis organization domain.",
        );

        return;
      }

      /*
       * Never allow the bare Fockis root domain.
       *
       * For example:
       *
       *   fockis.com                  ❌
       *   springfieldchurch.com       ❌
       *   springfieldchurch.fockis.com ✅
       */
      if (
        organizationDomain ===
          ".fockis.com" ||
        organizationDomain ===
          "fockis.com"
      ) {
        setError(
          "The Fockis root domain cannot be used as an organization domain.",
        );

        return;
      }

      setProfile(
        (current) => ({
          ...current,
          domain:
            organizationDomain,
        }),
      );
    } else if (isEditMode) {
      /*
       * Existing organization domains are permanent.
       *
       * We deliberately send the existing domain back unchanged so an
       * ordinary profile edit cannot accidentally remove the namespace.
       */
      if (
        !organizationDomain ||
        !isValidFockisOrganizationDomain(
          organizationDomain,
        )
      ) {
        setError(
          "This organization does not have a valid Fockis domain. The domain must be repaired by the organization administration system before this profile can be saved.",
        );

        return;
      }
    }

    if (
      profile.bannerUrl &&
      !isValidImageUrl(
        profile.bannerUrl,
      )
    ) {
      setError(
        "Please enter a valid cover photo URL.",
      );

      return;
    }

    if (
      profile.logoUrl &&
      !isValidImageUrl(
        profile.logoUrl,
      )
    ) {
      setError(
        "Please enter a valid logo URL.",
      );

      return;
    }

    if (
      profile.website &&
      !isValidImageUrl(
        profile.website,
      )
    ) {
      setError(
        "Please enter a valid website URL.",
      );

      return;
    }

    if (
      isEditMode &&
      !isValidOrganizationId(
        organizationId,
      )
    ) {
      setError(
        "The organization ID is invalid.",
      );

      return;
    }

    /*
     * IMPORTANT:
     *
     * A selected File is only a browser-local
     * preview until a backend upload endpoint
     * returns a permanent URL.
     *
     * We do not put a blob URL into bannerUrl.
     */
    if (
      coverPhotoFile &&
      !profile.bannerUrl
    ) {
      setError(
        "The cover photo is selected and previewed, but it still needs to be uploaded to the server before it can be saved permanently. You can use the image URL field for now.",
      );

      return;
    }

    const cleanedBranches =
      branches
        .map((branch) => ({
          ...branch,

          name:
            branch.name?.trim() ?? "",

          address: {
            line1:
              branch.address?.line1?.trim() ??
              "",

            city:
              branch.address?.city?.trim() ??
              "",

            country:
              branch.address?.country?.trim() ??
              "",
          },
        }))
        .filter(
          (branch) =>
            branch.name ||
            branch.address.line1 ||
            branch.address.city ||
            branch.address.country,
        );

    if (
      cleanedBranches.length > 0
    ) {
      const mainIndex =
        cleanedBranches.findIndex(
          (branch) =>
            branch.isMainLocation,
        );

      if (mainIndex === -1) {
        cleanedBranches[0] = {
          ...cleanedBranches[0],
          isMainLocation: true,
        };
      } else {
        cleanedBranches.forEach(
          (branch, index) => {
            branch.isMainLocation =
              index === mainIndex;
          },
        );
      }
    }

    setIsSaving(true);

    try {
      const payload:
        CreateOrganizationInput & {
          bannerUrl?: string;
          domain: string;
        } = {
        ...profile,

        name,

        organizationType:
          profile.organizationType,

        /*
         * The backend receives the complete Fockis domain.
         *
         * Example:
         *
         *   springfieldchurch.fockis.com
         */
        domain:
          organizationDomain,

        description:
          profile.description?.trim() ||
          undefined,

        website:
          profile.website?.trim() ||
          undefined,

        logoUrl:
          profile.logoUrl?.trim() ||
          undefined,

        bannerUrl:
          profile.bannerUrl?.trim() ||
          undefined,

        contact: {
          email:
            profile.contact?.email?.trim() ??
            "",

          phone:
            profile.contact?.phone?.trim() ??
            "",
        },

        branches:
          cleanedBranches,
      };

      /* ====================================================================
         CREATE
         ================================================================== */

      if (isCreateMode) {
        const created =
          await createOrganization(
            payload,
          );

        const createdId =
          getOrganizationIdFromResponse(
            created,
          );

        if (
          !isValidOrganizationId(
            createdId,
          )
        ) {
          throw new Error(
            "The organization was created, but the server did not return a valid organization ID.",
          );
        }

        setSuccessMessage(
          `Organization created successfully with the Fockis domain ${organizationDomain}.`,
        );

        window.setTimeout(() => {
          navigate(
            `/church/organizations/${encodeURIComponent(
              createdId,
            )}/admin`,
            {
              replace: true,
            },
          );
        }, 700);

        return;
      }

      /* ====================================================================
         EDIT
         ================================================================== */

      if (isEditMode) {
        /*
         * Domain is included for API compatibility but the backend should
         * reject any attempt to change it. The value is the existing
         * organization's canonical namespace.
         */
        await updateOrganization(
          organizationId,
          payload,
        );

        setSuccessMessage(
          "Organization profile saved.",
        );

        return;
      }

      throw new Error(
        "Unable to determine whether this organization should be created or updated.",
      );
    } catch (err) {
      setError(
        getErrorMessage(err),
      );
    } finally {
      setIsSaving(false);
    }
  };

  /* ==========================================================================
     LOADING
     ======================================================================== */

  if (isLoading) {
    return (
      <div className="church-admin-page">
        <div className="church-admin-container">
          <div className="church-admin-empty">
            Loading organization…
          </div>
        </div>
      </div>
    );
  }

  const currentCategory =
    ORGANIZATION_CATEGORIES.find(
      (category) =>
        category.id ===
        organizationCategory,
    );

  /* ==========================================================================
     RENDER
     ======================================================================== */

  return (
    <div className="church-admin-page">
      <div className="church-admin-container">

        {/* ==================================================================
            HEADER
        ================================================================== */}

        <header className="church-admin-header">
          <div>
            <span className="church-admin-eyebrow">
              Fockis Organizations
            </span>

            <h1>
              {isCreateMode
                ? "Create an organization"
                : "Organization profile"}
            </h1>

            <p>
              Create a professional space for
              your church, school, nonprofit,
              business, community, group,
              ministry, association, sports,
              arts, health, technology or other
              organization.
            </p>
          </div>

          <button
            type="button"
            className="church-admin-btn church-admin-btn--ghost"
            onClick={() =>
              navigate(
                "/church/organizations",
              )
            }
            disabled={isSaving}
          >
            Cancel
          </button>
        </header>

        {/* ==================================================================
            ERROR
        ================================================================== */}

        {error && (
          <div
            className="church-admin-alert church-admin-alert--error"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* ==================================================================
            SUCCESS
        ================================================================== */}

        {successMessage && (
          <div
            className="church-admin-alert church-admin-alert--success"
            role="status"
          >
            {successMessage}
          </div>
        )}

        {/* ==================================================================
            FORM
        ================================================================== */}

        <form
          className="church-admin-form"
          style={styleFormRoot}
          onSubmit={handleSubmit}
        >

          {/* ================================================================
              ORGANIZATION PROFILE
          ================================================================ */}

          <section
            className="church-admin-panel"
            style={stylePanel}
          >

            <h2>
              Organization profile
            </h2>

            <p className="church-admin-hint">
              Build the public identity of your
              organization on Fockis.
            </p>

            {/* ============================================================
                NAME
            ============================================================ */}

            <label
              className="church-admin-field"
              style={styleFieldFirst}
            >
              <span>
                Organization name *
              </span>

              <input
                className="church-admin-input"
                type="text"
                value={profile.name}
                onChange={(event) =>
                  setProfile(
                    (current) => ({
                      ...current,
                      name:
                        event.target.value,
                    }),
                  )
                }
                placeholder="Example: New Life Community"
                required
                disabled={isSaving}
              />
            </label>

            {/* ============================================================
                CATEGORY
            ============================================================ */}

            <div
              className="church-admin-field"
              style={styleField}
            >
              <span>
                Organization category *
              </span>

              <select
                className="church-admin-select"
                value={
                  organizationCategory
                }
                onChange={(event) =>
                  selectOrganizationCategory(
                    event.target
                      .value as OrganizationCategory,
                  )
                }
                disabled={isSaving}
              >
                {ORGANIZATION_CATEGORIES.map(
                  (category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.label}
                    </option>
                  ),
                )}
              </select>

              <small>
                {currentCategory?.description ??
                  "Select a category."}
              </small>
            </div>

            {/* ============================================================
                TYPE SEARCH
            ============================================================ */}

            {organizationCategory !==
              "all" && (
              <label
                className="church-admin-field"
                style={styleField}
              >
                <span>
                  Search organization types
                </span>

                <input
                  className="church-admin-input"
                  type="search"
                  value={
                    organizationTypeSearch
                  }
                  onChange={(event) =>
                    setOrganizationTypeSearch(
                      event.target.value,
                    )
                  }
                  placeholder={`Search ${currentCategory?.label ?? "organization"} types...`}
                  disabled={isSaving}
                />
              </label>
            )}

            {/* ============================================================
                TYPE
            ============================================================ */}

            <div
              className="church-admin-field"
              style={styleField}
            >
              <span>
                Organization type *
              </span>

              {organizationCategory ===
              "all" ? (
                <div
                  style={
                    styleSelectCategoryFirstBox
                  }
                >
                  <strong>
                    Select a category first
                  </strong>

                  <p
                    style={{
                      margin:
                        "6px 0 0",
                    }}
                  >
                    Choose a category above to
                    see the organization types
                    available for that category.
                  </p>
                </div>
              ) : (
                <>
                  <div
                    style={styleTypeGrid}
                  >
                    {filteredOrganizationTypes.map(
                      (type) => {
                        const label =
                          String(
                            ORGANIZATION_TYPE_LABELS[
                              type
                            ] ?? type,
                          );

                        const selected =
                          profile.organizationType ===
                          type;

                        return (
                          <button
                            key={String(
                              type,
                            )}
                            type="button"
                            disabled={
                              isSaving
                            }
                            onClick={() =>
                              selectOrganizationType(
                                type,
                              )
                            }
                            aria-pressed={
                              selected
                            }
                            style={{
                              textAlign:
                                "left",

                              padding:
                                "13px 14px",

                              borderRadius:
                                "10px",

                              border:
                                selected
                                  ? "2px solid #005a8d"
                                  : "1px solid rgba(0,0,0,.12)",

                              background:
                                selected
                                  ? "rgba(0,90,141,.08)"
                                  : "#fff",

                              cursor:
                                isSaving
                                  ? "not-allowed"
                                  : "pointer",

                              transition:
                                "all .18s ease",

                              width: "100%",

                              boxSizing:
                                "border-box",
                            }}
                          >
                            <strong
                              style={{
                                display:
                                  "block",

                                fontSize:
                                  "14px",

                                whiteSpace:
                                  "normal",

                                wordBreak:
                                  "normal",

                                overflowWrap:
                                  "break-word",
                              }}
                            >
                              {label}
                            </strong>
                          </button>
                        );
                      },
                    )}
                  </div>

                  {filteredOrganizationTypes.length ===
                    0 && (
                    <div
                      className="church-admin-empty"
                      style={{
                        marginTop:
                          "12px",
                      }}
                    >
                      No organization types are
                      available for this category
                      or search.
                    </div>
                  )}

                  {!profile.organizationType && (
                    <small
                      style={{
                        display:
                          "block",
                        marginTop:
                          "10px",
                      }}
                    >
                      Select one organization
                      type above.
                    </small>
                  )}

                  {profile.organizationType && (
                    <small
                      style={{
                        display:
                          "block",
                        marginTop:
                          "10px",
                      }}
                    >
                      Selected type:{" "}
                      <strong>
                        {String(
                          ORGANIZATION_TYPE_LABELS[
                            profile
                              .organizationType
                          ] ??
                            profile.organizationType,
                        )}
                      </strong>
                    </small>
                  )}
                </>
              )}
            </div>

            {/* ============================================================
                FOCKIS DOMAIN
            ============================================================ */}

            <div
              style={{
                ...styleInfoBox,
                marginTop: "24px",
              }}
            >
              {isCreateMode ? (
                <>
                  <strong>
                    Create your Fockis domain *
                  </strong>

                  <p
                    style={{
                      margin:
                        "6px 0 0",
                    }}
                  >
                    Your organization needs a
                    permanent Fockis domain. This
                    domain becomes the namespace
                    used for organization members
                    and accounts.
                  </p>

                  <div
                    style={{
                      display:
                        "flex",
                      flexDirection:
                        "row",
                      flexWrap:
                        "wrap",
                      gap:
                        "10px",
                      alignItems:
                        "flex-end",
                      marginTop:
                        "16px",
                    }}
                  >
                    <label
                      style={{
                        display:
                          "flex",
                        flexDirection:
                          "column",
                        gap:
                          "7px",
                        flex:
                          "1 1 240px",
                        minWidth:
                          "0",
                      }}
                    >
                      <span
                        style={{
                          fontSize:
                            "13px",
                          fontWeight:
                            700,
                          color:
                            "#172b4d",
                        }}
                      >
                        Organization prefix
                      </span>

                      <input
                        className="church-admin-input"
                        type="text"
                        value={
                          domainPrefix
                        }
                        onChange={(
                          event,
                        ) =>
                          handleDomainPrefixChange(
                            event
                              .target
                              .value,
                          )
                        }
                        placeholder="springfieldchurch"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={
                          false
                        }
                        disabled={
                          isSaving
                        }
                      />
                    </label>

                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        padding:
                          "0 2px 11px",
                        fontWeight:
                          700,
                        color:
                          "#53677a",
                      }}
                    >
                      .
                    </div>

                    <label
                      style={{
                        display:
                          "flex",
                        flexDirection:
                          "column",
                        gap:
                          "7px",
                        flex:
                          "0 1 190px",
                        minWidth:
                          "170px",
                      }}
                    >
                      <span
                        style={{
                          fontSize:
                            "13px",
                          fontWeight:
                            700,
                          color:
                            "#172b4d",
                        }}
                      >
                        Fockis domain
                      </span>

                      <select
                        className="church-admin-select"
                        value={
                          domainSuffix
                        }
                        onChange={(
                          event,
                        ) =>
                          handleDomainSuffixChange(
                            event
                              .target
                              .value as FockisDomainSuffix,
                          )
                        }
                        disabled={
                          isSaving
                        }
                      >
                        {FOCKIS_DOMAIN_SUFFIXES.map(
                          (
                            suffix,
                          ) => (
                            <option
                              key={
                                suffix
                              }
                              value={
                                suffix
                              }
                            >
                              {
                                suffix
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    <button
                      type="button"
                      className="church-admin-btn church-admin-btn--secondary"
                      onClick={() =>
                        void checkDomainAvailability()
                      }
                      disabled={
                        isSaving ||
                        !domainPrefix.trim() ||
                        domainAvailability ===
                          "checking"
                      }
                    >
                      {domainAvailability ===
                      "checking"
                        ? "Checking…"
                        : "Check domain"}
                    </button>
                  </div>

                  <div
                    style={{
                      marginTop:
                        "14px",
                      padding:
                        "14px 16px",
                      borderRadius:
                        "10px",
                      background:
                        "#fff",
                      border:
                        "1px solid #dce4ea",
                    }}
                  >
                    <small
                      style={{
                        display:
                          "block",
                        color:
                          "#66788a",
                        marginBottom:
                          "5px",
                        fontWeight:
                          600,
                      }}
                    >
                      Your organization domain
                    </small>

                    <strong
                      style={{
                        display:
                          "block",
                        fontSize:
                          "20px",
                        lineHeight:
                          1.3,
                        color:
                          "#005a8d",
                        wordBreak:
                          "break-word",
                      }}
                    >
                      {fullFockisDomain}
                    </strong>
                  </div>

                  {domainAvailabilityMessage && (
                    <small
                      style={{
                        display:
                          "block",
                        marginTop:
                          "10px",
                        color:
                          domainAvailability ===
                          "unavailable"
                            ? "#b42318"
                            : "#53677a",
                        fontWeight:
                          domainAvailability ===
                          "unavailable"
                            ? 700
                            : 500,
                      }}
                    >
                      {domainAvailabilityMessage}
                    </small>
                  )}

                  <small
                    style={{
                      display:
                        "block",
                      marginTop:
                        "10px",
                    }}
                  >
                    Allowed Fockis namespaces:
                    {" "}
                    {FOCKIS_DOMAIN_SUFFIXES.join(
                      ", ",
                    )}
                  </small>

                  <small
                    style={{
                      display:
                        "block",
                      marginTop:
                        "5px",
                    }}
                  >
                    Example:
                    {" "}
                    <strong>
                      springfieldchurch.fockis.com
                    </strong>
                  </small>

                  <small
                    style={{
                      display:
                        "block",
                      marginTop:
                        "5px",
                    }}
                  >
                    The server performs the final
                    uniqueness check when the
                    organization is created.
                  </small>
                </>
              ) : (
                <>
                  <strong>
                    Fockis organization domain
                  </strong>

                  <p
                    style={{
                      margin:
                        "6px 0 0",
                    }}
                  >
                    This is the permanent Fockis
                    namespace for this organization.
                    It is used as the base for member
                    domains.
                  </p>

                  <div
                    style={{
                      marginTop:
                        "14px",
                      padding:
                        "14px 16px",
                      borderRadius:
                        "10px",
                      background:
                        "#fff",
                      border:
                        "1px solid #dce4ea",
                    }}
                  >
                    <strong
                      style={{
                        fontSize:
                          "20px",
                        color:
                          "#005a8d",
                        wordBreak:
                          "break-word",
                      }}
                    >
                      {profile.domain ||
                        "No Fockis domain assigned"}
                    </strong>
                  </div>

                  <small
                    style={{
                      display:
                        "block",
                      marginTop:
                        "10px",
                    }}
                  >
                    Organization domains cannot be
                    changed from the profile editor.
                  </small>
                </>
              )}
            </div>

            {/* ============================================================
                BRANDING
            ============================================================ */}

            <div
              className="church-admin-branding-section"
              style={{
                marginTop: "28px",
                paddingTop: "24px",
                borderTop:
                  "1px solid var(--admin-border, #dce4ea)",
              }}
            >

              <div>
                <h3
                  style={{
                    margin:
                      "0 0 6px",
                    color:
                      "#172b4d",
                    fontSize:
                      "18px",
                    fontWeight:
                      750,
                  }}
                >
                  Organization branding
                </h3>

                <p className="church-admin-hint">
                  Add a logo and a wide cover photo
                  to make your organization page
                  recognizable.
                </p>
              </div>

              {/* ==========================================================
                  LOGO
              ========================================================== */}

              <label
                className="church-admin-field"
                style={styleFieldFirst}
              >
                <span>
                  Logo URL
                </span>

                <input
                  className="church-admin-input"
                  type="url"
                  value={
                    profile.logoUrl ?? ""
                  }
                  onChange={(event) =>
                    setProfile(
                      (current) => ({
                        ...current,
                        logoUrl:
                          event.target.value,
                      }),
                    )
                  }
                  placeholder="https://example.com/logo.png"
                  disabled={isSaving}
                />

                <small>
                  Recommended: square JPG, PNG,
                  or WebP image.
                </small>
              </label>

              {/* ==========================================================
                  COVER PHOTO
              ========================================================== */}

              <div
                className="church-admin-field"
                style={{
                  ...styleField,
                  marginTop: "24px",
                }}
              >

                <span>
                  Cover photo
                </span>

                <div
                  style={{
                    display:
                      "flex",
                    gap:
                      "8px",
                    flexWrap:
                      "wrap",
                    marginBottom:
                      "8px",
                  }}
                >

                  <button
                    type="button"
                    className={`church-admin-btn ${
                      !coverPhotoUrlMode
                        ? "church-admin-btn--primary"
                        : "church-admin-btn--secondary"
                    }`}
                    onClick={() =>
                      setCoverPhotoUrlMode(
                        false,
                      )
                    }
                    disabled={isSaving}
                  >
                    Upload from device
                  </button>

                  <button
                    type="button"
                    className={`church-admin-btn ${
                      coverPhotoUrlMode
                        ? "church-admin-btn--primary"
                        : "church-admin-btn--secondary"
                    }`}
                    onClick={() => {
                      setCoverPhotoFile(
                        null,
                      );

                      if (
                        coverPhotoPreview.startsWith(
                          "blob:",
                        )
                      ) {
                        URL.revokeObjectURL(
                          coverPhotoPreview,
                        );
                      }

                      setCoverPhotoPreview(
                        "",
                      );

                      setCoverPhotoUrlMode(
                        true,
                      );
                    }}
                    disabled={isSaving}
                  >
                    Use image URL
                  </button>

                </div>

                {/* ========================================================
                    DEVICE UPLOAD
                ======================================================== */}

                {!coverPhotoUrlMode && (
                  <div
                    style={{
                      border:
                        "1px dashed rgba(0,90,141,.35)",
                      borderRadius:
                        "12px",
                      padding:
                        "18px",
                      background:
                        "rgba(0,90,141,.035)",
                    }}
                  >

                    <label
                      htmlFor="organization-cover-photo"
                      style={{
                        display:
                          "flex",
                        flexDirection:
                          "column",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        minHeight:
                          "145px",
                        padding:
                          "20px",
                        borderRadius:
                          "10px",
                        background:
                          "#fff",
                        cursor:
                          isSaving
                            ? "not-allowed"
                            : "pointer",
                        textAlign:
                          "center",
                      }}
                    >

                      <span
                        style={{
                          fontSize:
                            "34px",
                          marginBottom:
                            "8px",
                        }}
                      >
                        🖼️
                      </span>

                      <strong>
                        Choose a cover photo
                      </strong>

                      <small
                        style={{
                          marginTop:
                            "5px",
                        }}
                      >
                        JPG, PNG or WebP ·
                        maximum 10 MB
                      </small>

                    </label>

                    <input
                      id="organization-cover-photo"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={
                        handleCoverPhotoFile
                      }
                      disabled={isSaving}
                      style={{
                        display:
                          "none",
                      }}
                    />

                    {coverPhotoFile && (
                      <div
                        style={{
                          marginTop:
                            "10px",
                          fontSize:
                            "13px",
                          color:
                            "#53677a",
                        }}
                      >
                        Selected:{" "}
                        <strong>
                          {
                            coverPhotoFile.name
                          }
                        </strong>
                      </div>
                    )}

                  </div>
                )}

                {/* ========================================================
                    URL
                ======================================================== */}

                {coverPhotoUrlMode && (
                  <>
                    <input
                      className="church-admin-input"
                      type="url"
                      value={
                        profile.bannerUrl ??
                        ""
                      }
                      onChange={(event) =>
                        handleCoverPhotoUrlChange(
                          event.target
                            .value,
                        )
                      }
                      placeholder="https://example.com/cover-photo.jpg"
                      disabled={isSaving}
                    />

                    <small>
                      Paste a public image URL.
                      The image must be accessible
                      without logging into another
                      website.
                    </small>
                  </>
                )}

                {/* ========================================================
                    PREVIEW
                ======================================================== */}

                {activeCoverPreview && (
                  <div
                    style={{
                      marginTop:
                        "14px",
                      borderRadius:
                        "14px",
                      overflow:
                        "hidden",
                      border:
                        "1px solid #dce4ea",
                      background:
                        "#f3f6f9",
                    }}
                  >

                    <div
                      style={{
                        position:
                          "relative",
                        width:
                          "100%",
                        aspectRatio:
                          "3 / 1",
                        minHeight:
                          "150px",
                        maxHeight:
                          "310px",
                        background:
                          "linear-gradient(135deg, #003f63, #005a8d)",
                      }}
                    >

                      <img
                        src={
                          activeCoverPreview
                        }
                        alt="Organization cover preview"
                        style={{
                          position:
                            "absolute",
                          inset:
                            0,
                          width:
                            "100%",
                          height:
                            "100%",
                          objectFit:
                            "cover",
                          display:
                            "block",
                        }}
                        onError={(
                          event,
                        ) => {
                          event.currentTarget.style.display =
                            "none";
                        }}
                      />

                      <div
                        style={{
                          position:
                            "absolute",
                          inset:
                            0,
                          display:
                            "flex",
                          alignItems:
                            "flex-end",
                          padding:
                            "18px",
                          background:
                            "linear-gradient(to top, rgba(0,0,0,.48), transparent 55%)",
                          pointerEvents:
                            "none",
                        }}
                      >

                        <span
                          style={{
                            color:
                              "#fff",
                            fontSize:
                              "13px",
                            fontWeight:
                              700,
                            textShadow:
                              "0 1px 4px rgba(0,0,0,.4)",
                          }}
                        >
                          Cover photo preview
                        </span>

                      </div>

                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "center",
                        gap:
                          "10px",
                        padding:
                          "10px 12px",
                        flexWrap:
                          "wrap",
                      }}
                    >

                      <small
                        style={{
                          color:
                            "#66788a",
                        }}
                      >
                        Recommended ratio:
                        3:1 or wider
                      </small>

                      <button
                        type="button"
                        className="church-admin-btn church-admin-btn--ghost church-admin-btn--sm"
                        onClick={
                          clearCoverPhoto
                        }
                        disabled={
                          isSaving
                        }
                      >
                        Remove cover
                      </button>

                    </div>

                  </div>
                )}

              </div>

            </div>

            {/* ============================================================
                DESCRIPTION
            ============================================================ */}

            <label
              className="church-admin-field"
              style={styleField}
            >
              <span>
                Description
              </span>

              <textarea
                className="church-admin-textarea"
                rows={5}
                value={
                  profile.description ?? ""
                }
                onChange={(event) =>
                  setProfile(
                    (current) => ({
                      ...current,
                      description:
                        event.target.value,
                    }),
                  )
                }
                placeholder="Tell people about your organization..."
                disabled={isSaving}
              />
            </label>

            {/* ============================================================
                WEBSITE
            ============================================================ */}

            <label
              className="church-admin-field"
              style={styleField}
            >
              <span>
                Website
              </span>

              <input
                className="church-admin-input"
                type="url"
                value={
                  profile.website ?? ""
                }
                onChange={(event) =>
                  setProfile(
                    (current) => ({
                      ...current,
                      website:
                        event.target.value,
                    }),
                  )
                }
                placeholder="https://example.org"
                disabled={isSaving}
              />
            </label>

            {/* ============================================================
                CONTACT
            ============================================================ */}

            <div
              className="church-admin-field-row"
              style={styleFieldRow}
            >

              <label
                className="church-admin-field"
                style={styleFieldInRow}
              >
                <span>
                  Contact email
                </span>

                <input
                  type="email"
                  className="church-admin-input"
                  value={
                    profile.contact
                      ?.email ?? ""
                  }
                  onChange={(event) =>
                    setProfile(
                      (current) => ({
                        ...current,

                        contact: {
                          ...(current.contact ??
                            {
                              email: "",
                              phone: "",
                            }),

                          email:
                            event.target
                              .value,
                        },
                      }),
                    )
                  }
                  disabled={isSaving}
                />
              </label>

              <label
                className="church-admin-field"
                style={styleFieldInRow}
              >
                <span>
                  Contact phone
                </span>

                <input
                  type="tel"
                  className="church-admin-input"
                  value={
                    profile.contact
                      ?.phone ?? ""
                  }
                  onChange={(event) =>
                    setProfile(
                      (current) => ({
                        ...current,

                        contact: {
                          ...(current.contact ??
                            {
                              email: "",
                              phone: "",
                            }),

                          phone:
                            event.target
                              .value,
                        },
                      }),
                    )
                  }
                  disabled={isSaving}
                />
              </label>

            </div>

          </section>

          {/* ================================================================
              LEADERSHIP
          ================================================================ */}

          {isEditMode && (
            <section
              className="church-admin-panel"
              style={stylePanel}
            >

              <h2>
                Leadership
              </h2>

              <p className="church-admin-hint">
                Leadership roles are assigned
                from the Members screen so that
                roles remain connected to actual
                organization memberships.
              </p>

              {leadership.length === 0 ? (
                <p className="church-admin-empty">
                  No leadership assigned yet.
                </p>
              ) : (
                <ul className="church-admin-leadership-list">
                  {leadership.map(
                    (leader) => (
                      <li
                        key={
                          leader.id
                        }
                      >

                        <span>
                          {
                            leader.user
                              .displayName
                          }
                        </span>

                        <span className="church-admin-chip">
                          {
                            LEADERSHIP_ROLE_LABELS[
                              leader.role
                            ] ??
                              String(
                                leader.role,
                              )
                          }
                        </span>

                      </li>
                    ),
                  )}
                </ul>
              )}

            </section>
          )}

          {/* ================================================================
              BRANCHES
          ================================================================ */}

          <section
            className="church-admin-panel"
            style={stylePanel}
          >

            <div
              className="church-admin-panel__heading"
              style={stylePanelHeading}
            >

              <div>
                <h2>
                  Branches &amp; Locations
                </h2>

                <p className="church-admin-hint">
                  Add the main location and any
                  additional branches.
                </p>
              </div>

              <button
                type="button"
                className="church-admin-btn church-admin-btn--secondary"
                onClick={
                  addBranch
                }
                disabled={
                  isSaving
                }
              >
                Add branch
              </button>

            </div>

            {branches.map(
              (
                branch,
                index,
              ) => (
                <div
                  className="church-admin-branch-editor"
                  style={
                    styleBranchEditor
                  }
                  key={index}
                >

                  <div
                    className="church-admin-field-row"
                    style={styleFieldRow}
                  >

                    <label
                      className="church-admin-field"
                      style={styleFieldInRow}
                    >
                      <span>
                        Branch name
                      </span>

                      <input
                        className="church-admin-input"
                        value={
                          branch.name
                        }
                        onChange={(
                          event,
                        ) =>
                          updateBranch(
                            index,
                            {
                              name:
                                event.target
                                  .value,
                            },
                          )
                        }
                        placeholder="Main location"
                        required
                        disabled={
                          isSaving
                        }
                      />
                    </label>

                    <label
                      className="church-admin-field church-admin-field--checkbox"
                      style={
                        styleCheckboxField
                      }
                    >

                      <input
                        type="checkbox"
                        checked={Boolean(
                          branch.isMainLocation,
                        )}
                        onChange={(
                          event,
                        ) =>
                          setMainBranch(
                            index,
                            event.target
                              .checked,
                          )
                        }
                        disabled={
                          isSaving
                        }
                      />

                      <span>
                        Main location
                      </span>

                    </label>

                  </div>

                  <div
                    className="church-admin-field-row"
                    style={styleFieldRow}
                  >

                    <label
                      className="church-admin-field"
                      style={styleFieldInRow}
                    >
                      <span>
                        Address line 1
                      </span>

                      <input
                        className="church-admin-input"
                        value={
                          branch
                            .address
                            ?.line1 ?? ""
                        }
                        onChange={(
                          event,
                        ) =>
                          updateBranchAddress(
                            index,
                            {
                              line1:
                                event.target
                                  .value,
                            },
                          )
                        }
                        disabled={
                          isSaving
                        }
                      />
                    </label>

                    <label
                      className="church-admin-field"
                      style={styleFieldInRow}
                    >
                      <span>
                        City
                      </span>

                      <input
                        className="church-admin-input"
                        value={
                          branch
                            .address
                            ?.city ?? ""
                        }
                        onChange={(
                          event,
                        ) =>
                          updateBranchAddress(
                            index,
                            {
                              city:
                                event.target
                                  .value,
                            },
                          )
                        }
                        disabled={
                          isSaving
                        }
                      />
                    </label>

                    <label
                      className="church-admin-field"
                      style={styleFieldInRow}
                    >
                      <span>
                        Country
                      </span>

                      <input
                        className="church-admin-input"
                        value={
                          branch
                            .address
                            ?.country ?? ""
                        }
                        onChange={(
                          event,
                        ) =>
                          updateBranchAddress(
                            index,
                            {
                              country:
                                event.target
                                  .value,
                            },
                          )
                        }
                        disabled={
                          isSaving
                        }
                      />
                    </label>

                  </div>

                  {branches.length >
                    1 && (
                    <button
                      type="button"
                      className="church-admin-btn church-admin-btn--ghost church-admin-btn--sm"
                      onClick={() =>
                        removeBranch(
                          index,
                        )
                      }
                      disabled={
                        isSaving
                      }
                    >
                      Remove branch
                    </button>
                  )}

                </div>
              ),
            )}

          </section>

          {/* ================================================================
              ACTIONS
          ================================================================ */}

          <div
            className="church-admin-form-actions"
            style={
              styleFormActions
            }
          >

            <button
              type="button"
              className="church-admin-btn church-admin-btn--ghost"
              onClick={() =>
                navigate(
                  "/church/organizations",
                )
              }
              disabled={
                isSaving
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              className="church-admin-btn church-admin-btn--primary"
              disabled={
                isSaving ||
                organizationCategory ===
                  "all" ||
                !profile.organizationType ||
                (isCreateMode &&
                  !domainPrefix.trim())
              }
            >
              {isSaving
                ? isCreateMode
                  ? "Creating organization…"
                  : "Saving changes…"
                : isCreateMode
                  ? "Create organization"
                  : "Save changes"}
            </button>

          </div>

        </form>
      </div>
    </div>
  );
}