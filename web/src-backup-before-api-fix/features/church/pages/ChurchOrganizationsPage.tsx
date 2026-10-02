import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import ChurchHeader from "../components/ChurchHeader";
import OrganizationCard from "../components/OrganizationCard";

import {
  listOrganizations,
  joinOrganization,
} from "../api/organizationsApi";

import {
  OrganizationType,
  ORGANIZATION_TYPE_LABELS,
  MembershipStatus,
  type OrganizationSummary,
} from "../types/church.types";

import { useFockisTranslation } from "../../../i18n/useFockisTranslation";

import "../styles/ChurchHomePage.scss";

/* ============================================================================
 * CONSTANTS
 * ========================================================================== */

const PAGE_SIZE = 12;

const ALL_TYPES: OrganizationType[] = Object.values(OrganizationType);

/* ============================================================================
 * TRANSLATION HELPER
 * ========================================================================== */

/**
 * Safely translates a key.
 *
 * If the translation system returns the key itself (e.g.
 * "church.organizations.members"), the supplied English fallback is
 * returned instead. This prevents missing translation keys from
 * appearing in the UI.
 */
function createSafeTranslator(t: any) {
  return (
    key: string,
    fallback: string,
    options?: Record<string, unknown>,
  ): string => {
    try {
      const translated = t(key, options);

      if (typeof translated !== "string") {
        return fallback;
      }

      const value = translated.trim();

      if (!value || value === key) {
        return fallback;
      }

      return translated;
    } catch {
      return fallback;
    }
  };
}

/* ============================================================================
 * ORGANIZATION CATEGORIES
 * ========================================================================== */

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

const ORGANIZATION_CATEGORIES: OrganizationCategory[] = [
  "all",
  "faith",
  "education",
  "civic",
  "social",
  "nonprofit",
  "business",
  "sports",
  "arts",
  "health",
  "youth",
  "clubs",
  "technology",
  "environment",
  "other",
];

const ORGANIZATION_CATEGORY_TRANSLATION_KEYS: Record<
  OrganizationCategory,
  { key: string; fallback: string }
> = {
  all: {
    key: "church.organizations.allCategories",
    fallback: "All categories",
  },
  faith: {
    key: "church.organizations.categories.faith",
    fallback: "Faith & Religion",
  },
  education: {
    key: "church.organizations.categories.education",
    fallback: "Education",
  },
  civic: {
    key: "church.organizations.categories.civic",
    fallback: "Civic & Political",
  },
  social: {
    key: "church.organizations.categories.social",
    fallback: "Community & Social",
  },
  nonprofit: {
    key: "church.organizations.categories.nonprofit",
    fallback: "Nonprofit & Charity",
  },
  business: {
    key: "church.organizations.categories.business",
    fallback: "Business & Professional",
  },
  sports: {
    key: "church.organizations.categories.sports",
    fallback: "Sports & Recreation",
  },
  arts: {
    key: "church.organizations.categories.arts",
    fallback: "Arts & Culture",
  },
  health: {
    key: "church.organizations.categories.health",
    fallback: "Health & Wellness",
  },
  youth: {
    key: "church.organizations.categories.youth",
    fallback: "Youth & Family",
  },
  clubs: {
    key: "church.organizations.categories.clubs",
    fallback: "Clubs & Associations",
  },
  technology: {
    key: "church.organizations.categories.technology",
    fallback: "Technology",
  },
  environment: {
    key: "church.organizations.categories.environment",
    fallback: "Environment",
  },
  other: {
    key: "church.organizations.categories.other",
    fallback: "Other",
  },
};

/* ============================================================================
 * ORGANIZATION TYPE -> CATEGORY
 * ========================================================================== */

const ORGANIZATION_TYPE_CATEGORY_NAMES: Partial<
  Record<string, OrganizationCategory>
