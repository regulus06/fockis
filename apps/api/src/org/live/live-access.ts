/**
 * live-access.ts
 * -----------------------------------------------------------------------------
 * The single access rule for organization livestreams. Used by
 * ChurchLiveService (join, listings, meeting links) and by the Fockis Live
 * module (apps/api/src/my-live) before it issues a LiveKit token for a
 * broadcast linked to an organization livestream.
 *
 * Works on raw collections through the Mongoose connection so the Fockis Live
 * module can use it without importing the organization module.
 * -----------------------------------------------------------------------------
 */

import { Connection, Types } from 'mongoose';

export type LiveDenyReason =
  | 'sign_in'
  | 'members_only'
  | 'groups_only'
  | 'invitation_required'
  | 'not_available';

export interface LiveViewer {
  userId: string | null;
  isOwner: boolean;
  isManager: boolean;
  /** Active membership of this organization. */
  isMember: boolean;
  groupIds: string[];
  departmentIds: string[];
}

export interface LiveAccessFields {
  visibility: string;
  allowedGroupIds?: unknown[];
  allowedDepartmentIds?: unknown[];
}

const MANAGER_ROLES = new Set(['administrator', 'pastor_director']);

const oid = (v: unknown): Types.ObjectId | null => {
  const s = String(v ?? '');
  return Types.ObjectId.isValid(s) && /^[a-f0-9]{24}$/i.test(s) ? new Types.ObjectId(s) : null;
};

export const ANONYMOUS: LiveViewer = {
  userId: null,
  isOwner: false,
  isManager: false,
  isMember: false,
  groupIds: [],
  departmentIds: [],
};

/** Who the viewer is for this organization (owner, manager, member, groups). */
export async function loadLiveViewer(connection: Connection, organizationId: unknown, userId?: string | null): Promise<LiveViewer> {
  const org = oid(organizationId);
  const user = oid(userId);
  if (!org || !user) return ANONYMOUS;

  const [organization, membership] = await Promise.all([
    connection.collection('church_organizations').findOne({ _id: org }, { projection: { createdByUserId: 1 } }),
    connection
      .collection('church_members')
      .find({ organizationId: org, userId: user }, { projection: { status: 1, role: 1, permissions: 1, groupIds: 1, departmentIds: 1 } })
      .toArray(),
  ]);

  // A person can have more than one membership record (one per domain); an active one wins.
  const active = membership.find((m) => m.status === 'active') ?? null;
  const isOwner = Boolean(organization?.createdByUserId && String(organization.createdByUserId) === String(user));
  const permissions: string[] = Array.isArray(active?.permissions) ? active!.permissions.map(String) : [];
  const isManager = isOwner || Boolean(active && (MANAGER_ROLES.has(String(active.role)) || permissions.includes('manage_live')));

  return {
    userId: String(user),
    isOwner,
    isManager,
    isMember: Boolean(active) || isOwner,
    groupIds: Array.isArray(active?.groupIds) ? active!.groupIds.map(String) : [],
    departmentIds: Array.isArray(active?.departmentIds) ? active!.departmentIds.map(String) : [],
  };
}

/** Accepted invitation (or approved request) bound to this account. */
export async function hasAcceptedInvitation(connection: Connection, liveEventId: unknown, userId: string | null): Promise<boolean> {
  const id = oid(liveEventId);
  const user = oid(userId);
  if (!id || !user) return false;
  const now = new Date();
  const found = await connection.collection('church_live_invitations').findOne(
    {
      liveEventId: id,
      userId: user,
      status: 'accepted',
      $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }],
    },
    { projection: { _id: 1 } },
  );
  return Boolean(found);
}

/** The access rule. `invited` = hasAcceptedInvitation for this viewer. */
export function evaluateLiveAccess(
  doc: LiveAccessFields,
  viewer: LiveViewer,
  invited: boolean,
): { allowed: true } | { allowed: false; reason: LiveDenyReason } {
  if (viewer.isManager) return { allowed: true };
  switch (doc.visibility) {
    case 'public':
      return { allowed: true };
    case 'members':
      if (!viewer.userId) return { allowed: false, reason: 'sign_in' };
      return viewer.isMember || invited ? { allowed: true } : { allowed: false, reason: 'members_only' };
    case 'groups': {
      if (!viewer.userId) return { allowed: false, reason: 'sign_in' };
      if (invited) return { allowed: true };
      if (!viewer.isMember) return { allowed: false, reason: 'groups_only' };
      const groups = new Set((doc.allowedGroupIds ?? []).map(String));
      const departments = new Set((doc.allowedDepartmentIds ?? []).map(String));
      const inGroup = viewer.groupIds.some((g) => groups.has(g)) || viewer.departmentIds.some((d) => departments.has(d));
      return inGroup ? { allowed: true } : { allowed: false, reason: 'groups_only' };
    }
    case 'private':
    default:
      if (!viewer.userId) return { allowed: false, reason: 'sign_in' };
      return invited ? { allowed: true } : { allowed: false, reason: 'invitation_required' };
  }
}

/**
 * For the Fockis Live module: may this user receive a viewer token for the
 * organization livestream linked to a live_streams record?
 */
export async function canWatchOrganizationLive(
  connection: Connection,
  liveEventId: unknown,
  userId: string | null,
): Promise<{ allowed: boolean; reason?: LiveDenyReason }> {
  const id = oid(liveEventId);
  if (!id) return { allowed: false, reason: 'not_available' };
  const doc = await connection
    .collection('church_live_events')
    .findOne({ _id: id }, { projection: { organizationId: 1, visibility: 1, allowedGroupIds: 1, allowedDepartmentIds: 1, state: 1, isArchived: 1 } });
  if (!doc) return { allowed: false, reason: 'not_available' };
  const viewer = await loadLiveViewer(connection, doc.organizationId, userId);
  if (viewer.isManager) return { allowed: true };
  if (doc.isArchived || doc.state === 'cancelled' || doc.state === 'draft') return { allowed: false, reason: 'not_available' };
  const invited = await hasAcceptedInvitation(connection, id, userId);
  const result = evaluateLiveAccess(doc as unknown as LiveAccessFields, viewer, invited);
  return result.allowed ? { allowed: true } : { allowed: false, reason: result.reason };
}

export const DENY_MESSAGE: Record<LiveDenyReason, string> = {
  sign_in: 'Please sign in to watch this livestream.',
  members_only: 'This livestream is for members of this organization.',
  groups_only: 'This livestream is for selected groups of this organization.',
  invitation_required: 'This livestream is by invitation only.',
  not_available: 'This livestream is not available.',
};
