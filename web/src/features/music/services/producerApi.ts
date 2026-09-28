import { apiClient } from "../../careers/services/apiClient";

// ============================================================================
// PRODUCER STATUS
// ============================================================================

export type ProducerStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

// ============================================================================
// PRODUCER PROFILE
// ============================================================================

export interface ProducerProfile {
  id: string;
  userId: string;

  producerName: string;
  bio: string;
  genres: string[];

  profileImage: string;
  coverImage: string;

  website: string;
  instagram: string;
  youtube: string;
  tiktok: string;
  spotify: string;

  status: ProducerStatus;

  adminNote: string;
  reviewedBy: string | null;
  reviewedAt: string | null;

  followersCount: number;
  releasesCount: number;
  totalPlays: number;
  totalViews: number;
  totalSales: number;
  totalRevenueCents: number;

  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// PRODUCER PROFILE RESPONSES / PAYLOADS
// ============================================================================

export interface ProducerProfileResponse {
  exists: boolean;
  profile: ProducerProfile | null;
}

export interface CreateProducerProfilePayload {
  producerName: string;
  bio?: string;
  genres: string[];

  profileImage?: string;
  coverImage?: string;

  website?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  spotify?: string;
}

export type UpdateProducerProfilePayload =
  Partial<CreateProducerProfilePayload>;

export interface ProducerAdminNotePayload {
  note?: string;
}

// ============================================================================
// PRODUCER TEAM
// ============================================================================

export type ProducerTeamRole =
  | "owner"
  | "admin"
  | "manager"
  | "editor"
  | "marketing"
  | "analyst"
  | "moderator";

export type ProducerTeamMemberStatus =
  | "active"
  | "invited"
  | "suspended";

export interface ProducerTeamPermissions {
  profile: boolean;
  content: boolean;
  publishing: boolean;
  analytics: boolean;
  marketing: boolean;
  moderation: boolean;
  team: boolean;
  earnings: boolean;
}

export interface ProducerTeamMember {
  id: string;

  /**
   * Fockis user ID associated with this team member.
   */
  userId?: string | null;

  /**
   * Organization identity ID selected by the organization
   * when adding this member to the Creator Team.
   */
  organizationIdentityId?: string | null;

  email: string;
  name: string;

  role: ProducerTeamRole;
  status: ProducerTeamMemberStatus;

  permissions: ProducerTeamPermissions;

  invitedAt?: string | null;
  joinedAt?: string | null;
  updatedAt?: string | null;
}

export interface ProducerTeamResponse {
  members: ProducerTeamMember[];
}

// ============================================================================
// INVITE / UPDATE PAYLOADS
// ============================================================================

export interface InviteTeamMemberPayload {
  /**
   * Existing organization identity selected from the
   * organization's managed members.
   *
   * The backend must validate that this identity:
   * - belongs to the organization
   * - is active
   * - has an organization email
   * - belongs to the organization's verified domain
   * - is not already on the Creator Team
   */
  organizationIdentityId: string;

  /**
   * Organization email associated with the selected identity.
   */
  email: string;

  role: Exclude<
    ProducerTeamRole,
    "owner"
  >;

  permissions: ProducerTeamPermissions;
}

export interface UpdateTeamMemberPayload {
  role?: Exclude<
    ProducerTeamRole,
    "owner"
  >;

