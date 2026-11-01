import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Eye, EyeOff, Flag, Search, ShieldAlert, Trash2, TriangleAlert } from "lucide-react";

import { buildFockisUploadUrl } from "../../../../config/fockisConfig";
import { PERMISSIONS } from "../../permissions/permission.constants";
import { isSuperAdminSession, useAdminAccess } from "../../permissions/adminAccess";
import { useAdminNotificationStore } from "../../store/adminNotificationStore";
import { Card, Pager, PersonCell, Pill, SmEmpty, SmError, SmLoading, StatusPill, formatDateTime, timeAgo, useAdminQuery, useConfirm } from "../components/SmParts";
import RowMenu, { type RowMenuItem } from "../components/RowMenu";
import { adminError, supportAdminApi, type ModeratedPost } from "../supportAdminApi";
import { useSupportMod } from "../layout/SupportModLayout";
import { EventList } from "./HistoryPage";

const P = PERMISSIONS;

/* ============================================================================
   SHARED: post actions with confirmation + reason
============================================================================ */

function usePostActions(onDone: (post: ModeratedPost | null) => void) {
  const { can, currentAdmin } = useAdminAccess();
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const { refreshCounts } = useSupportMod();
  const confirm = useConfirm();
  const superAdmin = isSuperAdminSession(currentAdmin as never);

  const run = async (work: Promise<ModeratedPost | { deleted: boolean }>, success: string) => {
    try {
      const result = await work;
      toast("success", success);
      refreshCounts();
      onDone("id" in result ? result : null);
    } catch (error) {
      // Surface the message inside the dialog too.
      throw new Error(adminError(error));
    }
  };

  const items = (post: ModeratedPost): RowMenuItem[] => {
    const list: RowMenuItem[] = [];
    if (post.status === "visible" && can([P.MODERATION_CONTENT_REMOVE]))
      list.push({
        label: "Hide post",
        icon: <EyeOff size={15} />,
        danger: true,
        onSelect: () =>
          confirm.ask(
            {
              title: "Hide this post?",
              description: "The post disappears from feeds, profiles and search, but nothing is deleted. The author is notified and you can restore it at any time.",
              confirmLabel: "Hide post",
              tone: "danger",
              reasonLabel: "Reason (shared with the author and saved in history)",
            },
            (reason) => run(supportAdminApi.hidePost(post.id, reason), "Post hidden."),
          ),
      });
    if (post.status === "hidden" && can([P.MODERATION_RESTORE]))
      list.push({
        label: "Restore post",
        icon: <Eye size={15} />,
        onSelect: () =>
          confirm.ask(
            {
              title: "Restore this post?",
              description: "The post becomes visible again to its original audience. The author is notified.",
              confirmLabel: "Restore post",
              reasonLabel: "Reason for restoring",
            },
            (reason) => run(supportAdminApi.restorePost(post.id, reason), "Post restored."),
          ),
      });
    if (can([P.MODERATION_WARN]))
      list.push({
        label: "Warn author",
        icon: <TriangleAlert size={15} />,
        onSelect: () =>
          confirm.ask(
            {
              title: "Send a warning?",
              description: "The author gets a notification explaining which rule the post broke. The post itself is not changed.",
              confirmLabel: "Send warning",
              reasonLabel: "Warning message",
            },
            (reason) => run(supportAdminApi.warnAuthor(post.id, reason), "Warning sent."),
          ),
      });
    if (!post.escalatedAt && can([P.MODERATION_REVIEW]))
      list.push({
        label: "Escalate",
        icon: <ShieldAlert size={15} />,
        onSelect: () =>
          confirm.ask(
            {
              title: "Escalate for senior review?",
              description: "The post is flagged for senior moderators. Escalating does not hide it and does not create a legal hold.",
              confirmLabel: "Escalate",
              reasonLabel: "Why does this need senior review?",
            },
            (reason) => run(supportAdminApi.escalatePost(post.id, reason), "Post escalated."),
          ),
      });
    if (post.status === "hidden" && superAdmin)
      list.push({
        label: "Delete permanently",
        icon: <Trash2 size={15} />,
        danger: true,
        onSelect: () =>
          confirm.ask(
            {
              title: "Delete this post permanently?",
              description: "This can't be undone. Posts under an active legal hold can't be deleted. The deletion is recorded in Moderation History.",
              confirmLabel: "Delete permanently",
              tone: "danger",
              reasonLabel: "Reason for permanent deletion",
              typeToConfirm: "DELETE",
            },
            (reason, typed) => run(supportAdminApi.purgePost(post.id, reason, typed), "Post deleted permanently."),
          ),
      });
    return list;
  };

  return { items, element: confirm.element };
}

