/**
 * OrganizationMemberProfilePage
 * Route: /organizations/:organizationId/members/:memberId
 * (also /church/organizations/:organizationId/members/:memberId)
 *
 * Renders the member profile dashboard. All data comes from
 * GET /organizations/:organizationId/members/:memberId/profile, which applies
 * the viewer's permissions on the server.
 */

import { Navigate, useParams } from "react-router-dom";

import MemberProfilePage from "../member-profile/MemberProfilePage";

export default function OrganizationMemberProfilePage(): React.JSX.Element {
  const { organizationId, memberId } = useParams<{ organizationId: string; memberId: string }>();
  if (!organizationId || !memberId) return <Navigate to="/organizations" replace />;
  return <MemberProfilePage key={`${organizationId}:${memberId}`} organizationId={organizationId} memberId={memberId} />;
}