> = {
  /* Faith */
  church: "faith",
  christian_church: "faith",
  christian_ministry: "faith",
  christian_fellowship: "faith",
  mission: "faith",
  prayer_organization: "faith",
  christian_network: "faith",
  christian_nonprofit: "faith",
  bible_study_organization: "faith",
  mosque: "faith",
  islamic_organization: "faith",
  synagogue: "faith",
  jewish_organization: "faith",
  temple: "faith",
  religious_organization: "faith",
  religious_institution: "faith",
  faith_organization: "faith",

  /* Education */
  school: "education",
  elementary_school: "education",
  middle_school: "education",
  high_school: "education",
  private_school: "education",
  public_school: "education",
  charter_school: "education",
  college: "education",
  university: "education",
  community_college: "education",
  vocational_school: "education",
  technical_school: "education",
  trade_school: "education",
  academy: "education",
  training_institute: "education",
  training_organization: "education",
  educational_organization: "education",
  educational_institution: "education",
  student_organization: "education",
  education_organization: "education",
  institute: "education",

  /* Civic */
  government: "civic",
  government_organization: "civic",
  civic_organization: "civic",
  civic_group: "civic",
  political_organization: "civic",
  political_party: "civic",
  advocacy_organization: "civic",
  public_service: "civic",
  public_affairs_organization: "civic",
  public_affairs: "civic",
  community_action_organization: "civic",

  /* Community */
  community: "social",
  community_organization: "social",
  social_organization: "social",
  neighborhood: "social",
  community_group: "social",
  support_group: "social",

  /* Nonprofit */
  nonprofit: "nonprofit",
  non_profit: "nonprofit",
  nonprofit_organization: "nonprofit",
  charity: "nonprofit",
  foundation: "nonprofit",
  humanitarian: "nonprofit",
  humanitarian_organization: "nonprofit",
  relief_organization: "nonprofit",
  volunteer_organization: "nonprofit",

  /* Business */
  business: "business",
  company: "business",
  corporation: "business",
  startup: "business",
  startup_organization: "business",
  professional_organization: "business",
  professional_association: "business",
  trade_association: "business",
  industry_association: "business",
  business_association: "business",
  commerce: "business",
  cooperative: "business",

  /* Sports */
  sports: "sports",
  sport: "sports",
  athletic: "sports",
  athletics: "sports",
  recreation: "sports",
  sports_club: "sports",
  sports_organization: "sports",
  sports_team: "sports",
  sports_league: "sports",
  athletic_team: "sports",
  athletic_organization: "sports",
  recreation_organization: "sports",
  fitness_organization: "sports",

  /* Arts */
  arts: "arts",
  art: "arts",
  culture: "arts",
  cultural_organization: "arts",
  museum: "arts",
  gallery: "arts",
  theater: "arts",
  theatre: "arts",
  dance: "arts",
  music: "arts",
  music_organization: "arts",
  creative_organization: "arts",
  arts_organization: "arts",
  theater_organization: "arts",
  performing_arts_organization: "arts",

  /* Health */
  health: "health",
  healthcare: "health",
  medical: "health",
  wellness: "health",
  clinic: "health",
  health_organization: "health",
  healthcare_organization: "health",
  medical_organization: "health",
  wellness_organization: "health",
  mental_health_organization: "health",

  /* Youth */
  youth: "youth",
  youth_organization: "youth",
  family: "youth",
  family_organization: "youth",
  parent_organization: "youth",
  children_organization: "youth",
  childrens_organization: "youth",

  /* Clubs */
  club: "clubs",
  association: "clubs",
  society: "clubs",
  alumni: "clubs",
  alumni_organization: "clubs",
  alumni_association: "clubs",
  hobby: "clubs",
  interest_group: "clubs",

  /* Technology */
  technology: "technology",
  tech: "technology",
  developer: "technology",
  developer_organization: "technology",
  innovation: "technology",
  innovation_organization: "technology",
  software: "technology",
  software_organization: "technology",
  technology_organization: "technology",
  technology_group: "technology",

  /* Environment */
  environment: "environment",
  environmental: "environment",
  environmental_organization: "environment",
  conservation: "environment",
  conservation_organization: "environment",
  sustainability: "environment",
  climate: "environment",
  climate_organization: "environment",

  /* Other */
  other: "other",
};

/* ============================================================================
 * CATEGORY HELPER
 * ========================================================================== */