  permissions?: ProducerTeamPermissions;
}

export interface ProducerTeamActionResponse {
  success?: boolean;
  message?: string;
  member?: ProducerTeamMember;
}

// ============================================================================
// AUTO APPROVAL
// ============================================================================

/**
 * Manager setting controlling whether new creator applications
 * are automatically approved.
 */
export interface ProducerAutoApprovalSetting {
  enabled: boolean;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

// ============================================================================
// HELPERS
// ============================================================================

function requireId(
  value: string,
  label: string,
): string {
  const id = value?.trim();

  if (!id) {
    throw new Error(`${label} is required.`);
  }

  return id;
}

// ============================================================================
// PRODUCER API
// ============================================================================

const producerApi = {
  /* ==========================================================
     CREATOR PROFILE
  ========================================================== */

  async getMe(): Promise<ProducerProfileResponse> {
    return apiClient.get<ProducerProfileResponse>(
      "/music/producer/me",
    );
  },

  async apply(
    payload: CreateProducerProfilePayload,
  ): Promise<ProducerProfile> {
    return apiClient.post<ProducerProfile>(
      "/music/producer/apply",
      payload,
    );
  },

  async updateMe(
    payload: UpdateProducerProfilePayload,
  ): Promise<ProducerProfile> {
    return apiClient.patch<ProducerProfile>(
      "/music/producer/me",
      payload,
    );
  },

  async getPublicProfile(
    producerId: string,
  ): Promise<ProducerProfile> {
    const id = requireId(
      producerId,
      "Producer ID",
    );

    return apiClient.get<ProducerProfile>(
      `/music/producer/${encodeURIComponent(id)}`,
    );
  },

  /* ==========================================================
     CREATOR TEAM
  ========================================================== */

  /**
   * Get the current producer's Creator Team.
   *
   * GET /music/producer/team
   *
   * Supports both backend response formats:
   *
   * [
   *   { ...member }
   * ]
   *
   * and:
   *
   * {
   *   members: [
   *     { ...member }
   *   ]
   * }
   */
  async getTeam(): Promise<ProducerTeamResponse> {
    const result =
      await apiClient.get<
        ProducerTeamMember[] |
        ProducerTeamResponse
      >(
        "/music/producer/team",
      );

    if (Array.isArray(result)) {
      return {
        members: result,
      };
    }

    if (
      result &&
      Array.isArray(result.members)
    ) {
      return {
        members: result.members,
      };
    }

    return {
      members: [],
    };
  },

  /**
   * Invite an existing organization identity
   * to the Creator Team.
   *
   * POST /music/producer/team/invite
   */
  async inviteTeamMember(
    payload: InviteTeamMemberPayload,
  ): Promise<
    ProducerTeamMember |
    ProducerTeamActionResponse
  > {
    const organizationIdentityId =
      requireId(
        payload.organizationIdentityId,
        "Organization identity ID",
      );

    const email =
      payload.email?.trim().toLowerCase();

    if (!email) {
      throw new Error(
        "Team member organization email is required.",
      );
    }

    return apiClient.post<
      ProducerTeamMember |
      ProducerTeamActionResponse
    >(
      "/music/producer/team/invite",
      {
        organizationIdentityId,
        email,
        role: payload.role,
        permissions: payload.permissions,
      },
    );
  },

  /**
   * Update a team member's role
   * and permissions.
   *
   * PATCH /music/producer/team/:memberId
   */
  async updateTeamMember(
    memberId: string,
    payload: UpdateTeamMemberPayload,
  ): Promise<
    ProducerTeamMember |
    ProducerTeamActionResponse
  > {
    const id = requireId(
      memberId,
      "Team member ID",
    );

    return apiClient.patch<
      ProducerTeamMember |
      ProducerTeamActionResponse
    >(
      `/music/producer/team/${encodeURIComponent(id)}`,
      payload,
    );
  },

  /**
   * Suspend a team member.
   *
   * POST /music/producer/team/:memberId/suspend
   */
  async suspendTeamMember(
    memberId: string,
  ): Promise<
    ProducerTeamMember |
    ProducerTeamActionResponse
  > {
    const id = requireId(
      memberId,
      "Team member ID",
    );

    return apiClient.post<
      ProducerTeamMember |
      ProducerTeamActionResponse
    >(
      `/music/producer/team/${encodeURIComponent(id)}/suspend`,
    );
  },

  /**
   * Restore a suspended team member.
   *
   * POST /music/producer/team/:memberId/restore
   */
  async restoreTeamMember(
    memberId: string,
  ): Promise<
    ProducerTeamMember |
    ProducerTeamActionResponse
  > {
    const id = requireId(
      memberId,
      "Team member ID",
    );

    return apiClient.post<
      ProducerTeamMember |
      ProducerTeamActionResponse
    >(
      `/music/producer/team/${encodeURIComponent(id)}/restore`,
    );
  },

  /**
   * Remove a team member.
   *
   * DELETE /music/producer/team/:memberId
   */
  async removeTeamMember(
    memberId: string,
  ): Promise<ProducerTeamActionResponse> {
    const id = requireId(
      memberId,
      "Team member ID",
    );

    return apiClient.delete<ProducerTeamActionResponse>(
      `/music/producer/team/${encodeURIComponent(id)}`,
    );
  },

  /* ==========================================================
     ADMIN APPLICATIONS
  ========================================================== */

  async adminListApplications(
    status?: ProducerStatus,
  ): Promise<ProducerProfile[]> {
    const query = status
      ? `?status=${encodeURIComponent(status)}`
      : "";

    const result =
      await apiClient.get<ProducerProfile[]>(
        `/music/producer/admin/applications${query}`,
      );

    return Array.isArray(result)
      ? result
      : [];
  },

  async adminApprove(
    producerId: string,
  ): Promise<ProducerProfile> {
    const id = requireId(
      producerId,
      "Producer ID",
    );

    return apiClient.post<ProducerProfile>(
      `/music/producer/admin/${encodeURIComponent(id)}/approve`,
    );
  },

  async adminReject(
    producerId: string,
    note?: string,
  ): Promise<ProducerProfile> {
    const id = requireId(
      producerId,
      "Producer ID",
    );

    const payload: ProducerAdminNotePayload = {
      note: note?.trim() || "",
    };

    return apiClient.post<ProducerProfile>(
      `/music/producer/admin/${encodeURIComponent(id)}/reject`,
      payload,
    );
  },

  async adminSuspend(
    producerId: string,
    note?: string,
  ): Promise<ProducerProfile> {
    const id = requireId(
      producerId,
      "Producer ID",
    );

    const payload: ProducerAdminNotePayload = {
      note: note?.trim() || "",
    };

    return apiClient.post<ProducerProfile>(
      `/music/producer/admin/${encodeURIComponent(id)}/suspend`,
      payload,
    );
  },

  async adminRestore(
    producerId: string,
  ): Promise<ProducerProfile> {
    const id = requireId(
      producerId,
      "Producer ID",
    );

    return apiClient.post<ProducerProfile>(
      `/music/producer/admin/${encodeURIComponent(id)}/restore`,
    );
  },

  /* ==========================================================
     ADMIN CREATOR AUTO-APPROVAL SETTING
  ========================================================== */

  async adminGetAutoApproval(): Promise<ProducerAutoApprovalSetting> {
    return apiClient.get<ProducerAutoApprovalSetting>(
      "/music/producer/admin/settings/auto-approval",
    );
  },

  async adminSetAutoApproval(
    enabled: boolean,
  ): Promise<ProducerAutoApprovalSetting> {
    return apiClient.patch<ProducerAutoApprovalSetting>(
      "/music/producer/admin/settings/auto-approval",
      {
        enabled,
      },
    );
  },
};

export default producerApi;