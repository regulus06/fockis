/**
 * Fockis Org — Organization Page
 * -----------------------------------------------------------------------------
 * Compatibility location:
 *   web/src/features/church/pages/ChurchOrganizationPage.tsx
 *
 * Fockis Org is the universal organization platform.
 *
 * Supported:
 * - Organization profile
 * - Organization cover image/video
 * - Cover replacement
 * - Cover URL
 * - Cover deletion
 * - Membership
 * - Leadership
 * - Locations
 * - Departments
 * - Groups
 * - Members
 * - Fockis Events
 * - Fockis Live
 * - Organization media
 *
 * This file remains under features/church for backwards compatibility.
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type JSX,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import ChurchHeader from "../components/ChurchHeader";
import ChurchSidebar from "../components/ChurchSidebar";
import OrganizationTypeBadge from "../components/OrganizationTypeBadge";
import DepartmentCard from "../components/DepartmentCard";
import ChurchGroupCard from "../components/ChurchGroupCard";
import MemberCard from "../components/MemberCard";

import EventCard from "../../events/components/EventCard";

import { getOrganizationEvents } from "../../events/services/eventsApi";

import {
  getOrganization,
  joinOrganization,
  leaveOrganization,
  uploadOrganizationCover,
  setOrganizationCoverUrl,
  deleteOrganizationCover,
  type OrganizationCoverMediaType,
} from "../api/organizationsApi";

import { listDepartments } from "../api/departmentsApi";

import { listGroups } from "../api/groupsApi";

import { listMembers } from "../api/membersApi";

import { getCurrentLiveService } from "../api/churchLiveApi";

import {
  LeadershipRole,
  MembershipStatus,
  OrganizationType,
  ORGANIZATION_TYPE_LABELS,
  type ChurchGroup,
  type ChurchPermissions,
  type Department,
  type LiveEvent,
  type Member,
  type Organization,
} from "../types/church.types";

import type { FockisEvent } from "../../events/types/event.types";

import { useFockisTranslation } from "../../../i18n/useFockisTranslation";

import LanguageSelector from "../../../i18n/components/LanguageSelector";

import "../styles/ChurchOrganizationPage.scss";

/* ============================================================================
   ROUTES
============================================================================ */

function organizationPath(organizationId: string, section?: string): string {
  const base = "/organizations/" + encodeURIComponent(organizationId);

  return section ? base + "/" + encodeURIComponent(section) : base;
}

function createEventPath(organizationId: string): string {
  return "/events/create?organizationId=" + encodeURIComponent(organizationId);
}

function eventDetailsPath(eventId: string): string {
  return "/events/" + encodeURIComponent(eventId);
}

/* ============================================================================
   TYPES
============================================================================ */

type OrganizationPermissions = Partial<ChurchPermissions> & {
  canViewDepartments?: boolean;
  canManageDepartments?: boolean;

  canViewGroups?: boolean;
  canManageGroups?: boolean;

  canViewMembers?: boolean;
  canViewMemberDirectory?: boolean;
  canManageMembers?: boolean;

  canViewEvents?: boolean;
  canManageEvents?: boolean;

  canViewLive?: boolean;
  canManageLive?: boolean;

  canViewMedia?: boolean;
  canManageMedia?: boolean;
};

type OrganizationViewer = {
  isAuthenticated?: boolean;
  isActiveMember?: boolean;
  isOwner?: boolean;
  permissions?: OrganizationPermissions | null;
};

type OrganizationWithViewer = Organization & {
  bannerUrl?: string | null;

  bannerMediaType?: OrganizationCoverMediaType | null;

  bannerMediaSource?: "upload" | "url" | null;

  currentUserIsOwner?: boolean;

  viewer?: OrganizationViewer | null;

  permissions?: OrganizationPermissions | null;
};

/* ============================================================================
   CONSTANTS
============================================================================ */

const MAX_COVER_FILE_SIZE = 100 * 1024 * 1024;

const ACCEPTED_COVER_FILES = "image/*,video/*";

/* ============================================================================
   VALIDATION
============================================================================ */