function getCategoryForOrganizationType(
  type: OrganizationType,
): OrganizationCategory {
  const typeName = String(type).trim().toLowerCase();

  const explicitCategory = ORGANIZATION_TYPE_CATEGORY_NAMES[typeName];

  if (explicitCategory) {
    return explicitCategory;
  }

  const label = String(
    ORGANIZATION_TYPE_LABELS[type] ?? typeName,
  ).toLowerCase();

  if (
    /church|christian|ministry|fellowship|mission|prayer|bible|religious|faith|mosque|islamic|synagogue|jewish|temple/.test(
      label,
    )
  ) {
    return "faith";
  }

  if (
    /school|college|university|academy|education|educational|student|training|institute|vocational|technical|trade/.test(
      label,
    )
  ) {
    return "education";
  }

  if (
    /political|politics|civic|government|advocacy|campaign|public service|public-service|public affairs/.test(
      label,
    )
  ) {
    return "civic";
  }

  if (
    /nonprofit|non-profit|charity|foundation|humanitarian|relief|volunteer/.test(
      label,
    )
  ) {
    return "nonprofit";
  }

  if (
    /business|company|corporation|startup|professional|commerce|cooperative|trade association|industry association/.test(
      label,
    )
  ) {
    return "business";
  }

  if (/sport|athletic|recreation|team|league|fitness/.test(label)) {
    return "sports";
  }

  if (
    /art|culture|museum|gallery|theater|theatre|dance|music|creative|performing/.test(
      label,
    )
  ) {
    return "arts";
  }

  if (/health|healthcare|medical|wellness|clinic|mental health/.test(label)) {
    return "health";
  }

  if (/youth|family|parent|children|childrens/.test(label)) {
    return "youth";
  }

  if (/club|association|society|alumni|hobby|interest group/.test(label)) {
    return "clubs";
  }

  if (/technology|tech|developer|innovation|software/.test(label)) {
    return "technology";
  }

  if (
    /environment|environmental|conservation|sustainability|climate/.test(
      label,
    )
  ) {
    return "environment";
  }

  if (/community|social|neighborhood|support/.test(label)) {
    return "social";
  }

  return "other";
}

/* ============================================================================
 * VALIDATION
 * ========================================================================== */

function isValidOrganizationId(
  value: string | undefined | null,
): value is string {
  const id = value?.trim();

  if (!id) {
    return false;
  }

  if (id === "YOUR_ORG_ID" || id === "undefined" || id === "null") {
    return false;
  }

  return /^[a-fA-F0-9]{24}$/.test(id);
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string") {
      return message || fallback;
    }
  }

  return fallback;
}

function isValidCategory(
  value: string | null,
): value is OrganizationCategory {
  return (
    value !== null &&
    ORGANIZATION_CATEGORIES.includes(value as OrganizationCategory)
  );
}

/* ============================================================================
 * PAGE
 * ========================================================================== */

