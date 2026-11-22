/* ============================================================================
   ORGANIZATION EVENT MANAGERS
   apps/api/src/events/utils/org-manager.ts

   Who may manage an organization's events (create, edit, publish, archive,
   cancel, see registrations and the meeting link):
     - the organization owner (church_organizations.createdByUserId), or
     - an active administrator / pastor-director whose membership has the
       "manage_events" permission (same rule as the Organizations module).
   And which organizations a viewer belongs to (members-only events).

   Read through the shared connection so the Events module does not depend
   on the Organizations module.
============================================================================ */

import { Connection, Types } from "mongoose";

const ADMIN_ROLES = ["administrator", "pastor_director"];
const MANAGE_EVENTS = "manage_events";

const oid = (id: string): Types.ObjectId | null => (id && Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null);

export async function isOrgEventManager(connection: Connection, organizationId: unknown, userId: string | undefined): Promise<boolean> {
  const org = oid(String(organizationId ?? ""));
  const user = oid(String(userId ?? ""));
  if (!org || !user) return false;
  const owner = await connection
    .collection("church_organizations")
    .findOne({ _id: org, createdByUserId: user }, { projection: { _id: 1 } });
  if (owner) return true;
  const member = await connection.collection("church_members").findOne(
    { organizationId: org, userId: user, status: "active", role: { $in: ADMIN_ROLES }, permissions: MANAGE_EVENTS },
    { projection: { _id: 1 } },
  );
  return Boolean(member);
}

/** Organizations the user is an active member of, and those whose events they manage. */
export async function loadOrganizationRoles(
  connection: Connection,
  userId: string,
): Promise<{ memberOrganizationIds: string[]; managedOrganizationIds: string[] }> {
  const user = oid(userId);
  if (!user) return { memberOrganizationIds: [], managedOrganizationIds: [] };
  const [memberships, owned] = await Promise.all([
    connection
      .collection("church_members")
      .find({ userId: user, status: "active" }, { projection: { organizationId: 1, role: 1, permissions: 1 } })
      .limit(500)
      .toArray(),
    connection
      .collection("church_organizations")
      .find({ createdByUserId: user }, { projection: { _id: 1 } })
      .limit(500)
      .toArray(),
  ]);
  const members = new Set<string>();
  const managed = new Set<string>(owned.map((o) => String(o._id)));
  for (const m of memberships) {
    const id = String(m.organizationId ?? "");
    if (!id) continue;
    members.add(id);
    if (ADMIN_ROLES.includes(String(m.role)) && Array.isArray(m.permissions) && m.permissions.includes(MANAGE_EVENTS)) managed.add(id);
  }
  for (const id of managed) members.add(id);
  return { memberOrganizationIds: [...members], managedOrganizationIds: [...managed] };
}