function isValidOrganizationId(value: string | undefined): value is string {
  if (!value?.trim()) {
    return false;
  }

  const id = value.trim();

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

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

/* ============================================================================
   TRANSLATION HELPERS
============================================================================ */

type TranslationFunction = (
  key: string,
  variables?: Record<string, string | number>,
) => string;

function translatedOrFallback(
  t: TranslationFunction,
  key: string,
  fallback: string,
  variables?: Record<string, string | number>,
): string {
  const translated = t(key, variables);

  if (!translated || translated === key) {
    return fallback;
  }

  return translated;
}

/* ============================================================================
   ORGANIZATION HELPERS
============================================================================ */

function getOrganizationTypeLabel(
  value: OrganizationType | string | null | undefined,
  t: TranslationFunction,
): string {
  if (!value) {
    return translatedOrFallback(
      t,
      "church.organization.typeDefault",
      "Organization",
    );
  }

  const translationKey = "church.organizationTypes." + String(value);

  const translated = t(translationKey);

  if (translated && translated !== translationKey) {
    return translated;
  }

  const label = ORGANIZATION_TYPE_LABELS[value as OrganizationType];

  if (label) {
    return label;
  }

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function isEducationOrganization(
  value: OrganizationType | string | null | undefined,
): boolean {
  if (!value) {
    return false;
  }

  const educationTypes = new Set<string>([
    "school",
    "elementary_school",
    "middle_school",
    "high_school",
    "private_school",
    "public_school",
    "charter_school",
    "college",
    "university",
    "community_college",
    "vocational_school",
    "technical_school",
    "trade_school",
    "academy",
    "training_institute",
    "training_organization",
    "educational_organization",
    "educational_institution",
    "student_organization",
    "education_organization",
    "institute",
  ]);

  return educationTypes.has(String(value));
}

function isFaithOrganization(
  value: OrganizationType | string | null | undefined,
): boolean {
  if (!value) {
    return false;
  }

  const faithTypes = new Set<string>([
    "church",
    "christian_church",
    "christian_ministry",
    "christian_fellowship",
    "mission",
    "prayer_organization",
    "christian_network",
    "christian_nonprofit",
    "bible_study_organization",
    "mosque",
    "islamic_organization",
    "synagogue",
    "jewish_organization",
    "temple",
    "religious_organization",
    "religious_institution",
    "faith_organization",
  ]);

  return faithTypes.has(String(value));
}

function getOrganizationNoun(
  value: OrganizationType | string | null | undefined,
  t: TranslationFunction,
): string {
  return isEducationOrganization(value)
    ? translatedOrFallback(
        t,
        "church.organization.institution",
        "Institution",
      )
    : translatedOrFallback(
        t,
        "church.organization.organizationNoun",
        "Organization",
      );
}

/* ============================================================================
   URL HELPERS
============================================================================ */

function getSafeExternalUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }

  try {
    const url = new URL(value.trim());

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

/* ============================================================================
   COVER RESPONSE
============================================================================ */

function extractCoverOrganization(
  value: unknown,
): Partial<OrganizationWithViewer> {
  if (typeof value !== "object" || value === null) {
    return {};
  }

  const candidate = value as {
    organization?: unknown;
    bannerUrl?: unknown;
    bannerMediaType?: unknown;
    bannerMediaSource?: unknown;
  };

  let result: Partial<OrganizationWithViewer> = {};

  if (
    typeof candidate.organization === "object" &&
    candidate.organization !== null
  ) {
    result = {
      ...(candidate.organization as Partial<OrganizationWithViewer>),
    };
  }

  if (typeof candidate.bannerUrl === "string") {
    result.bannerUrl = candidate.bannerUrl;
  }

  if (candidate.bannerUrl === null) {
    result.bannerUrl = null;
  }

  if (
    candidate.bannerMediaType === "image" ||
    candidate.bannerMediaType === "video" ||
    candidate.bannerMediaType === null
  ) {
    result.bannerMediaType =
      candidate.bannerMediaType as OrganizationCoverMediaType | null;
  }

  if (
    candidate.bannerMediaSource === "upload" ||
    candidate.bannerMediaSource === "url" ||
    candidate.bannerMediaSource === null
  ) {
    result.bannerMediaSource =
      candidate.bannerMediaSource as "upload" | "url" | null;
  }

  return result;
}

/* ============================================================================
   LEADERSHIP
============================================================================ */

const LEADERSHIP_ORDER: LeadershipRole[] = [
  LeadershipRole.Owner,
  LeadershipRole.Administrator,
  LeadershipRole.PastorDirector,
  LeadershipRole.Leader,
  LeadershipRole.Staff,
];

function getLeadershipRoleLabel(
  role: LeadershipRole,
  t: TranslationFunction,
): string {
  const translationKeys: Partial<Record<LeadershipRole, string>> = {
    [LeadershipRole.Owner]: "church.organization.leadershipRoles.owner",

    [LeadershipRole.Administrator]:
      "church.organization.leadershipRoles.administrator",

    [LeadershipRole.PastorDirector]:
      "church.organization.leadershipRoles.pastorDirector",

    [LeadershipRole.Leader]: "church.organization.leadershipRoles.leader",

    [LeadershipRole.Staff]: "church.organization.leadershipRoles.staff",
  };

  const key = translationKeys[role];

  if (key) {
    const translated = t(key);

    if (translated && translated !== key) {
      return translated;
    }
  }

  switch (role) {
    case LeadershipRole.Owner:
      return "Owner";

    case LeadershipRole.Administrator:
      return "Administrator";

    case LeadershipRole.PastorDirector:
      return "Pastor / Director";

    case LeadershipRole.Leader:
      return "Leaders";

    case LeadershipRole.Staff:
      return "Staff";

    default:
      return String(role);
  }
}

/* ============================================================================
   PAGE
============================================================================ */

export default function ChurchOrganizationPage(): JSX.Element {
  const navigate = useNavigate();

  const { t } = useFockisTranslation();

  const { organizationId: rawOrganizationId } = useParams<{
    organizationId: string;
  }>();

  const organizationId = rawOrganizationId?.trim() ?? "";

  /* ==========================================================================
     STATE
  ========================================================================== */

  const [organization, setOrganization] =
    useState<OrganizationWithViewer | null>(null);

  const [departments, setDepartments] = useState<Department[]>([]);

  const [groups, setGroups] = useState<ChurchGroup[]>([]);

  const [members, setMembers] = useState<Member[]>([]);

  const [events, setEvents] = useState<FockisEvent[]>([]);

  const [liveService, setLiveService] = useState<LiveEvent | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [isUpdatingMembership, setIsUpdatingMembership] = useState(false);

  /* ==========================================================================
     COVER
  ========================================================================== */

  const coverFileInputRef = useRef<HTMLInputElement | null>(null);

  const [isCoverUploading, setIsCoverUploading] = useState(false);

  const [isCoverDeleting, setIsCoverDeleting] = useState(false);

  const [coverMessage, setCoverMessage] = useState<string | null>(null);

  const [coverError, setCoverError] = useState<string | null>(null);

  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

  const [coverPreviewType, setCoverPreviewType] =
    useState<OrganizationCoverMediaType | null>(null);

  /* ==========================================================================
     LOAD ORGANIZATION
  ========================================================================== */

  useEffect(() => {
    const controller = new AbortController();

    async function loadOrganization(): Promise<void> {
      if (!isValidOrganizationId(organizationId)) {
        setOrganization(null);
        setDepartments([]);
        setGroups([]);
        setMembers([]);
        setEvents([]);
        setLiveService(null);

        setError(
          organizationId
            ? t("church.organization.invalidId")
            : t("church.organization.noOrganization"),
        );

        setIsLoading(false);

        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await getOrganization(
          organizationId,
          controller.signal,
        );

        if (controller.signal.aborted) {
          return;
        }

        const org = result as OrganizationWithViewer;

        setOrganization(org);

        const viewer = org.viewer;

        const permissions = viewer?.permissions ?? org.permissions ?? null;

        const isOwner =
          viewer?.isOwner === true || org.currentUserIsOwner === true;

        const canDepartments =
          isOwner ||
          permissions?.canViewDepartments === true ||
          permissions?.canManageDepartments === true;

        const canGroups =
          isOwner ||
          permissions?.canViewGroups === true ||
          permissions?.canManageGroups === true;

        const canMembers =
          isOwner ||
          permissions?.canViewMembers === true ||
          permissions?.canViewMemberDirectory === true ||
          permissions?.canManageMembers === true;

        const canEvents =
          isOwner ||
          permissions?.canViewEvents === true ||
          permissions?.canManageEvents === true;

        const canLive =
          isOwner ||
          permissions?.canViewLive === true ||
          permissions?.canManageLive === true;

        const requests: Promise<unknown>[] = [];

        const requestKeys: string[] = [];

        if (canDepartments) {
          requests.push(
            listDepartments(
              organizationId,
              {
                page: 1,
                pageSize: 4,
              },
              controller.signal,
            ),
          );

          requestKeys.push("departments");
        }

        if (canGroups) {
          requests.push(
            listGroups(
              organizationId,
              {
                page: 1,
                pageSize: 4,
              },
              controller.signal,
            ),
          );

          requestKeys.push("groups");
        }

        if (canMembers) {
          requests.push(
            listMembers(
              organizationId,
              {
                page: 1,
                pageSize: 6,
                status: MembershipStatus.Active,
              },
              controller.signal,
            ),
          );

          requestKeys.push("members");
        }

        if (canEvents) {
          requests.push(getOrganizationEvents(organizationId));

          requestKeys.push("events");
        }

        if (canLive) {
          requests.push(
            getCurrentLiveService(organizationId, controller.signal),
          );

          requestKeys.push("live");
        }

        const results = await Promise.allSettled(requests);

        if (controller.signal.aborted) {
          return;
        }

        results.forEach((result, index) => {
          if (result.status !== "fulfilled") {
            return;
          }

          const key = requestKeys[index];

          if (key === "departments") {
            const value = result.value as { items?: Department[] };

            setDepartments(Array.isArray(value?.items) ? value.items : []);

            return;
          }

          if (key === "groups") {
            const value = result.value as { items?: ChurchGroup[] };

            setGroups(Array.isArray(value?.items) ? value.items : []);

            return;
          }

          if (key === "members") {
            const value = result.value as { items?: Member[] };

            setMembers(Array.isArray(value?.items) ? value.items : []);

            return;
          }

          if (key === "events") {
            const value = result.value as
              | FockisEvent[]
              | { items?: FockisEvent[] };

            if (Array.isArray(value)) {
              setEvents(value);
            } else {
              setEvents(Array.isArray(value?.items) ? value.items : []);
            }

            return;
          }

          if (key === "live") {
            setLiveService(
              (result.value as LiveEvent | null | undefined) ?? null,
            );
          }
        });
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        setOrganization(null);

        setError(getErrorMessage(err, t("church.organization.loadError")));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadOrganization();

    return () => {
      controller.abort();
    };
  }, [organizationId, t]);

  /* ==========================================================================
     COVER PREVIEW CLEANUP
  ========================================================================== */

  useEffect(() => {
    return () => {
      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
    };
  }, [coverPreviewUrl]);

  /* ==========================================================================
     AUTHORIZATION
  ========================================================================== */

  const authorization = useMemo(() => {
    if (!organization) {
      return {
        isOwner: false,
        isActiveMember: false,
        isPendingMember: false,
        isAuthenticated: false,
        permissions: null as OrganizationPermissions | null,
      };
    }

    const viewer = organization.viewer;

    const permissions =
      viewer?.permissions ?? organization.permissions ?? null;

    const membershipStatus = organization.currentUserMembershipStatus;

    return {
      isOwner:
        viewer?.isOwner === true || organization.currentUserIsOwner === true,

      isActiveMember:
        viewer?.isActiveMember === true ||
        membershipStatus === MembershipStatus.Active,

      isPendingMember: membershipStatus === MembershipStatus.Pending,

      isAuthenticated:
        viewer?.isAuthenticated === true || membershipStatus != null,

      permissions,
    };
  }, [organization]);

  const {
    isOwner,
    isActiveMember,
    isPendingMember,
    isAuthenticated,
    permissions,
  } = authorization;

  /* ==========================================================================
     SECTION PERMISSIONS
  ========================================================================== */

  const canViewDepartments =
    isOwner ||
    permissions?.canViewDepartments === true ||
    permissions?.canManageDepartments === true;

  const canViewGroups =
    isOwner ||
    permissions?.canViewGroups === true ||
    permissions?.canManageGroups === true;

  const canViewMembers =
    isOwner ||
    permissions?.canViewMembers === true ||
    permissions?.canViewMemberDirectory === true ||
    permissions?.canManageMembers === true;

  const canViewEvents =
    isOwner ||
    permissions?.canViewEvents === true ||
    permissions?.canManageEvents === true;

  const canManageEvents = isOwner || permissions?.canManageEvents === true;

  const canViewLive =
    isOwner ||
    permissions?.canViewLive === true ||
    permissions?.canManageLive === true;

  const canViewMedia =
    isOwner ||
    permissions?.canViewMedia === true ||
    permissions?.canManageMedia === true;

  const canManageCover = isOwner || permissions?.canManageMedia === true;

  /* ==========================================================================
     COVER
  ========================================================================== */

  const bannerUrl = coverPreviewUrl ?? organization?.bannerUrl ?? null;

  const bannerMediaType =
    coverPreviewType ?? organization?.bannerMediaType ?? null;

  const hasCover = Boolean(bannerUrl && bannerUrl.trim());

  /* ==========================================================================
     ORGANIZATION INFORMATION
  ========================================================================== */

  const organizationTypeLabel = getOrganizationTypeLabel(
    organization?.organizationType,
    t,
  );

  const organizationNoun = getOrganizationNoun(
    organization?.organizationType,
    t,
  );

  const isEducation = isEducationOrganization(
    organization?.organizationType,
  );

  const isFaith = isFaithOrganization(organization?.organizationType);

  const safeWebsiteUrl = getSafeExternalUrl(organization?.website);

  /* ==========================================================================
     LEADERSHIP
  ========================================================================== */

  const leadershipByRole = useMemo(
    () =>
      LEADERSHIP_ORDER.map((role) => ({
        role,
        label: getLeadershipRoleLabel(role, t),
        people:
          organization?.leadership?.filter(
            (leader) => leader.role === role,
          ) ?? [],
      })).filter((group) => group.people.length > 0),
    [organization?.leadership, t],
  );

  /* ==========================================================================
     COVER ACTIONS
  ========================================================================== */

  function clearCoverMessages(): void {
    setCoverMessage(null);
    setCoverError(null);
  }

  function openCoverFilePicker(): void {
    if (!canManageCover || isCoverUploading || isCoverDeleting) {
      return;
    }

    clearCoverMessages();

    coverFileInputRef.current?.click();
  }

  function validateCoverFile(file: File): OrganizationCoverMediaType {
    if (!file.type) {
      throw new Error(t("church.organization.cover.invalidType"));
    }

    if (file.size > MAX_COVER_FILE_SIZE) {
      throw new Error(t("church.organization.cover.fileTooLarge"));
    }

    const mimeType = file.type.toLowerCase().trim();

    if (mimeType.startsWith("video/")) {
      return "video";
    }

    if (mimeType.startsWith("image/")) {
      return "image";
    }

    throw new Error(t("church.organization.cover.onlyImageVideo"));
  }

  async function handleCoverFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    if (!canManageCover) {
      setCoverError(t("church.organization.cover.noPermission"));

      return;
    }

    clearCoverMessages();

    let mediaType: OrganizationCoverMediaType;

    try {
      mediaType = validateCoverFile(file);
    } catch (err) {
      setCoverError(
        getErrorMessage(err, t("church.organization.cover.invalidFile")),
      );

      return;
    }

    setIsCoverUploading(true);

    const localPreview = URL.createObjectURL(file);

    if (coverPreviewUrl) {
      URL.revokeObjectURL(coverPreviewUrl);
    }

    setCoverPreviewUrl(localPreview);

    setCoverPreviewType(mediaType);

    try {
      const result = await uploadOrganizationCover(organizationId, file);

      const updated = extractCoverOrganization(result);

      setOrganization((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          ...updated,

          bannerUrl:
            updated.bannerUrl !== undefined
              ? updated.bannerUrl
              : current.bannerUrl ?? null,

          bannerMediaType:
            updated.bannerMediaType !== undefined
              ? updated.bannerMediaType
              : mediaType,

          bannerMediaSource:
            updated.bannerMediaSource !== undefined
              ? updated.bannerMediaSource
              : "upload",
        };
      });

      if (typeof updated.bannerUrl === "string" && updated.bannerUrl.trim()) {
        URL.revokeObjectURL(localPreview);

        setCoverPreviewUrl(null);
      }

      setCoverPreviewType(updated.bannerMediaType ?? mediaType);

      setCoverMessage(
        mediaType === "video"
          ? t("church.organization.cover.videoUploaded")
          : t("church.organization.cover.imageUploaded"),
      );
    } catch (err) {
      URL.revokeObjectURL(localPreview);

      setCoverPreviewUrl(null);
      setCoverPreviewType(null);

      setCoverError(
        getErrorMessage(err, t("church.organization.cover.uploadError")),
      );
    } finally {
      setIsCoverUploading(false);
    }
  }

  async function handleSetCoverUrl(): Promise<void> {
    if (!canManageCover) {
      return;
    }

    clearCoverMessages();

    const value = window.prompt(
      t("church.organization.cover.urlPrompt"),
      organization?.bannerUrl ?? "",
    );

    if (value === null) {
      return;
    }

    const url = value.trim();

    if (!url) {
      setCoverError(t("church.organization.cover.urlRequired"));

      return;
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(url);
    } catch {
      setCoverError(t("church.organization.cover.urlInvalid"));

      return;
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      setCoverError(t("church.organization.cover.urlProtocol"));

      return;
    }

    const mediaTypeAnswer = window.prompt(
      t("church.organization.cover.mediaTypePrompt"),
      "image",
    );

    if (mediaTypeAnswer === null) {
      return;
    }

    const normalizedType = mediaTypeAnswer.trim().toLowerCase();

    if (normalizedType !== "image" && normalizedType !== "video") {
      setCoverError(t("church.organization.cover.mediaTypeInvalid"));

      return;
    }

    const mediaType = normalizedType as OrganizationCoverMediaType;

    setIsCoverUploading(true);

    try {
      const result = await setOrganizationCoverUrl(organizationId, {
        url,
        mediaType,
      });

      const updated = extractCoverOrganization(result);

      setOrganization((current) =>
        current
          ? {
              ...current,
              ...updated,

              bannerUrl:
                updated.bannerUrl !== undefined ? updated.bannerUrl : url,

              bannerMediaType:
                updated.bannerMediaType !== undefined
                  ? updated.bannerMediaType
                  : mediaType,

              bannerMediaSource:
                updated.bannerMediaSource !== undefined
                  ? updated.bannerMediaSource
                  : "url",
            }
          : current,
      );

      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
      }

      setCoverPreviewUrl(null);

      setCoverPreviewType(updated.bannerMediaType ?? mediaType);

      setCoverMessage(t("church.organization.cover.urlSaved"));
    } catch (err) {
      setCoverError(
        getErrorMessage(err, t("church.organization.cover.urlSaveError")),
      );
    } finally {
      setIsCoverUploading(false);
    }
  }

  async function handleDeleteCover(): Promise<void> {
    if (!canManageCover || !hasCover || isCoverDeleting) {
      return;
    }

    clearCoverMessages();

    const confirmed = window.confirm(
      t("church.organization.cover.deleteConfirm"),
    );

    if (!confirmed) {
      return;
    }

    setIsCoverDeleting(true);

    try {
      await deleteOrganizationCover(organizationId);

      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
      }

      setCoverPreviewUrl(null);
      setCoverPreviewType(null);

      setOrganization((current) =>
        current
          ? {
              ...current,
              bannerUrl: null,
              bannerMediaType: null,
              bannerMediaSource: null,
            }
          : current,
      );

      setCoverMessage(t("church.organization.cover.deleted"));
    } catch (err) {
      setCoverError(
        getErrorMessage(err, t("church.organization.cover.deleteError")),
      );
    } finally {
      setIsCoverDeleting(false);
    }
  }

  /* ==========================================================================
     MEMBERSHIP
  ========================================================================== */

  async function handleMembershipAction(): Promise<void> {
    if (!organization || isUpdatingMembership) {
      return;
    }

    if (!isAuthenticated) {
      navigate(
        "/login?returnTo=" + encodeURIComponent(window.location.pathname),
      );

      return;
    }

    setIsUpdatingMembership(true);

    setError(null);

    try {
      if (
        organization.currentUserMembershipStatus === MembershipStatus.Active
      ) {
        await leaveOrganization(organization.id);

        setOrganization((current) =>
          current
            ? {
                ...current,

                currentUserMembershipStatus: null,

                currentUserRole: null,

                currentUserIsOwner: false,

                permissions: null,

                viewer: {
                  isAuthenticated: current.viewer?.isAuthenticated ?? true,

                  isActiveMember: false,

                  isOwner: false,

                  permissions: null,
                },
              }
            : current,
        );

        setDepartments([]);
        setGroups([]);
        setMembers([]);
        setEvents([]);
        setLiveService(null);

        return;
      }

      await joinOrganization(organization.id);

      setOrganization((current) =>
        current
          ? {
              ...current,

              currentUserMembershipStatus: MembershipStatus.Pending,

              viewer: {
                ...current.viewer,

                isAuthenticated: current.viewer?.isAuthenticated ?? true,

                isActiveMember: false,
              },
            }
          : current,
      );

      setDepartments([]);
      setGroups([]);
      setMembers([]);
      setEvents([]);
      setLiveService(null);
    } catch (err) {
      setError(
        getErrorMessage(err, t("church.organization.membershipError")),
      );
    } finally {
      setIsUpdatingMembership(false);
    }
  }

  /* ==========================================================================
     LOADING
  ========================================================================== */

  if (isLoading) {
    return (
      <div className="church-page">
        <ChurchHeader />

        <div className="church-container">
          <div className="church-empty-state">
            <p>{t("church.organization.loading")}</p>
          </div>
        </div>
      </div>
    );
  }

  /* ==========================================================================
     ERROR
  ========================================================================== */

  if (error || !organization) {
    return (
      <div className="church-page">
        <ChurchHeader />

        <div className="church-container">
          <div className="church-alert church-alert--error" role="alert">
            {error ?? t("church.organization.notFound")}
          </div>

          <div style={{ marginTop: "1rem" }}>
            <Link
              to="/organizations"
              className="church-btn church-btn--primary"
            >
              {t("church.organizations.browse")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const org = organization;

  const visitPath = organizationPath(org.id, "visit");

  const newEventPath = createEventPath(org.id);

  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <div className="church-page church-organization-page">
      <ChurchHeader organizationName={org.name} organizationId={org.id} />

      {/* ======================================================================
          COVER
      ====================================================================== */}

      <section
        className="church-org-cover"
        aria-label={t("church.organization.cover.label")}
        style={{
          position: "relative",
          width: "100%",
          overflow: "hidden",
          background:
            "linear-gradient(135deg, #003f63 0%, #005a8d 55%, #0879b5 100%)",
          minHeight: hasCover ? "clamp(250px, 35vw, 430px)" : "250px",
        }}
      >
        {hasCover && bannerMediaType === "video" && (
          <video
            src={bannerUrl ?? undefined}
            className="church-org-cover__media"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={t("church.organization.cover.videoAlt")}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}

        {hasCover && bannerMediaType !== "video" && (
          <img
            src={bannerUrl ?? undefined}
            className="church-org-cover__media"
            alt=""
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}

        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: hasCover
              ? "linear-gradient(180deg, rgba(0,0,0,.12) 0%, rgba(0,0,0,.20) 45%, rgba(0,0,0,.58) 100%)"
              : "linear-gradient(135deg, rgba(0,0,0,.08), rgba(0,0,0,.2))",
          }}
        />

        <div
          className="church-container"
          style={{
            position: "relative",
            minHeight: hasCover ? "clamp(250px, 35vw, 430px)" : "250px",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "1rem",
            paddingTop: "2rem",
            paddingBottom: "1.5rem",
          }}
        >
          <div style={{ color: "#fff", maxWidth: "700px" }}>
            {!hasCover && (
              <div
                style={{
                  fontSize: "clamp(2rem, 5vw, 4rem)",
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                }}
                aria-hidden="true"
              >
                {org.name.slice(0, 1).toUpperCase()}
              </div>
            )}

            {hasCover && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  padding: "0.4rem 0.7rem",
                  borderRadius: "999px",
                  background: "rgba(0,0,0,.38)",
                  color: "#fff",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  backdropFilter: "blur(8px)",
                }}
              >
                {bannerMediaType === "video"
                  ? "\uD83C\uDFA5 " + t("church.organization.cover.video")
                  : "\uD83D\uDDBC\uFE0F " + t("church.organization.cover.photo")}
              </span>
            )}
          </div>

          {canManageCover && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "flex-end",
                gap: "0.5rem",
              }}
            >
              <input
                ref={coverFileInputRef}
                type="file"
                accept={ACCEPTED_COVER_FILES}
                onChange={handleCoverFileChange}
                style={{ display: "none" }}
              />

              <button
                type="button"
                className="church-btn"
                onClick={openCoverFilePicker}
                disabled={isCoverUploading || isCoverDeleting}
                style={{
                  background: "rgba(255,255,255,.96)",
                  color: "#003f63",
                  border: "1px solid rgba(255,255,255,.85)",
                }}
              >
                {isCoverUploading
                  ? t("church.organization.cover.uploading")
                  : hasCover
                    ? t("church.organization.cover.replace")
                    : t("church.organization.cover.upload")}
              </button>

              <button
                type="button"
                className="church-btn"
                onClick={handleSetCoverUrl}
                disabled={isCoverUploading || isCoverDeleting}
                style={{
                  background: "rgba(255,255,255,.14)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,.55)",
                  backdropFilter: "blur(8px)",
                }}
              >
                {"\uD83D\uDD17 " + t("church.organization.cover.useUrl")}
              </button>

              {hasCover && (
                <button
                  type="button"
                  className="church-btn"
                  onClick={handleDeleteCover}
                  disabled={isCoverUploading || isCoverDeleting}
                  style={{
                    background: "rgba(140,20,20,.76)",
                    color: "#fff",
                  }}
                >
                  {isCoverDeleting
                    ? t("church.organization.cover.deleting")
                    : "\uD83D\uDDD1 " + t("church.organization.cover.delete")}
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ======================================================================
          COVER STATUS
      ====================================================================== */}

      {(coverMessage || coverError) && (
        <div className="church-container">
          <div
            className={
              "church-alert " +
              (coverError ? "church-alert--error" : "church-alert--success")
            }
            role={coverError ? "alert" : "status"}
            style={{ marginTop: "1rem" }}
          >
            {coverError ?? coverMessage}
          </div>
        </div>
      )}

      {/* ======================================================================
          ORGANIZATION HERO
      ====================================================================== */}

      <section className="church-org-hero">
        <div className="church-container church-org-hero__inner">
          <div className="church-org-hero__logo">
            {org.logoUrl ? (
              <img
                src={org.logoUrl}
                alt={org.name + " " + t("church.organization.logo")}
              />
            ) : (
              <span aria-hidden="true">
                {org.name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>

          <div className="church-org-hero__info">
            <OrganizationTypeBadge organizationType={org.organizationType} />

            <h1>{org.name}</h1>

            <p className="church-org-hero__type">{organizationTypeLabel}</p>

            {org.description && <p>{org.description}</p>}

            <div className="church-org-hero__meta">
              {org.branches?.[0]?.address && (
                <span>
                  {org.branches[0].address.city}

                  {org.branches[0].address.state
                    ? ", " + org.branches[0].address.state
                    : ""}
                </span>
              )}

              {canViewMembers && (
                <span>
                  {(org.counts?.members ?? members.length).toLocaleString()}{" "}
                  {t("church.organization.members")}
                </span>
              )}

              {safeWebsiteUrl && (
                <a
                  href={safeWebsiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("church.organization.visitWebsite")}
                </a>
              )}
            </div>
          </div>

          <div className="church-org-hero__action">
            <LanguageSelector />

            <Link
              to={visitPath}
              className="church-btn church-btn--lg church-btn--primary"
            >
              {"\uD83D\uDCC5 " + t("church.organization.planVisit")}
            </Link>

            <button
              type="button"
              className={
                "church-btn church-btn--lg " +
                (isActiveMember
                  ? "church-btn--ghost"
                  : "church-btn--secondary")
              }
              onClick={handleMembershipAction}
              disabled={isPendingMember || isUpdatingMembership}
            >
              {isUpdatingMembership
                ? t("church.organization.updatingMembership")
                : isActiveMember
                  ? t("church.organization.leave")
                  : isPendingMember
                    ? t("church.organization.requestPending")
                    : isAuthenticated
                      ? t("church.organization.requestJoin")
                      : t("church.organization.signInToJoin")}
            </button>
          </div>
        </div>
      </section>

      {/* ======================================================================
          MAIN LAYOUT
      ====================================================================== */}

      <div className="church-container church-org-layout">
        <ChurchSidebar
          organizationId={org.id}
          organizationName={org.name}
          viewer={{
            isAuthenticated,
            isActiveMember,
            isOwner,
            permissions: permissions as ChurchPermissions | null | undefined,
          }}
        />

        <main className="church-org-content">
          {/* ==================================================================
              PLAN VISIT
          ================================================================== */}

          <section
            id="plan-visit"
            className="church-org-section church-plan-visit-section"
          >
            <div className="church-section__heading">
              <div>
                <span className="church-section__eyebrow">
                  {isEducation
                    ? t("church.organization.visitUs")
                    : isFaith
                      ? t("church.organization.newHere")
                      : t("church.organization.welcome")}
                </span>

                <h2>{t("church.organization.planYourVisit")}</h2>
              </div>
            </div>

            <div className="church-plan-visit-card">
              <div className="church-plan-visit-card__content">
                <span
                  className="church-plan-visit-card__icon"
                  aria-hidden="true"
                >
                  {"\uD83D\uDCC5"}
                </span>

                <div>
                  <h3>
                    {isEducation
                      ? t("church.organization.visit") + " " + org.name
                      : isFaith
                        ? t("church.organization.welcomeMessage")
                        : t("church.organization.connectWith") +
                          " " +
                          org.name}
                  </h3>

                  <p>
                    {isEducation
                      ? t("church.organization.planEducationVisit") +
                        " " +
                        org.name +
                        "."
                      : isFaith
                        ? t("church.organization.planFaithVisit") +
                          " " +
                          org.name +
                          "."
                        : t("church.organization.planOrganizationVisit") +
                          " " +
                          org.name +
                          "."}
                  </p>
                </div>
              </div>

              <Link to={visitPath} className="church-btn church-btn--primary">
                {t("church.organization.planVisit")}
              </Link>
            </div>
          </section>

          {/* ==================================================================
              OVERVIEW
          ================================================================== */}

          <section id="overview" className="church-org-section">
            <h2>{t("church.organization.overview")}</h2>

            <dl className="church-org-profile-grid">
              <div>
                <dt>
                  {organizationNoun} {t("church.organization.type")}
                </dt>

                <dd>
                  <OrganizationTypeBadge
                    organizationType={org.organizationType}
                    size="sm"
                  />
                </dd>
              </div>

              {org.contact?.email && (
                <div>
                  <dt>{t("church.organization.email")}</dt>

                  <dd>
                    <a href={"mailto:" + org.contact.email}>
                      {org.contact.email}
                    </a>
                  </dd>
                </div>
              )}

              {org.contact?.phone && (
                <div>
                  <dt>{t("church.organization.phone")}</dt>

                  <dd>
                    <a href={"tel:" + org.contact.phone}>
                      {org.contact.phone}
                    </a>
                  </dd>
                </div>
              )}

              {safeWebsiteUrl && (
                <div>
                  <dt>{t("church.organization.website")}</dt>

                  <dd>
                    <a
                      href={safeWebsiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {org.website}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {/* ==================================================================
              LEADERSHIP
          ================================================================== */}

          <section id="leadership" className="church-org-section">
            <h2>{t("church.organization.leadership")}</h2>

            {leadershipByRole.length === 0 ? (
              <p className="church-empty-state">
                {t("church.organization.noLeadership")}
              </p>
            ) : (
              <div className="church-leadership-groups">
                {leadershipByRole.map((group) => (
                  <div
                    key={String(group.role)}
                    className="church-leadership-group"
                  >
                    <h3>{group.label}</h3>

                    <ul>
                      {group.people.map((person) => (
                        <li key={person.id}>
                          <span className="church-leadership-group__name">
                            {person.user.displayName}
                          </span>

                          {person.title && (
                            <span className="church-leadership-group__title">
                              {person.title}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ==================================================================
              BRANCHES
          ================================================================== */}

          <section id="branches" className="church-org-section">
            <h2>{t("church.organization.locations")}</h2>

            {!org.branches || org.branches.length === 0 ? (
              <p className="church-empty-state">
                {t("church.organization.noLocations")}
              </p>
            ) : (
              <div className="church-branch-grid">
                {org.branches.map((branch) => (
                  <div key={branch.id} className="church-branch-card">
                    <h3>
                      {branch.name}

                      {branch.isMainLocation && (
                        <span className="church-chip">
                          {t("church.organization.mainLocation")}
                        </span>
                      )}
                    </h3>

                    {branch.address && (
                      <p>
                        {branch.address.line1}

                        {branch.address.line2
                          ? ", " + branch.address.line2
                          : ""}

                        {branch.address.city
                          ? ", " + branch.address.city
                          : ""}

                        {branch.address.state
                          ? ", " + branch.address.state
                          : ""}
                      </p>
                    )}

                    {branch.serviceTimes &&
                      branch.serviceTimes.length > 0 && (
                        <ul className="church-branch-card__times">
                          {branch.serviceTimes.map((time) => (
                            <li key={time}>{time}</li>
                          ))}
                        </ul>
                      )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ==================================================================
              DEPARTMENTS
          ================================================================== */}

          {canViewDepartments && (
            <section id="departments" className="church-org-section">
              <div className="church-section__heading">
                <h2>{t("church.organization.departments")}</h2>

                <Link
                  to={organizationPath(org.id, "departments")}
                  className="church-link"
                >
                  {t("church.organization.viewAll")}
                </Link>
              </div>

              {departments.length === 0 ? (
                <p className="church-empty-state">
                  {t("church.organization.noDepartments")}
                </p>
              ) : (
                <div className="church-panel-grid">
                  {departments.map((department) => (
                    <DepartmentCard
                      key={department.id}
                      organizationId={org.id}
                      department={department}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ==================================================================
              GROUPS
          ================================================================== */}

          {canViewGroups && (
            <section id="groups" className="church-org-section">
              <div className="church-section__heading">
                <h2>{t("church.organization.groups")}</h2>

                <Link
                  to={organizationPath(org.id, "groups")}
                  className="church-link"
                >
                  {t("church.organization.viewAll")}
                </Link>
              </div>

              {groups.length === 0 ? (
                <p className="church-empty-state">
                  {t("church.organization.noGroups")}
                </p>
              ) : (
                <div className="church-panel-grid">
                  {groups.map((group) => (
                    <ChurchGroupCard
                      key={group.id}
                      organizationId={org.id}
                      group={group}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ==================================================================
              MEMBERS
          ================================================================== */}

          {canViewMembers && (
            <section id="members" className="church-org-section">
              <div className="church-section__heading">
                <h2>{t("church.organization.members")}</h2>

                <Link
                  to={organizationPath(org.id, "members")}
                  className="church-link"
                >
                  {t("church.organization.viewDirectory")}
                </Link>
              </div>

              {members.length === 0 ? (
                <p className="church-empty-state">
                  {t("church.organization.noMembers")}
                </p>
              ) : (
                <div className="church-member-grid">
                  {members.map((member) => (
                    <MemberCard key={member.id} member={member} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ==================================================================
              FOCKIS EVENTS
          ================================================================== */}

          {canViewEvents && (
            <section id="events" className="church-org-section">
              <div className="church-section__heading">
                <div>
                  <span className="church-section__eyebrow">
                    {t("church.organization.fockisEvents")}
                  </span>

                  <h2>{t("church.organization.events")}</h2>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <Link
                    to={organizationPath(org.id, "events")}
                    className="church-link"
                  >
                    {t("church.organization.viewCalendar")}
                  </Link>

                  {canManageEvents && (
                    <Link
                      to={newEventPath}
                      className="church-btn church-btn--primary"
                    >
                      {"+ " + t("church.organization.createEvent")}
                    </Link>
                  )}
                </div>
              </div>

              {events.length === 0 ? (
                <div
                  className="church-empty-state"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                  }}
                >
                  <p style={{ margin: 0 }}>
                    {t("church.organization.noUpcomingEvents")}
                  </p>

                  {canManageEvents && (
                    <Link
                      to={newEventPath}
                      className="church-btn church-btn--primary"
                    >
                      {"+ " + t("church.organization.createFirstEvent")}
                    </Link>
                  )}
                </div>
              ) : (
                <div className="church-event-grid">
                  {events.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onOpen={(selectedEvent) => {
                        navigate(eventDetailsPath(selectedEvent.id));
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ==================================================================
              LIVE
          ================================================================== */}

          {canViewLive && (
            <section id="live" className="church-org-section">
              <div className="church-section__heading">
                <h2>{t("church.organization.fockisLive")}</h2>

                <Link
                  to={organizationPath(org.id, "live")}
                  className="church-link"
                >
                  {t("church.organization.openLive")}
                </Link>
              </div>

              {liveService ? (
                <div className="church-live-preview">
                  <span className="church-status-pill church-status-pill--live">
                    {t("church.organization.liveNow")}
                  </span>

                  <h3>{liveService.title}</h3>

                  <Link
                    to={organizationPath(org.id, "live")}
                    className="church-btn church-btn--primary"
                  >
                    {t("church.organization.watchNow")}
                  </Link>
                </div>
              ) : (
                <p className="church-empty-state">
                  {t("church.organization.nothingLive")}
                </p>
              )}
            </section>
          )}

          {/* ==================================================================
              MEDIA
          ================================================================== */}

          {canViewMedia && (
            <section id="media" className="church-org-section">
              <div className="church-section__heading">
                <h2>{t("church.organization.media")}</h2>

                <Link
                  to={organizationPath(org.id, "media")}
                  className="church-link"
                >
                  {t("church.organization.browseLibrary")}
                </Link>
              </div>

              <p className="church-empty-state">
                {t("church.organization.mediaDescription")}
              </p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}