export default function ChurchOrganizationsPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { t } = useFockisTranslation();
  const safeT = useMemo(() => createSafeTranslator(t), [t]);

  const [organizations, setOrganizations] = useState<OrganizationSummary[]>(
    [],
  );
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joiningOrganizationId, setJoiningOrganizationId] = useState<
    string | null
  >(null);

  /* ==========================================================================
   * URL FILTERS
   * ========================================================================== */

  const search = searchParams.get("search") ?? "";

  const rawType = searchParams.get("type");

  const typeFilter = useMemo<OrganizationType | undefined>(() => {
    if (!rawType) {
      return undefined;
    }

    return ALL_TYPES.includes(rawType as OrganizationType)
      ? (rawType as OrganizationType)
      : undefined;
  }, [rawType]);

  const rawCategory = searchParams.get("category");

  const categoryFilter = useMemo<OrganizationCategory>(() => {
    if (!rawCategory) {
      return "all";
    }

    return isValidCategory(rawCategory) ? rawCategory : "all";
  }, [rawCategory]);

  const rawPage = Number(searchParams.get("page") ?? "1");

  const page =
    Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;

  /* ==========================================================================
   * CATEGORY LABEL
   * ========================================================================== */

  const getCategoryLabel = (category: OrganizationCategory): string => {
    const definition = ORGANIZATION_CATEGORY_TRANSLATION_KEYS[category];

    return safeT(definition.key, definition.fallback);
  };

  /* ==========================================================================
   * CATEGORY TYPE OPTIONS
   * ========================================================================== */

  const categoryTypes = useMemo<OrganizationType[]>(() => {
    if (categoryFilter === "all") {
      return ALL_TYPES;
    }

    return ALL_TYPES.filter(
      (type) => getCategoryForOrganizationType(type) === categoryFilter,
    );
  }, [categoryFilter]);

  /* ==========================================================================
   * EFFECTIVE TYPE
   * ========================================================================== */

  const effectiveTypeFilter = useMemo<OrganizationType | undefined>(() => {
    if (!typeFilter) {
      return undefined;
    }

    if (categoryFilter === "all") {
      return typeFilter;
    }

    return getCategoryForOrganizationType(typeFilter) === categoryFilter
      ? typeFilter
      : undefined;
  }, [typeFilter, categoryFilter]);

  /* ==========================================================================
   * LOAD ORGANIZATIONS
   * ========================================================================== */

  useEffect(() => {
    const controller = new AbortController();

    async function loadOrganizations(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const result = await listOrganizations(
          {
            search: search.trim() || undefined,
            organizationType: effectiveTypeFilter,
            page,
            pageSize: PAGE_SIZE,
          },
          controller.signal,
        );

        if (controller.signal.aborted) {
          return;
        }

        const items: OrganizationSummary[] = Array.isArray(result?.items)
          ? result.items
          : [];

        const categoryFilteredItems =
          categoryFilter === "all"
            ? items
            : items.filter(
                (organization) =>
                  getCategoryForOrganizationType(
                    organization.organizationType,
                  ) === categoryFilter,
              );

        setOrganizations(categoryFilteredItems);

        const resultTotal = Number(result?.total);

        if (categoryFilter === "all") {
          setTotal(Number.isFinite(resultTotal) ? resultTotal : 0);
        } else {
          setTotal(categoryFilteredItems.length);
        }
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        setOrganizations([]);
        setTotal(0);

        setError(
          getErrorMessage(
            err,
            safeT(
              "church.organizations.loadError",
              "Unable to load organizations.",
            ),
          ),
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadOrganizations();

    return () => {
      controller.abort();
    };
  }, [search, effectiveTypeFilter, categoryFilter, page, t, safeT]);

  /* ==========================================================================
   * URL PARAMETER UPDATE
   * ========================================================================== */

  const updateParam = (key: string, value: string | null): void => {
    const next = new URLSearchParams(searchParams);

    if (value !== null && value !== "") {
      next.set(key, value);
    } else {
      next.delete(key);
    }

    if (key !== "page") {
      next.delete("page");
    }

    if (key === "category") {
      next.delete("type");
    }

    setSearchParams(next);
  };

  /* ==========================================================================
   * CREATE ORGANIZATION
   * ========================================================================== */

  const handleCreateOrganization = (): void => {
    navigate("/church/organizations/new");
  };

  /* ==========================================================================
   * JOIN ORGANIZATION
   * ========================================================================== */

  const handleJoin = async (organizationId: string): Promise<void> => {
    if (!isValidOrganizationId(organizationId)) {
      setError(
        safeT(
          "church.organizations.invalidOrganizationId",
          "This organization ID is not valid.",
        ),
      );

      return;
    }

    if (joiningOrganizationId === organizationId) {
      return;
    }

    setError(null);
    setJoiningOrganizationId(organizationId);

    try {
      await joinOrganization(organizationId);

      setOrganizations((currentOrganizations) =>
        currentOrganizations.map((organization) =>
          organization.id === organizationId
            ? {
                ...organization,
                currentUserMembershipStatus: MembershipStatus.Pending,
              }
            : organization,
        ),
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          safeT(
            "church.organizations.joinError",
            "Unable to request organization membership.",
          ),
        ),
      );
    } finally {
      setJoiningOrganizationId(null);
    }
  };

  /* ==========================================================================
   * PAGINATION
   * ========================================================================== */

  const hasPreviousPage = page > 1;
  const hasNextPage = organizations.length >= PAGE_SIZE;

  /* ==========================================================================
   * FILTER LABELS
   * ========================================================================== */

  const selectedCategoryLabel = getCategoryLabel(categoryFilter);

  const selectedTypeLabel = effectiveTypeFilter
    ? safeT(
        `church.organizations.types.${String(effectiveTypeFilter)}`,
        ORGANIZATION_TYPE_LABELS[effectiveTypeFilter] ??
          String(effectiveTypeFilter),
      )
    : null;

  /* ==========================================================================
   * RENDER
   * ========================================================================== */

  return (
    <div className="church-page">
      <ChurchHeader />

      <section className="church-page-hero">
        <div className="church-container">
          <div className="church-page-hero__content">
            <div>
              <span className="church-eyebrow church-eyebrow--on-dark">
                {safeT("church.home.brand", "Fockis Organizations")}
              </span>

              <h1>
                {safeT(
                  "church.organizations.title",
                  "Discover Organizations",
                )}
              </h1>

              <p>
                {safeT(
                  "church.organizations.description",
                  "Discover communities, organizations, groups, and institutions on Fockis.",
                )}
              </p>
            </div>

            <button
              type="button"
              className="church-btn church-btn--primary"
              onClick={handleCreateOrganization}
            >
              {safeT("church.home.createOrganization", "Create organization")}
            </button>
          </div>
        </div>
      </section>

      <section className="church-container church-section">
        <div className="church-org-toolbar">
          <div>
            <h2>
              {safeT(
                "church.organizations.discoveryTitle",
                "Find an organization",
              )}
            </h2>

            <p>
              {safeT(
                "church.organizations.discoveryDescription",
                "Search and explore public organizations on Fockis.",
              )}
            </p>
          </div>

          <button
            type="button"
            className="church-btn church-btn--primary"
            onClick={handleCreateOrganization}
          >
            + {safeT("church.home.createOrganization", "Create organization")}
          </button>
        </div>

        <div className="church-org-filters">
          <input
            type="search"
            className="church-input"
            placeholder={safeT(
              "church.organizations.searchPlaceholder",
              "Search organizations...",
            )}
            value={search}
            onChange={(event) =>
              updateParam("search", event.target.value || null)
            }
            aria-label={safeT(
              "church.organizations.searchLabel",
              "Search organizations",
            )}
          />

          <select
            className="church-select"
            value={categoryFilter === "all" ? "" : categoryFilter}
            onChange={(event) =>
              updateParam("category", event.target.value || null)
            }
            aria-label={safeT(
              "church.organizations.categoryLabel",
              "Organization category",
            )}
          >
            <option value="">{getCategoryLabel("all")}</option>

            {ORGANIZATION_CATEGORIES.filter(
              (category) => category !== "all",
            ).map((category) => (
              <option key={category} value={category}>
                {getCategoryLabel(category)}
              </option>
            ))}
          </select>

          <select
            className="church-select"
            value={effectiveTypeFilter ?? ""}
            onChange={(event) =>
              updateParam("type", event.target.value || null)
            }
            aria-label={safeT(
              "church.organizations.typeLabel",
              "Organization type",
            )}
          >
            <option value="">
              {categoryFilter === "all"
                ? safeT("church.organizations.allTypes", "All types")
                : `${safeT(
                    "church.organizations.allCategoryTypes",
                    "All",
                  )} ${selectedCategoryLabel}`}
            </option>

            {categoryTypes.map((type) => (
              <option key={String(type)} value={String(type)}>
                {safeT(
                  `church.organizations.types.${String(type)}`,
                  ORGANIZATION_TYPE_LABELS[type] ?? String(type),
                )}
              </option>
            ))}
          </select>
        </div>

        {(categoryFilter !== "all" ||
          effectiveTypeFilter ||
          search.trim()) && (
          <div className="church-org-filter-summary" aria-live="polite">
            <span>{safeT("church.organizations.showing", "Showing")}</span>

            {search.trim() && (
              <span className="church-chip">
                {safeT("church.organizations.search", "Search")}:{" "}
                {search.trim()}
              </span>
            )}

            {categoryFilter !== "all" && (
              <span className="church-chip">{selectedCategoryLabel}</span>
            )}

            {selectedTypeLabel && (
              <span className="church-chip">{selectedTypeLabel}</span>
            )}

            <button
              type="button"
              className="church-link"
              onClick={() => setSearchParams(new URLSearchParams())}
            >
              {safeT("church.organizations.clearFilters", "Clear filters")}
            </button>
          </div>
        )}

        {error && (
          <div className="church-alert church-alert--error" role="alert">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="church-empty-state">
            <p>
              {safeT(
                "church.organizations.loading",
                "Loading organizations...",
              )}
            </p>
          </div>
        ) : organizations.length === 0 ? (
          <div className="church-empty-state">
            <h3>
              {safeT(
                "church.organizations.noResultsTitle",
                "No organizations found",
              )}
            </h3>

            <p>
              {safeT(
                "church.organizations.noResultsDescription",
                "Try changing your search or filters, or create a new organization.",
              )}
            </p>

            <button
              type="button"
              className="church-btn church-btn--primary"
              onClick={handleCreateOrganization}
            >
              {safeT(
                "church.organizations.createButton",
                "Create organization",
              )}
            </button>
          </div>
        ) : (
          <>
            <p className="church-results-count">
              {total.toLocaleString()}{" "}
              {total === 1
                ? safeT("church.organizations.organization", "organization")
                : safeT(
                    "church.organizations.organizations",
                    "organizations",
                  )}
            </p>

            <div className="church-org-grid">
              {organizations.map((organization) => (
                <OrganizationCard
                  key={organization.id}
                  organization={organization}
                  onJoin={handleJoin}
                />
              ))}
            </div>

            <div className="church-pagination">
              <button
                type="button"
                className="church-btn church-btn--ghost church-btn--sm"
                disabled={!hasPreviousPage}
                onClick={() => updateParam("page", String(page - 1))}
              >
                {safeT("common.back", "Back")}
              </button>

              <span className="church-pagination__label">
                {safeT("church.organizations.page", "Page")} {page}
              </span>

              <button
                type="button"
                className="church-btn church-btn--ghost church-btn--sm"
                disabled={!hasNextPage}
                onClick={() => updateParam("page", String(page + 1))}
              >
                {safeT("common.next", "Next")}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}