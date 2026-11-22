/**
 * InviteLinkPage.tsx — /organizations/:organizationId/group-invite/:token
 *
 * Landing page for an emailed group invitation. The token is only a lookup
 * key (stored hashed); accepting requires a signed-in church member, and
 * person-specific invitations are checked against the signed-in user.
 */

import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Check, Loader2, MailOpen, X } from "lucide-react";

import { getAuthToken } from "../api/organizationApi";
import { mediaUrl } from "../api/dashboardApi";
import { errorMessage } from "../ui/orgUi";
import { categoryLabel, communitiesApi } from "./communitiesApi";
import { GroupIcon, groupPath } from "./GroupParts";
import "../ministries/ministries.scss";
import "./groups.scss";

type Invite = Awaited<ReturnType<typeof communitiesApi.invitationLink>>;

export default function InviteLinkPage(): React.JSX.Element {
  const { organizationId = "", token = "" } = useParams<{ organizationId: string; token: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [inv, setInv] = useState<Invite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "yes" | "no">(null);
  const [done, setDone] = useState<string | null>(null);
  const signedIn = Boolean(getAuthToken());

  useEffect(() => {
    const c = new AbortController();
    communitiesApi
      .invitationLink(organizationId, token, c.signal)
      .then(setInv)
      .catch((err) => !c.signal.aborted && setError(errorMessage(err, "This invitation link is not valid.")));
    return () => c.abort();
  }, [organizationId, token]);

  async function respond(accept: boolean) {
    setBusy(accept ? "yes" : "no");
    setError(null);
    try {
      const r = await communitiesApi.respondLink(organizationId, token, accept);
      if (accept) navigate(groupPath(organizationId, r.groupId), { replace: true });
      else setDone("You declined the invitation.");
    } catch (err) {
      setError(errorMessage(err, "The invitation could not be answered. If you're not a member of this church yet, join the church first."));
    } finally {
      setBusy(null);
    }
  }

  const cover = inv?.group.photoUrl ? mediaUrl(inv.group.photoUrl) : null;
  return (
    <main className="gc-invite">
      <section className="mn-panel gc-invite__card">
        {cover && <div className="gc-invite__cover" style={{ backgroundImage: `url("${cover}")` }} />}
        {!inv && !error && <div className="mn-sk" style={{ height: 160 }} aria-busy="true" />}
        {inv && (
          <>
            <div className="gc-invite__head">
              <GroupIcon category={inv.group.category} size={56} />
              <div>
                <small>{categoryLabel(inv.group.category)}</small>
                <h1>{inv.group.name}</h1>
              </div>
            </div>
            <p>
              <MailOpen aria-hidden="true" /> <b>{inv.inviterName || "A group leader"}</b> invited you to join this group.
            </p>
            {inv.message && <blockquote className="gc-pre">{inv.message}</blockquote>}
            {inv.group.description && <p className="mn-muted gc-pre">{inv.group.description}</p>}
          </>
        )}
        {error && (
          <p className="mn-form-error" role="alert">
            {error}
          </p>
        )}
        {done && <p className="mn-callout">{done}</p>}
        {inv && !done && inv.status !== "pending" && <p className="mn-callout">This invitation is {inv.status}. Ask a group leader for a new one.</p>}
        {inv && !done && inv.status === "pending" && (
          <div className="mn-row">
            {signedIn ? (
              <>
                <button type="button" className="mn-btn mn-btn--primary" disabled={Boolean(busy)} onClick={() => respond(true)}>
                  {busy === "yes" ? <Loader2 className="mn-spin" aria-hidden="true" /> : <Check aria-hidden="true" />} Accept & join
                </button>
                <button type="button" className="mn-btn mn-btn--ghost" disabled={Boolean(busy)} onClick={() => respond(false)}>
                  {busy === "no" ? <Loader2 className="mn-spin" aria-hidden="true" /> : <X aria-hidden="true" />} Decline
                </button>
              </>
            ) : (
              <Link className="mn-btn mn-btn--primary" to={"/login?returnTo=" + encodeURIComponent(location.pathname)}>
                Sign in to respond
              </Link>
            )}
          </div>
        )}
        {inv?.expiresAt && inv.status === "pending" && <small className="mn-muted">Expires {new Date(inv.expiresAt).toLocaleDateString()}</small>}
      </section>
    </main>
  );
}