function mediaKind(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) ? "video" : "image";
}

/* ============================================================================
   LIST: Hidden Posts (+ all visible posts, escalated)
============================================================================ */

const VIEWS = [
  { value: "hidden", label: "Hidden" },
  { value: "visible", label: "Visible posts" },
  { value: "escalated", label: "Escalated" },
  { value: "all", label: "All posts" },
];

export function PostsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const view = params.get("view") || "hidden";
  const type = params.get("type") ?? "";
  const q = params.get("q") ?? "";
  const page = Number(params.get("page")) || 1;
  const [draft, setDraft] = useState(q);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  const list = useAdminQuery(
    () =>
      supportAdminApi.posts({
        status: view === "escalated" ? "all" : (view as "hidden" | "visible" | "all"),
        escalated: view === "escalated" ? true : undefined,
        type: type || undefined,
        search: q || undefined,
        page,
      }),
    [view, type, q, page],
  );
  const actions = usePostActions(() => void list.refetch());

  return (
    <Card title={view === "hidden" ? "Hidden Posts" : "User Posts"} icon={<EyeOff size={20} />}>
      <div className="fksm-tabs" role="tablist" aria-label="Posts">
        {VIEWS.map((v) => (
          <button key={v.value} type="button" role="tab" aria-selected={view === v.value} className={view === v.value ? "is-active" : ""} onClick={() => set("view", v.value === "hidden" ? "" : v.value)}>
            {v.label}
          </button>
        ))}
      </div>
      <div className="fksm-filters">
        <form
          className="fksm-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            set("q", draft.trim());
          }}
        >
          <Search size={16} aria-hidden="true" />
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search post text, post ID or username…" aria-label="Search posts" />
        </form>
        <select className="fksm-select" value={type} onChange={(e) => set("type", e.target.value)} aria-label="Post type">
          <option value="">All types</option>
          <option value="post">Posts</option>
          <option value="photo">Photos</option>
          <option value="video">Videos</option>
          <option value="reel">Reels</option>
          <option value="wave">Waves</option>
          <option value="story">Stories</option>
        </select>
      </div>

      {list.loading && !list.data ? (
        <SmLoading />
      ) : list.error ? (
        <SmError message={list.error} onRetry={list.refetch} />
      ) : !list.data?.items.length ? (
        <SmEmpty
          icon={<EyeOff size={24} />}
          title={view === "hidden" ? "No hidden posts" : "No posts found"}
          text={view === "hidden" ? "Posts hidden by moderators appear here and can be restored." : "Try a different search."}
        />
      ) : (
        <>
          <div className="fksm-table-wrap">
            <table className="fksm-table fksm-table--cards">
              <thead>
                <tr>
                  <th>Post</th>
                  <th>Author</th>
                  <th>Status</th>
                  <th>Reports</th>
                  <th>{view === "hidden" ? "Hidden by" : "Posted"}</th>
                  <th>{view === "hidden" ? "Reason" : ""}</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((post) => (
                  <tr key={post.id} className="is-clickable" onClick={() => navigate(`/admin/support/posts/${post.id}`)}>
                    <td>
                      <span className="fksm-subject">
                        <strong title={post.content}>{post.content || (post.media.length ? `${post.type} post` : "Empty post")}</strong>
                        <span>
                          Post #{post.id.slice(-6).toUpperCase()} · {post.type}
                          {post.escalatedAt ? " · escalated" : ""}
                        </span>
                      </span>
                    </td>
                    <td><PersonCell person={post.author} /></td>
                    <td><StatusPill status={post.status} /></td>
                    <td>{post.reports > 0 ? <Pill tone="amber">{post.reports}</Pill> : <span className="fksm-muted">0</span>}</td>
                    <td>
                      {view === "hidden" ? (
                        <span className="fksm-subject">
                          <strong>{post.hiddenBy?.username || post.hiddenBy?.name || (post.hiddenThroughCase ? "Report case" : "Moderator")}</strong>
                          <span>{timeAgo(post.hiddenAt)}</span>
                        </span>
                      ) : (
                        <span className="fksm-date">{timeAgo(post.createdAt)}</span>
                      )}
                    </td>
                    <td>{view === "hidden" ? <span className="fksm-muted" title={post.reason ?? ""}>{(post.reason ?? "—").slice(0, 60)}</span> : null}</td>
                    <td className="fksm-actions-cell">
                      <RowMenu items={[{ label: "Review post", icon: <Eye size={15} />, onSelect: () => navigate(`/admin/support/posts/${post.id}`) }, ...actions.items(post)]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={list.data.page} hasMore={list.data.hasMore} total={list.data.total} onPage={(p) => set("page", String(p))} />
        </>
      )}
      {actions.element}
    </Card>
  );
}

/* ============================================================================
   DETAIL: post review
============================================================================ */

export function PostReviewPage() {
  const { postId = "" } = useParams();
  const navigate = useNavigate();
  const query = useAdminQuery(() => supportAdminApi.post(postId), [postId]);
  const actions = usePostActions((post) => (post ? void query.refetch() : navigate("/admin/support/hidden-posts")));
  const post = query.data;

  if (query.loading && !post) return <SmLoading label="Loading post…" />;
  if (query.error || !post) return <SmError message={query.error ?? "Post not found."} onRetry={query.refetch} />;

  const buttons = actions.items(post);

  return (
    <>
      <Link to={post.status === "hidden" ? "/admin/support/hidden-posts" : "/admin/support/hidden-posts?view=visible"} className="fksm-back">
        <ArrowLeft size={16} /> Back to posts
      </Link>
      <div className="fksm-detail">
        <div className="fksm-stack">
          <Card>
            <div className="fksm-detail-head">
              <div>
                <h2>Post #{post.id.slice(-6).toUpperCase()}</h2>
                <div className="fksm-detail-head__meta">
                  <span>{post.type}</span>·<span>Audience: {post.audience || "public"}</span>·<span>Posted {formatDateTime(post.createdAt)}</span>
                </div>
              </div>
              <div className="fksm-row">
                <StatusPill status={post.status} />
                {post.escalatedAt && <Pill tone="red">Escalated</Pill>}
              </div>
            </div>

            {post.status === "hidden" && (
              <p className="fksm-notice fksm-notice--warn" style={{ marginTop: 14 }}>
                <AlertTriangle size={14} style={{ verticalAlign: -2 }} /> Hidden {formatDateTime(post.hiddenAt)}
                {post.hiddenBy ? ` by ${post.hiddenBy.username || post.hiddenBy.name}` : ""}
                {post.reason ? ` — ${post.reason}` : ""}. Hidden posts are kept, not deleted.
              </p>
            )}

            <div className="fksm-post" style={{ marginTop: 14 }}>
              <div className="fksm-post__head">
                <PersonCell person={post.author} />
                <span className="fksm-muted">{timeAgo(post.createdAt)}</span>
              </div>
              {post.content ? <p className="fksm-prose">{post.content}</p> : <p className="fksm-muted">No text.</p>}
              {post.media.length > 0 && (
                <div className="fksm-post__media">
                  {post.media.map((m) =>
                    mediaKind(m) === "video" ? (
                      <video key={m} src={buildFockisUploadUrl(m)} controls preload="metadata" />
                    ) : (
                      <a key={m} href={buildFockisUploadUrl(m)} target="_blank" rel="noreferrer">
                        <img src={buildFockisUploadUrl(m)} alt="Post media" loading="lazy" />
                      </a>
                    ),
                  )}
                </div>
              )}
            </div>

            {buttons.length > 0 && (
              <div className="fksm-row" style={{ marginTop: 16 }}>
                {buttons.map((b) => (
                  <button key={b.label} type="button" className={`fksm-btn fksm-btn--sm ${b.danger ? "fksm-btn--danger-ghost" : "fksm-btn--secondary"}`} onClick={b.onSelect}>
                    {b.icon} {b.label}
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card title="Moderation history">
            {post.history?.length ? <EventList events={post.history} /> : <p className="fksm-muted">No moderation actions on this post yet.</p>}
          </Card>
        </div>

        <div className="fksm-stack">
          <Card title="Reports" icon={<Flag size={18} />}>
            <dl className="fksm-facts">
              <div><dt>Reports</dt><dd>{post.reports}</dd></div>
              {post.topReason && <div><dt>Top reason</dt><dd>{post.topReason}</dd></div>}
            </dl>
            {post.openCaseId ? (
              <Link to={`/admin/moderation/cases/${post.openCaseId}`} className="fksm-link" style={{ marginTop: 10 }}>
                Open the report case →
              </Link>
            ) : (
              <p className="fksm-muted" style={{ marginTop: 8 }}>No open report case.</p>
            )}
          </Card>
          <Card title="Author">
            <dl className="fksm-facts">
              <div><dt>User</dt><dd>{post.author.username ? `@${post.author.username}` : post.author.name || "Unknown"}</dd></div>
            </dl>
            {post.author.id && (
              <Link to={`/admin/users/${post.author.id}`} className="fksm-link" style={{ marginTop: 10 }}>
                Open user profile →
              </Link>
            )}
          </Card>
        </div>
      </div>
      {actions.element}
    </>
  );
}
