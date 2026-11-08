import { useState, type ReactNode } from "react";
import { Link, Navigate, NavLink, Route, Routes, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  BookOpen,
  Building2,
  CircleAlert,
  ExternalLink,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Presentation,
  Search,
  ShieldCheck,
  UserCheck,
  UserRound,
  Users,
  Video,
  Wallet,
} from "lucide-react";

import { useAdminNotificationStore } from "../store/adminNotificationStore";
import { useAdminAccess } from "../permissions/adminAccess";
import { PERMISSIONS } from "../permissions/permission.constants";
import { Card, Pager, Pill, SmEmpty, SmError, SmLoading, formatDateTime, timeAgo, useAdminQuery, useConfirm, type Tone } from "../support/components/SmParts";
import { adminError } from "../support/supportAdminApi";
import { academyAdminApi, type ClassDetail, type ClassKind, type ClassStatus, type CreatorAction, type CreatorStatus, type DomainBillingState, type SchoolBilling, type SchoolDetail, type SchoolStatus } from "./academyAdminCenterApi";
import "../support/styles/SupportMod.scss";
import "./AcademyAdminCenter.scss";

/* ============================================================================
   ADMIN · ACADEMY
   /admin/academy                  overview
   /admin/academy/classes(/:code)  classes, seminars, workshops, live classes
   /admin/academy/schools(/:id)    schools & organizations
   /admin/academy/certificates     certificates
   /admin/academy/learners         learner & creator accounts
   Site content (programs, news, faculty pages…) stays in the Academy
   website console at /academy/admin.
============================================================================ */

const KIND: Record<ClassKind, { label: string; plural: string; icon: typeof BookOpen }> = {
  course: { label: "Course", plural: "Courses", icon: BookOpen },
  seminar: { label: "Seminar", plural: "Seminars", icon: Presentation },
  workshop: { label: "Workshop", plural: "Workshops", icon: GraduationCap },
  live_class: { label: "Live class", plural: "Live classes", icon: Video },
};
const CLASS_STATUS: Record<ClassStatus, { label: string; tone: Tone }> = {
  live: { label: "Live", tone: "green" },
  draft: { label: "Draft", tone: "gray" },
  unlisted: { label: "Unlisted", tone: "blue" },
  taken_down: { label: "Taken down", tone: "red" },
  school_blocked: { label: "School blocked", tone: "amber" },
};
const SCHOOL_STATUS: Record<SchoolStatus, { label: string; tone: Tone }> = {
  pending: { label: "Waiting", tone: "amber" },
  approved: { label: "Approved", tone: "green" },
  rejected: { label: "Rejected", tone: "red" },
  blocked: { label: "Blocked", tone: "red" },
};

const money = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
};
const revenueText = (r: Record<string, number>) => Object.entries(r).map(([c, a]) => money(a, c)).join(" · ") || "—";
const priceText = (c: { isFree: boolean; price: number; currency: string }) => (c.isFree ? "Free" : money(c.price, c.currency));

function useCanManage() {
  const { can } = useAdminAccess();
  return can([PERMISSIONS.ACADEMY_MANAGE]);
}

function useParam(key: string, fallback = "") {
  const [params, setParams] = useSearchParams();
  const value = params.get(key) ?? fallback;
  const set = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") p.delete(k);
      else p.set(k, v);
    }
    if (!("page" in next)) p.delete("page");
    setParams(p, { replace: true });
  };
  return [value, set, params] as const;
}

/* ---------------------------------------------------------------- shell */

const TABS = [
  { to: "/admin/academy", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/academy/classes", label: "Classes & Seminars", icon: BookOpen },
  { to: "/admin/academy/creators", label: "Creators", icon: UserCheck },
  { to: "/admin/academy/schools", label: "Schools", icon: Building2 },
  { to: "/admin/academy/certificates", label: "Certificates", icon: Award },
  { to: "/admin/academy/learners", label: "Accounts", icon: Users },
];

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="fksm fkac">
      <header className="fkac-head">
        <div>
          <h1>
            <GraduationCap size={24} aria-hidden="true" /> Fockis Academy
          </h1>
          <p className="fksm-muted">Classes, seminars, workshops and live classes people publish, the schools behind them, certificates and learner accounts.</p>
        </div>
        <a className="fksm-btn fksm-btn--secondary fksm-btn--sm" href="/academy/admin" target="_blank" rel="noreferrer" title="Programs, news, faculty and other website pages (separate Academy login)">
          <ExternalLink size={15} /> Academy website console
        </a>
      </header>
      <nav className="fkac-tabs" aria-label="Academy sections">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? "is-active" : "")}>
            <t.icon size={16} aria-hidden="true" /> {t.label}
          </NavLink>
        ))}
      </nav>
      {children}
    </div>
  );
}

function Stat({ icon, label, value, sub, to }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode; to?: string }) {
  const body = (
    <>
      <span className="fkac-stat__icon">{icon}</span>
      <span className="fkac-stat__body">
        <small>{label}</small>
        <strong>{value}</strong>
        {sub && <em>{sub}</em>}
      </span>
    </>
  );
  return to ? (
    <Link to={to} className="fkac-stat">
      {body}
    </Link>
  ) : (
    <div className="fkac-stat">{body}</div>
  );
}

/* ---------------------------------------------------------------- overview */

function OverviewPage() {
  const q = useAdminQuery(() => academyAdminApi.overview(), []);
  const o = q.data;
  if (q.loading && !o) return <SmLoading />;
  if (q.error || !o) return <SmError message={q.error ?? "Couldn't load."} onRetry={q.refetch} />;
  return (
    <>
      <div className="fkac-stats">
        <Stat icon={<BookOpen size={20} />} label="Classes & seminars" value={o.classes.total.toLocaleString()} sub={`${o.classes.byStatus.live} live · ${o.classes.byStatus.draft} drafts`} to="/admin/academy/classes" />
        <Stat icon={<Building2 size={20} />} label="Schools waiting" value={o.schools.pending.toLocaleString()} sub={`${o.schools.approved} approved · ${o.schools.blocked} blocked`} to="/admin/academy/schools" />
        <Stat icon={<Users size={20} />} label="Enrollments" value={o.enrollments.total.toLocaleString()} sub={`${o.enrollments.last30Days} in the last 30 days`} />
        <Stat icon={<Award size={20} />} label="Certificates" value={o.certificates.valid.toLocaleString()} sub={`${o.certificates.revoked} revoked`} to="/admin/academy/certificates" />
        <Stat icon={<UserCheck size={20} />} label="Creators waiting" value={(o.creators?.pending ?? 0).toLocaleString()} sub={`${o.creators?.approved ?? 0} approved · ${o.creators?.suspended ?? 0} suspended`} to="/admin/academy/creators" />
        <Stat icon={<UserRound size={20} />} label="Academy accounts" value={o.accounts.total.toLocaleString()} sub={`${o.accounts.schoolLogins} school logins · ${o.accounts.suspended} suspended`} to="/admin/academy/learners" />
        <Stat icon={<Wallet size={20} />} label="Paid enrollments" value={revenueText(o.revenue)} sub="Total paid by learners" />
      </div>

      <div className="fkac-grid">
        <Card title="By type" icon={<Presentation size={18} />}>
          <ul className="fkac-kinds">
            {(Object.keys(KIND) as ClassKind[]).map((k) => {
              const K = KIND[k].icon;
              return (
                <li key={k}>
                  <Link to={`/admin/academy/classes?kind=${k}`}>
                    <K size={17} aria-hidden="true" /> {KIND[k].plural} <b>{(o.classes.byKind[k] ?? 0).toLocaleString()}</b>
                  </Link>
                </li>
              );
            })}
          </ul>
          {o.classes.byStatus.taken_down > 0 && (
            <p className="fksm-notice fksm-notice--warn" style={{ marginTop: 10 }}>
              {o.classes.byStatus.taken_down} taken down · <Link className="fksm-link" to="/admin/academy/classes?status=taken_down">review</Link>
            </p>
          )}
        </Card>

        <Card title="Schools waiting for review" icon={<Building2 size={18} />}>
          {o.pendingSchools.length ? (
            <ul className="fkac-list">
              {o.pendingSchools.map((s) => (
                <li key={s._id}>
                  <Link className="fksm-link" to={`/admin/academy/schools/${s._id}`}>
                    {s.name}
                  </Link>
                  <span>{[s.city, s.country].filter(Boolean).join(", ") || s.slug}</span>
                  <time>{timeAgo(s.createdAt)}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="fksm-muted">No schools waiting.</p>
          )}
        </Card>

        <Card title="Newest classes" icon={<BookOpen size={18} />} className="fkac-wide">
          {o.newestClasses.length ? (
            <ul className="fkac-list">
              {o.newestClasses.map((c) => (
                <li key={c.code}>
                  <Link className="fksm-link" to={`/admin/academy/classes/${encodeURIComponent(c.code)}`}>
                    {c.name}
                  </Link>
                  <span>
                    {KIND[(c.kind ?? "course") as ClassKind]?.label ?? "Course"}
                    {c.brandName ? ` · ${c.brandName}` : c.instructor ? ` · ${c.instructor}` : ""}
                  </span>
                  <Pill tone={CLASS_STATUS[c.status].tone}>{CLASS_STATUS[c.status].label}</Pill>
                </li>
              ))}
            </ul>
          ) : (
            <p className="fksm-muted">Nobody has created a class yet.</p>
          )}
        </Card>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- classes */

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  { value: "live", label: "Live" },
  { value: "draft", label: "Drafts" },
  { value: "unlisted", label: "Unlisted" },
  { value: "taken_down", label: "Taken down" },
  { value: "school_blocked", label: "School blocked" },
];

function ClassesPage() {
  const navigate = useNavigate();
  const [status, set, params] = useParam("status");
  const kind = params.get("kind") ?? "";
  const price = params.get("price") ?? "";
  const q = params.get("q") ?? "";
  const page = Number(params.get("page")) || 1;
  const [draft, setDraft] = useState(q);
  const list = useAdminQuery(() => academyAdminApi.classes({ q, kind, status, price, page }), [q, kind, status, price, page]);

  return (
    <Card title="Classes & seminars" icon={<BookOpen size={20} />}>
      <div className="fksm-tabs" role="tablist" aria-label="Status">
        {STATUS_TABS.map((t) => (
          <button key={t.value} type="button" role="tab" aria-selected={status === t.value} className={status === t.value ? "is-active" : ""} onClick={() => set({ status: t.value })}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="fksm-filters">
        <form
          className="fksm-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            set({ q: draft.trim() });
          }}
        >
          <Search size={16} aria-hidden="true" />
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search name, code, business, teacher…" aria-label="Search classes" />
        </form>
        <select className="fksm-select" value={kind} onChange={(e) => set({ kind: e.target.value })} aria-label="Type">
          <option value="">All types</option>
          {(Object.keys(KIND) as ClassKind[]).map((k) => (
            <option key={k} value={k}>
              {KIND[k].plural}
            </option>
          ))}
        </select>
        <select className="fksm-select" value={price} onChange={(e) => set({ price: e.target.value })} aria-label="Price">
          <option value="">Free & paid</option>
          <option value="free">Free</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {list.loading && !list.data ? (
        <SmLoading />
      ) : list.error ? (
        <SmError message={list.error} onRetry={list.refetch} />
      ) : !list.data?.items.length ? (
        <SmEmpty icon={<BookOpen size={24} />} title="No classes here" text={q || kind || status || price ? "Try other filters." : "Classes appear as soon as someone creates one in Creator Studio."} />
      ) : (
        <>
          <div className="fksm-table-wrap">
            <table className="fksm-table fksm-table--cards">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Type</th>
                  <th>Offered by</th>
                  <th>Price</th>
                  <th>Learners</th>
                  <th>Sales</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((c) => (
                  <tr key={c.code} className="is-clickable" onClick={() => navigate(`/admin/academy/classes/${encodeURIComponent(c.code)}`)}>
                    <td>
                      <span className="fksm-subject">
                        <strong>{c.name}</strong>
                        <span>{c.code}</span>
                      </span>
                    </td>
                    <td>{KIND[c.kind]?.label ?? "Course"}</td>
                    <td>
                      <span className="fksm-subject">
                        <strong>{c.school?.name ?? c.brandName ?? "—"}</strong>
                        <span>{c.instructor}</span>
                      </span>
                    </td>
                    <td>{priceText(c)}</td>
                    <td>{c.learners.toLocaleString()}</td>
                    <td>{revenueText(c.revenue)}</td>
                    <td>
                      <Pill tone={CLASS_STATUS[c.status].tone}>{CLASS_STATUS[c.status].label}</Pill>
                      {!c.enrollmentOpen && <span className="fksm-muted fkac-small"> · closed</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={list.data.page} hasMore={list.data.hasMore} total={list.data.total} onPage={(n) => set({ page: String(n) })} />
        </>
      )}
    </Card>
  );
}

function ClassDetailPage() {
  const { code = "" } = useParams();
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const canManage = useCanManage();
  const confirm = useConfirm();
  const detail = useAdminQuery(() => academyAdminApi.classDetail(code), [code]);
  const c = detail.data;

  const run = async (work: () => Promise<ClassDetail>, done: string) => {
    try {
      detail.setData(await work());
      toast("success", done);
    } catch (e) {
      toast("error", adminError(e, "That didn't work."));
    }
  };

  return (
    <>
      <Link to="/admin/academy/classes" className="fksm-back">
        <ArrowLeft size={16} /> Back to classes
      </Link>
      {detail.loading && !c ? (
        <SmLoading />
      ) : detail.error || !c ? (
        <SmError message={detail.error ?? "Class not found."} onRetry={detail.refetch} />
      ) : (
        <div className="fksm-detail">
          <div className="fksm-stack">
            <Card>
              <div className="fksm-detail-head">
                <div>
                  <h2>{c.name}</h2>
                  <div className="fksm-detail-head__meta">
                    <span>{KIND[c.kind]?.label ?? "Course"}</span>·<code>{c.code}</code>·<span>{priceText(c)}</span>·<span>Created {formatDateTime(c.createdAt)}</span>
                  </div>
                </div>
                <Pill tone={CLASS_STATUS[c.status].tone}>{CLASS_STATUS[c.status].label}</Pill>
              </div>
              {c.status === "taken_down" && (
                <p className="fksm-notice fksm-notice--error" style={{ marginTop: 12 }}>
                  Taken down {formatDateTime(c.takenDownAt)}
                  {c.takenDownBy ? ` by ${c.takenDownBy}` : ""}: “{c.takenDownReason.replace(/[.!?]+$/, "")}.” The creator sees this reason. Enrolled learners keep access.
                </p>
              )}
              {c.summary && <p className="fkac-summary">{c.summary}</p>}
              <div className="fkac-stats fkac-stats--small">
                <Stat icon={<Users size={18} />} label="Learners" value={c.stats.learners.toLocaleString()} sub={`${c.stats.completed} completed`} />
                <Stat icon={<Award size={18} />} label="Certificates" value={c.stats.certificates.toLocaleString()} />
                <Stat icon={<Wallet size={18} />} label="Paid by learners" value={revenueText(c.stats.revenue)} />
              </div>
              <a className="fksm-link" href={`/academy/learn/${encodeURIComponent(c.code)}`} target="_blank" rel="noreferrer">
                Open the class page <ExternalLink size={13} />
              </a>
            </Card>

            <Card title={`Lessons (${c.lessons.length})`} icon={<FileText size={18} />}>
              {c.lessons.length ? (
                <ol className="fkac-lessons">
                  {c.lessons.map((l) => (
                    <li key={l.key}>
                      <span className="fkac-lessons__type">{l.type}</span> {l.title}
                      {l.preview && <span className="fksm-muted"> · free preview</span>}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="fksm-muted">No lessons yet.</p>
              )}
              {c.description && (
                <>
                  <h3 className="fkac-sub">Description</h3>
                  <p className="fkac-desc">{c.description}</p>
                </>
              )}
            </Card>

            <Card title={`Learners (${c.stats.learners})`} icon={<Users size={18} />}>
              {c.enrollments.length ? (
                <div className="fksm-table-wrap">
                  <table className="fksm-table">
                    <thead>
                      <tr>
                        <th>Learner</th>
                        <th>Access</th>
                        <th>Progress</th>
                        <th>Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.enrollments.map((e) => (
                        <tr key={e.id}>
                          <td>
                            <span className="fksm-subject">
                              <strong>{e.student?.name ?? "Deleted account"}</strong>
                              <span>{e.student?.email}</span>
                            </span>
                          </td>
                          <td>{e.accessType === "paid" && e.paidAmount ? `Paid ${money(e.paidAmount, e.paidCurrency || c.currency)}` : e.accessType === "granted" ? "Granted" : "Free"}</td>
                          <td>{e.progress}%</td>
                          <td className="fksm-date">{timeAgo(e.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="fksm-muted">Nobody has joined yet.</p>
              )}
              {c.stats.learners > c.enrollments.length && <p className="fksm-muted fkac-small">Showing the newest {c.enrollments.length}.</p>}
            </Card>
          </div>

          <div className="fksm-stack">
            <Card title="Actions" icon={<ShieldCheck size={18} />}>
              {!canManage ? (
                <p className="fksm-muted">You can view classes but not change them (needs “Manage Academy”).</p>
              ) : (
                <div className="fkac-actions">
                  {c.status === "taken_down" ? (
                    <button
                      type="button"
                      className="fksm-btn fksm-btn--primary fksm-btn--block"
                      onClick={() =>
                        confirm.ask(
                          { title: "Restore this class?", description: "It goes back to the creator's chosen visibility, and new learners can join again.", confirmLabel: "Restore class", tone: "primary" },
                          async () => run(() => academyAdminApi.restore(c.code), "Class restored."),
                        )
                      }
                    >
                      Restore class
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="fksm-btn fksm-btn--danger fksm-btn--block"
                      onClick={() =>
                        confirm.ask(
                          {
                            title: "Take this class down?",
                            description: "It disappears from the catalog and nobody new can join or pay. People already enrolled keep access. The creator sees your reason in Creator Studio.",
                            confirmLabel: "Take down",
                            tone: "danger",
                            reasonLabel: "Reason (the creator sees it)",
                          },
                          async (reason) => run(() => academyAdminApi.takeDown(c.code, reason), "Class taken down."),
                        )
                      }
                    >
                      Take down
                    </button>
                  )}
                  <button
                    type="button"
                    className="fksm-btn fksm-btn--secondary fksm-btn--block"
                    onClick={() => void run(() => academyAdminApi.setEnrollment(c.code, !c.enrollmentOpen), c.enrollmentOpen ? "Enrollment closed." : "Enrollment opened.")}
                  >
                    {c.enrollmentOpen ? "Close enrollment" : "Open enrollment"}
                  </button>
                  <p className="fksm-muted fkac-small">Refunds go through Finance → Refunds, as for any Fockis payment.</p>
                </div>
              )}
            </Card>

            <Card title="Creator" icon={<UserRound size={18} />}>
              {c.owner ? (
                <dl className="fksm-facts">
                  <div><dt>Account</dt><dd>{c.owner.name}</dd></div>
                  <div><dt>Email</dt><dd>{c.owner.email}</dd></div>
                  {c.instructor && c.instructor !== c.owner.name && <div><dt>Teacher shown</dt><dd>{c.instructor}</dd></div>}
                  {c.brandName && <div><dt>Business / brand</dt><dd>{c.brandName}</dd></div>}
                  <div><dt>Status</dt><dd>{c.owner.isActive === false ? "Suspended" : "Active"}</dd></div>
                </dl>
              ) : (
                <p className="fksm-muted">Deleted account.</p>
              )}
              {c.owner && (
                <Link className="fksm-link" to={`/admin/academy/learners?q=${encodeURIComponent(c.owner.email)}`} style={{ display: "inline-block", marginTop: 8 }}>
                  Find the account
                </Link>
              )}
            </Card>

            {c.school && (
              <Card title="School" icon={<Building2 size={18} />}>
                <Link className="fksm-link" to={`/admin/academy/schools/${c.school._id}`}>
                  {c.school.name}
                </Link>{" "}
                <Pill tone={SCHOOL_STATUS[c.school.status]?.tone ?? "gray"}>{SCHOOL_STATUS[c.school.status]?.label ?? c.school.status}</Pill>
              </Card>
            )}

            <Card title="Settings" icon={<CircleAlert size={18} />}>
              <dl className="fksm-facts">
                <div><dt>Visibility (creator)</dt><dd>{c.visibility}</dd></div>
                <div><dt>Enrollment</dt><dd>{c.enrollmentOpen ? "Open" : "Closed"}</dd></div>
                <div><dt>Seats</dt><dd>{c.capacity ? c.capacity : "Unlimited"}</dd></div>
                {c.startsAt && <div><dt>Starts</dt><dd>{formatDateTime(c.startsAt)}</dd></div>}
                <div><dt>Certificate</dt><dd>{c.certificateEnabled ? "Automatic on completion" : "Off"}</dd></div>
                {c.category && <div><dt>Category</dt><dd>{c.category}</dd></div>}
              </dl>
            </Card>
          </div>
        </div>
      )}
      {confirm.element}
    </>
  );
}

/* ---------------------------------------------------------------- schools */

const SCHOOL_TABS: Array<{ value: string; label: string }> = [
  { value: "pending", label: "Waiting" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "blocked", label: "Blocked" },
  { value: "", label: "All" },
];

function SchoolsPage() {
  const navigate = useNavigate();
  const [status, set] = useParam("status", "pending");
  const list = useAdminQuery(() => academyAdminApi.schools(status), [status]);
  return (
    <Card title="Schools & organizations" icon={<Building2 size={20} />}>
      <p className="fksm-muted fkac-intro">Schools, universities, training centers, churches and businesses that register to teach on Fockis. Check their details and proof document, then approve, reject or block them. A blocked school's classes leave the catalog.</p>
      <div className="fksm-tabs" role="tablist" aria-label="Status">
        {SCHOOL_TABS.map((t) => (
          <button key={t.value || "all"} type="button" role="tab" aria-selected={status === t.value} className={status === t.value ? "is-active" : ""} onClick={() => set({ status: t.value || null })}>
            {t.label}
            {t.value && list.data?.totals?.[t.value as SchoolStatus] !== undefined && <span className="fkac-count">{list.data.totals[t.value as SchoolStatus]}</span>}
          </button>
        ))}
      </div>
      {list.loading && !list.data ? (
        <SmLoading />
      ) : list.error ? (
        <SmError message={list.error} onRetry={list.refetch} />
      ) : !list.data?.items.length ? (
        <SmEmpty icon={<Building2 size={24} />} title={status === "pending" ? "No schools waiting" : "No schools here"} />
      ) : (
        <div className="fksm-table-wrap">
          <table className="fksm-table fksm-table--cards">
            <thead>
              <tr>
                <th>School</th>
                <th>Type</th>
                <th>Place</th>
                <th>Owner</th>
                <th>Students</th>
                <th>Domain fee</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((s) => (
                <tr key={s._id} className="is-clickable" onClick={() => navigate(`/admin/academy/schools/${s._id}`)}>
                  <td>
                    <span className="fksm-subject">
                      <strong>{s.name}</strong>
                      <span>{s.domain}</span>
                    </span>
                  </td>
                  <td>{s.type?.replace("_", " ")}</td>
                  <td>{[s.city, s.country].filter(Boolean).join(", ") || "—"}</td>
                  <td>
                    <span className="fksm-subject">
                      <strong>{s.owner?.name ?? "—"}</strong>
                      <span>{s.owner?.email}</span>
                    </span>
                  </td>
                  <td>{s.students}</td>
                  <td>{s.billing && s.status === "approved" ? <BillingPill state={s.billing.state} until={s.billing.paidUntil} /> : "—"}</td>
                  <td>
                    <Pill tone={SCHOOL_STATUS[s.status].tone}>{SCHOOL_STATUS[s.status].label}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function SchoolDetailPage() {
  const { id = "" } = useParams();
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const canManage = useCanManage();
  const confirm = useConfirm();
  const detail = useAdminQuery(() => academyAdminApi.school(id), [id]);
  const s = detail.data;

  const act = (action: "approve" | "reject" | "block" | "unblock") => {
    const needsReason = action === "reject" || action === "block";
    const copy: Record<typeof action, { title: string; description: string; label: string; done: string }> = {
      approve: { title: "Approve this school?", description: "It can publish classes as the school, add teachers and create student logins.", label: "Approve", done: "School approved." },
      reject: { title: "Reject this school?", description: "The owner sees your reason and can fix the details and send it again.", label: "Reject", done: "School rejected." },
      block: { title: "Block this school?", description: "Its classes leave the catalog, nobody new can join them, and its students can't sign in.", label: "Block", done: "School blocked." },
      unblock: { title: "Unblock this school?", description: "Its classes come back and its students can sign in again.", label: "Unblock", done: "School unblocked." },
    };
    const t = copy[action];
    confirm.ask(
      { title: t.title, description: t.description, confirmLabel: t.label, tone: needsReason ? "danger" : "primary", reasonLabel: needsReason ? "Reason (the school sees it)" : undefined },
      async (reason) => {
        detail.setData((await academyAdminApi.schoolStatus(id, action, reason)) as SchoolDetail);
        toast("success", t.done);
      },
    );
  };

  return (
    <>
      <Link to="/admin/academy/schools" className="fksm-back">
        <ArrowLeft size={16} /> Back to schools
      </Link>
      {detail.loading && !s ? (
        <SmLoading />
      ) : detail.error || !s ? (
        <SmError message={detail.error ?? "School not found."} onRetry={detail.refetch} />
      ) : (
        <div className="fksm-detail">
          <div className="fksm-stack">
            <Card>
              <div className="fksm-detail-head">
                <div>
                  <h2>{s.name}</h2>
                  <div className="fksm-detail-head__meta">
                    <code>{s.domain}</code>·<span>{s.type?.replace("_", " ")}</span>·<span>Registered {formatDateTime(s.createdAt)}</span>
                  </div>
                </div>
                <Pill tone={SCHOOL_STATUS[s.status].tone}>{SCHOOL_STATUS[s.status].label}</Pill>
              </div>
              {s.statusReason && (s.status === "rejected" || s.status === "blocked") && (
                <p className="fksm-notice fksm-notice--error" style={{ marginTop: 12 }}>
                  Reason given: “{s.statusReason}”
                </p>
              )}
              {s.description && <p className="fkac-summary">{s.description}</p>}
              <dl className="fksm-facts">
                {(s.address || s.city || s.country) && <div><dt>Address</dt><dd>{[s.address, s.city, s.country].filter(Boolean).join(", ")}</dd></div>}
                {s.registrationNumber && <div><dt>Registration no.</dt><dd>{s.registrationNumber}</dd></div>}
                {s.contactEmail && <div><dt>Contact email</dt><dd>{s.contactEmail}</dd></div>}
                {s.phone && <div><dt>Phone</dt><dd>{s.phone}</dd></div>}
                {s.website && (
                  <div>
                    <dt>Website</dt>
                    <dd>
                      <a className="fksm-link" href={s.website} target="_blank" rel="noopener noreferrer nofollow">
                        {s.website}
                      </a>
                    </dd>
                  </div>
                )}
                <div><dt>Students</dt><dd>{s.students}</dd></div>
                <div><dt>Classes</dt><dd>{s.classes} · <Link className="fksm-link" to={`/admin/academy/classes?school=${s._id}`}>see them</Link></dd></div>
                <div>
                  <dt>Proof document</dt>
                  <dd>
                    {s.proofUrl ? (
                      <a className="fksm-link" href={s.proofUrl} target="_blank" rel="noreferrer">
                        {s.proofFileName || "Open document"} <ExternalLink size={13} />
                      </a>
                    ) : (
                      "None uploaded"
                    )}
                  </dd>
                </div>
              </dl>
            </Card>

            {s.history?.length ? (
              <Card title="History" icon={<FileText size={18} />}>
                <ol className="fksm-timeline">
                  {s.history.map((h, i) => (
                    <li key={i}>
                      <span className="fksm-timeline__icon">
                        <Building2 size={16} />
                      </span>
                      <div>
                        <strong>{h.action}</strong>
                        <p>{h.byName ?? ""}</p>
                        {h.reason && <p>“{h.reason}”</p>}
                      </div>
                      <time dateTime={h.at}>{formatDateTime(h.at)}</time>
                    </li>
                  ))}
                </ol>
              </Card>
            ) : null}
          </div>

          <div className="fksm-stack">
            <Card title="Decision" icon={<ShieldCheck size={18} />}>
              {!canManage ? (
                <p className="fksm-muted">You can view schools but not approve them (needs “Manage Academy”).</p>
              ) : (
                <div className="fkac-actions">
                  {(s.status === "pending" || s.status === "rejected") && (
                    <button type="button" className="fksm-btn fksm-btn--primary fksm-btn--block" onClick={() => act("approve")}>
                      Approve
                    </button>
                  )}
                  {s.status === "pending" && (
                    <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--block" onClick={() => act("reject")}>
                      Reject
                    </button>
                  )}
                  {s.status !== "blocked" ? (
                    <button type="button" className="fksm-btn fksm-btn--danger fksm-btn--block" onClick={() => act("block")}>
                      Block
                    </button>
                  ) : (
                    <button type="button" className="fksm-btn fksm-btn--primary fksm-btn--block" onClick={() => act("unblock")}>
                      Unblock
                    </button>
                  )}
                </div>
              )}
            </Card>
            {s.domainBilling && (
              <SchoolBillingCard
                schoolId={s._id}
                billing={s.domainBilling}
                canManage={canManage}
                onChange={(b) => detail.setData({ ...s, domainBilling: b } as SchoolDetail)}
              />
            )}
            <Card title="Owner" icon={<UserRound size={18} />}>
              {s.owner ? (
                <dl className="fksm-facts">
                  <div><dt>Name</dt><dd>{s.owner.name}</dd></div>
                  <div><dt>Email</dt><dd>{s.owner.email}</dd></div>
                </dl>
              ) : (
                <p className="fksm-muted">Deleted account.</p>
              )}
            </Card>
            {s.teachers?.length ? (
              <Card title={`Teachers (${s.teachers.length})`} icon={<GraduationCap size={18} />}>
                <ul className="fkac-list">
                  {s.teachers.map((t) => (
                    <li key={t.key}>
                      <strong>{t.name}</strong>
                      <span>{[t.title, t.department].filter(Boolean).join(" · ")}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </div>
        </div>
      )}
      {confirm.element}
    </>
  );
}

/* ---------------------------------------------------------------- creators */

const CREATOR_STATUS: Record<CreatorStatus | "none", { label: string; tone: Tone }> = {
  pending: { label: "Waiting", tone: "amber" },
  approved: { label: "Approved", tone: "green" },
  rejected: { label: "Rejected", tone: "gray" },
  suspended: { label: "Suspended", tone: "red" },
  none: { label: "Never applied", tone: "gray" },
};

const CREATOR_TABS: Array<{ value: string; label: string }> = [
  { value: "pending", label: "Waiting" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
  { value: "all", label: "All" },
];

function CreatorsPage() {
  const navigate = useNavigate();
  const [status, set, params] = useParam("status", "pending");
  const q = params.get("q") ?? "";
  const page = Number(params.get("page")) || 1;
  const [draft, setDraft] = useState(q);
  const apiStatus = status === "all" ? undefined : status;
  const list = useAdminQuery(() => academyAdminApi.creators({ q, status: apiStatus, page }), [q, apiStatus, page]);

  return (
    <Card title="Creators" icon={<UserCheck size={20} />}>
      <p className="fksm-muted fkac-intro">
        People and businesses who asked to publish courses, classes, seminars and workshops on Fockis Academy. Nobody can create a class until you approve them here. Suspending a creator hides their own classes from the catalog. Approved schools don't need this — their owners and staff publish as the school.
      </p>
      <div className="fksm-tabs" role="tablist" aria-label="Status">
        {CREATOR_TABS.map((t) => (
          <button key={t.value} type="button" role="tab" aria-selected={status === t.value} className={status === t.value ? "is-active" : ""} onClick={() => set({ status: t.value })}>
            {t.label}
            {t.value !== "all" && list.data?.counts?.[t.value as CreatorStatus] !== undefined && <span className="fkac-count">{list.data.counts[t.value as CreatorStatus]}</span>}
          </button>
        ))}
      </div>
      <div className="fksm-filters">
        <form
          className="fksm-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            set({ q: draft.trim() });
          }}
        >
          <Search size={16} aria-hidden="true" />
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Name, business or email…" aria-label="Search creators" />
        </form>
      </div>
      {list.loading && !list.data ? (
        <SmLoading />
      ) : list.error ? (
        <SmError message={list.error} onRetry={list.refetch} />
      ) : !list.data?.items.length ? (
        <SmEmpty icon={<UserCheck size={24} />} title={status === "pending" ? "No creators waiting" : "No creators here"} />
      ) : (
        <>
          <div className="fksm-table-wrap">
            <table className="fksm-table fksm-table--cards">
              <thead>
                <tr>
                  <th>Creator</th>
                  <th>Teaches</th>
                  <th>Place</th>
                  <th>Classes</th>
                  <th>{status === "pending" ? "Applied" : "Reviewed"}</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((c) => (
                  <tr key={c.id} className="is-clickable" onClick={() => navigate(`/admin/academy/creators/${c.id}`)}>
                    <td>
                      <span className="fksm-subject">
                        <strong>{c.kind === "business" && c.businessName ? c.businessName : c.displayName}</strong>
                        <span>
                          {c.kind === "business" ? `Business · ${c.displayName}` : "Person"} · {c.email}
                        </span>
                      </span>
                    </td>
                    <td>{c.topics || "—"}</td>
                    <td>{[c.city, c.country].filter(Boolean).join(", ") || "—"}</td>
                    <td>{c.classes}</td>
                    <td>{timeAgo(status === "pending" ? c.appliedAt : c.reviewedAt ?? c.appliedAt)}</td>
                    <td>
                      <Pill tone={CREATOR_STATUS[c.status].tone}>{CREATOR_STATUS[c.status].label}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={list.data.page} hasMore={list.data.hasMore} total={list.data.total} onPage={(n) => set({ page: String(n) })} />
        </>
      )}
    </Card>
  );
}

function CreatorDetailPage() {
  const { id = "" } = useParams();
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const canManage = useCanManage();
  const confirm = useConfirm();
  const detail = useAdminQuery(() => academyAdminApi.creator(id), [id]);
  const c = detail.data;

  const act = (action: CreatorAction) => {
    const needsReason = action === "reject" || action === "suspend";
    const copy: Record<CreatorAction, { title: string; description: string; label: string; done: string }> = {
      approve: { title: "Approve this creator?", description: "They can create and publish courses, classes, seminars and workshops in Creator Studio.", label: "Approve", done: "Creator approved." },
      reject: { title: "Reject this application?", description: "They see your reason in Creator Studio. You can still approve them later.", label: "Reject", done: "Application rejected." },
      suspend: { title: "Suspend this creator?", description: "They can't create or edit classes, and their own classes leave the catalog. Learners already enrolled keep their records.", label: "Suspend", done: "Creator suspended." },
      unsuspend: { title: "Lift the suspension?", description: "They can teach again and their classes come back to the catalog (unless taken down separately).", label: "Lift suspension", done: "Suspension lifted." },
    };
    const t = copy[action];
    confirm.ask(
      { title: t.title, description: t.description, confirmLabel: t.label, tone: needsReason ? "danger" : "primary", reasonLabel: needsReason ? "Reason (the creator sees it)" : undefined },
      async (reason) => {
        detail.setData(await academyAdminApi.creatorStatus(id, action, reason));
        toast("success", t.done);
      },
    );
  };

  const p = c?.profile;
  return (
    <>
      <Link to="/admin/academy/creators" className="fksm-back">
        <ArrowLeft size={16} /> Back to creators
      </Link>
      {detail.loading && !c ? (
        <SmLoading />
      ) : detail.error || !c ? (
        <SmError message={detail.error ?? "Creator not found."} onRetry={detail.refetch} />
      ) : (
        <div className="fksm-detail">
          <div className="fksm-stack">
            <Card>
              <div className="fksm-detail-head">
                <div>
                  <h2>{p?.kind === "business" && p.businessName ? p.businessName : p?.displayName ?? c.name}</h2>
                  <div className="fksm-detail-head__meta">
                    <span>{p?.kind === "business" ? "Business" : "Person"}</span>
                    {c.appliedAt && <>·<span>Applied {formatDateTime(c.appliedAt)}</span></>}
                    {c.reviewedAt && <>·<span>Reviewed {formatDateTime(c.reviewedAt)}{c.reviewedBy ? ` by ${c.reviewedBy}` : ""}</span></>}
                  </div>
                </div>
                <Pill tone={CREATOR_STATUS[c.status].tone}>{CREATOR_STATUS[c.status].label}</Pill>
              </div>
              {c.reason && (c.status === "rejected" || c.status === "suspended") && (
                <p className="fksm-notice fksm-notice--error" style={{ marginTop: 12 }}>
                  Reason given: “{c.reason}”
                </p>
              )}
              {p ? (
                <>
                  <p className="fkac-summary" style={{ whiteSpace: "pre-line" }}>{p.about}</p>
                  <dl className="fksm-facts">
                    <div><dt>Name shown to learners</dt><dd>{p.displayName}</dd></div>
                    {p.businessName && <div><dt>Business</dt><dd>{p.businessName}</dd></div>}
                    {p.topics && <div><dt>Wants to teach</dt><dd>{p.topics}</dd></div>}
                    {(p.city || p.country) && <div><dt>Place</dt><dd>{[p.city, p.country].filter(Boolean).join(", ")}</dd></div>}
                    {p.phone && <div><dt>Phone</dt><dd>{p.phone}</dd></div>}
                    {p.website && (
                      <div>
                        <dt>Website</dt>
                        <dd>
                          <a className="fksm-link" href={p.website} target="_blank" rel="noopener noreferrer nofollow">{p.website}</a>
                        </dd>
                      </div>
                    )}
                    {p.sampleUrl && (
                      <div>
                        <dt>Sample of their work</dt>
                        <dd>
                          <a className="fksm-link" href={p.sampleUrl} target="_blank" rel="noopener noreferrer nofollow">
                            Open <ExternalLink size={13} />
                          </a>
                        </dd>
                      </div>
                    )}
                  </dl>
                  {p.experience && (
                    <>
                      <h3 className="fkac-subhead">Experience</h3>
                      <p className="fkac-summary" style={{ whiteSpace: "pre-line" }}>{p.experience}</p>
                    </>
                  )}
                </>
              ) : (
                <p className="fksm-muted" style={{ marginTop: 12 }}>This account hasn't filled in a creator application.</p>
              )}
            </Card>

            <Card title={`Classes (${c.classes.length})`} icon={<BookOpen size={18} />}>
              {c.classes.length ? (
                <ul className="fkac-list">
                  {c.classes.map((k) => {
                    const st = k.status === "creator_blocked" ? { label: "Hidden (creator suspended)", tone: "red" as Tone } : CLASS_STATUS[k.status];
                    return (
                      <li key={k.code}>
                        <Link className="fksm-link" to={`/admin/academy/classes/${encodeURIComponent(k.code)}`}>{k.name}</Link>
                        <span>
                          {KIND[k.kind]?.label ?? "Course"} · {priceText(k)}
                          {k.school ? " · offered by a school" : ""}
                        </span>
                        <Pill tone={st.tone}>{st.label}</Pill>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="fksm-muted">No classes yet.</p>
              )}
            </Card>

            {c.history.length ? (
              <Card title="History" icon={<FileText size={18} />}>
                <ol className="fksm-timeline">
                  {c.history.map((h, i) => (
                    <li key={i}>
                      <span className="fksm-timeline__icon">
                        <UserCheck size={16} />
                      </span>
                      <div>
                        <strong>{h.action}</strong>
                        <p>{h.byName ?? ""}</p>
                        {h.reason && <p>“{h.reason}”</p>}
                      </div>
                      <time dateTime={h.at}>{formatDateTime(h.at)}</time>
                    </li>
                  ))}
                </ol>
              </Card>
            ) : null}
          </div>

          <div className="fksm-stack">
            <Card title="Decision" icon={<ShieldCheck size={18} />}>
              {!canManage ? (
                <p className="fksm-muted">You can view creators but not approve them (needs “Manage Academy”).</p>
              ) : c.status === "none" ? (
                <p className="fksm-muted">Nothing to decide — they haven't applied.</p>
              ) : (
                <div className="fkac-actions">
                  {(c.status === "pending" || c.status === "rejected") && (
                    <button type="button" className="fksm-btn fksm-btn--primary fksm-btn--block" onClick={() => act("approve")}>
                      Approve
                    </button>
                  )}
                  {c.status === "pending" && (
                    <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--block" onClick={() => act("reject")}>
                      Reject
                    </button>
                  )}
                  {c.status === "approved" && (
                    <button type="button" className="fksm-btn fksm-btn--danger fksm-btn--block" onClick={() => act("suspend")}>
                      Suspend
                    </button>
                  )}
                  {c.status === "suspended" && (
                    <button type="button" className="fksm-btn fksm-btn--primary fksm-btn--block" onClick={() => act("unsuspend")}>
                      Lift suspension
                    </button>
                  )}
                </div>
              )}
            </Card>
            <Card title="Account" icon={<UserRound size={18} />}>
              <dl className="fksm-facts">
                <div><dt>Name</dt><dd>{c.name}</dd></div>
                <div><dt>Email</dt><dd>{c.email}</dd></div>
                <div><dt>Role</dt><dd>{ROLE_LABEL[c.role] ?? c.role}</dd></div>
                <div><dt>Academy sign-in</dt><dd>{c.active ? "Active" : "Suspended"}</dd></div>
                {c.memberSince && <div><dt>Member since</dt><dd>{formatDateTime(c.memberSince)}</dd></div>}
              </dl>
            </Card>
          </div>
        </div>
      )}
      {confirm.element}
    </>
  );
}

/* ---------------------------------------------------------------- domain fees */

const BILLING_STATE: Record<DomainBillingState, { label: string; tone: Tone }> = {
  free: { label: "Free", tone: "gray" },
  exempt: { label: "Exempt", tone: "purple" },
  paid: { label: "Paid (one-time)", tone: "green" },
  active: { label: "Paid", tone: "green" },
  grace: { label: "Payment due", tone: "amber" },
  unpaid: { label: "Not paid", tone: "red" },
  expired: { label: "Expired", tone: "red" },
  not_approved: { label: "In review", tone: "gray" },
};

const periodText = (m: number) => (m === 0 ? "one-time" : m === 1 ? "per month" : m === 12 ? "per year" : m % 12 === 0 ? `per ${m / 12} years` : `per ${m} months`);
const dateOnly = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—");

function BillingPill({ state, until }: { state: DomainBillingState; until?: string | null }) {
  const b = BILLING_STATE[state];
  return (
    <span className="fkac-billpill">
      <Pill tone={b.tone}>{b.label}</Pill>
      {state === "active" && until && <small>until {dateOnly(until)}</small>}
    </span>
  );
}

function SchoolBillingCard({ schoolId, billing, canManage, onChange }: { schoolId: string; billing: SchoolBilling; canManage: boolean; onChange: (b: SchoolBilling) => void }) {
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const confirm = useConfirm();
  const [recording, setRecording] = useState(false);
  const defaultUntil = () => {
    const base = billing.paidUntil && new Date(billing.paidUntil) > new Date() ? new Date(billing.paidUntil) : new Date();
    base.setMonth(base.getMonth() + (billing.periodMonths || 12));
    return base.toISOString().slice(0, 10);
  };
  const [until, setUntil] = useState(defaultUntil);
  const [amount, setAmount] = useState(String(billing.price || ""));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const b = BILLING_STATE[billing.state];

  const ask = (action: "exempt" | "unexempt" | "clear_paid") => {
    const copy = {
      exempt: { title: "Let this organization use its domain for free?", description: "It won't be asked to pay until you remove the exemption.", label: "Exempt", reason: "Why (kept in the history)" },
      unexempt: { title: "Remove the exemption?", description: "It will need a paid period again. If none, its domain pauses.", label: "Remove exemption", reason: undefined },
      clear_paid: { title: "Clear the paid period?", description: "Use this to undo a payment recorded by mistake. The domain pauses if nothing else covers it.", label: "Clear", reason: "Why (kept in the history)" },
    }[action];
    confirm.ask({ title: copy.title, description: copy.description, confirmLabel: copy.label, tone: action === "exempt" ? "primary" : "danger", reasonLabel: copy.reason }, async (reason) => {
      onChange(await academyAdminApi.schoolBilling(schoolId, { action, note: reason }));
      toast("success", "Domain fee updated.");
    });
  };

  async function record() {
    setBusy(true);
    setError(null);
    try {
      onChange(await academyAdminApi.schoolBilling(schoolId, { action: "set_paid_until", until: new Date(`${until}T23:59:59`).toISOString(), amount: amount === "" ? undefined : Number(amount), note: note.trim() || undefined }));
      toast("success", "Payment recorded.");
      setRecording(false);
      setNote("");
    } catch (e) {
      setError(adminError(e));
    } finally {
      setBusy(false);
    }
  }

  const payments = billing.entries.filter((e) => e.method === "stripe" || e.method === "manual");
  return (
    <Card title="Domain fee" icon={<Wallet size={18} />}>
      <div className="fkac-billhead">
        <Pill tone={b.tone}>{b.label}</Pill>
        {billing.price > 0 && billing.state !== "free" && (
          <span>
            {money(billing.price, billing.currency)} {periodText(billing.periodMonths)}
          </span>
        )}
      </div>
      <dl className="fksm-facts">
        {billing.paidUntil && <div><dt>Paid until</dt><dd>{dateOnly(billing.paidUntil)}</dd></div>}
        {billing.graceEndsAt && <div><dt>{billing.state === "expired" ? "Paused since" : "Pauses on"}</dt><dd>{dateOnly(billing.graceEndsAt)}</dd></div>}
        {billing.exempt && <div><dt>Exempt because</dt><dd>{billing.exemptReason || "—"}</dd></div>}
      </dl>
      {billing.state === "free" && (
        <p className="fksm-muted fkac-small">
          Charging is off, or this organization type is free. Change it in{" "}
          <Link className="fksm-link" to="/admin/domains/pricing">
            Domains → Pricing
          </Link>
          .
        </p>
      )}
      {(billing.state === "unpaid" || billing.state === "expired") && (
        <p className="fksm-notice fksm-notice--warn fkac-small">Paused: its classes are hidden from the catalog, nobody new can join them, and it can't add students or classes until it pays.</p>
      )}

      {canManage && billing.state !== "not_approved" && (
        <div className="fkac-actions" style={{ marginTop: 10 }}>
          {!recording ? (
            <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--block" onClick={() => { setUntil(defaultUntil()); setAmount(String(billing.price || "")); setRecording(true); }}>
              Record a cash / bank payment
            </button>
          ) : (
            <div className="fkac-record">
              <label className="fksm-field">
                <span>Paid until</span>
                <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
              </label>
              <label className="fksm-field">
                <span>Amount received ({billing.currency})</span>
                <input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </label>
              <label className="fksm-field">
                <span>Note</span>
                <input value={note} maxLength={500} placeholder="e.g. MonCash receipt #1234" onChange={(e) => setNote(e.target.value)} />
              </label>
              {error && <p className="fksm-notice fksm-notice--error">{error}</p>}
              <div className="fkac-savebar">
                <button type="button" className="fksm-btn fksm-btn--secondary" disabled={busy} onClick={() => setRecording(false)}>
                  Cancel
                </button>
                <button type="button" className="fksm-btn fksm-btn--primary" disabled={busy || !until} onClick={record}>
                  {busy ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          )}
          {billing.exempt ? (
            <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--block" onClick={() => ask("unexempt")}>
              Remove exemption
            </button>
          ) : (
            <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--block" onClick={() => ask("exempt")}>
              Exempt from the fee
            </button>
          )}
          {(billing.paidUntil || billing.paidForever) && (
            <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--block" onClick={() => ask("clear_paid")}>
              Clear paid period
            </button>
          )}
        </div>
      )}

      {payments.length > 0 && (
        <>
          <h3 className="fkac-subhead" style={{ marginTop: 18 }}>Payments</h3>
          <ul className="fkac-list fkac-paylist">
            {payments.map((e, i) => (
              <li key={i}>
                <strong>{e.amount !== undefined ? money(e.amount, e.currency || billing.currency) : "—"}</strong>
                <span>
                  {e.method === "stripe" ? "Card (Stripe)" : "Recorded by admin"}
                  {e.to ? ` · to ${dateOnly(e.to)}` : e.method === "stripe" ? " · lifetime" : ""}
                  {e.note ? ` · ${e.note}` : ""}
                </span>
                <time>{dateOnly(e.at)}</time>
              </li>
            ))}
          </ul>
        </>
      )}
      {confirm.element}
    </Card>
  );
}

/* ---------------------------------------------------------------- certificates */

function CertificatesPage() {
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const canManage = useCanManage();
  const confirm = useConfirm();
  const [status, set, params] = useParam("status");
  const q = params.get("q") ?? "";
  const page = Number(params.get("page")) || 1;
  const [draft, setDraft] = useState(q);
  const list = useAdminQuery(() => academyAdminApi.certificates({ q, status, page }), [q, status, page]);

  return (
    <Card title="Certificates" icon={<Award size={20} />}>
      <p className="fksm-muted fkac-intro">Every certificate issued on Fockis Academy. Search by certificate number, verification code, enrollment number, name or class. A revoked certificate shows as revoked to anyone who scans or checks it.</p>
      <div className="fksm-tabs" role="tablist" aria-label="Status">
        {[
          { v: "", l: "All" },
          { v: "valid", l: "Valid" },
          { v: "revoked", l: "Revoked" },
        ].map((t) => (
          <button key={t.v || "all"} type="button" role="tab" aria-selected={status === t.v} className={status === t.v ? "is-active" : ""} onClick={() => set({ status: t.v })}>
            {t.l}
          </button>
        ))}
      </div>
      <div className="fksm-filters">
        <form
          className="fksm-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            set({ q: draft.trim() });
          }}
        >
          <Search size={16} aria-hidden="true" />
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="FA-2026-…, verification code, name, class…" aria-label="Search certificates" />
        </form>
      </div>
      {list.loading && !list.data ? (
        <SmLoading />
      ) : list.error ? (
        <SmError message={list.error} onRetry={list.refetch} />
      ) : !list.data?.items.length ? (
        <SmEmpty icon={<Award size={24} />} title="No certificates found" />
      ) : (
        <>
          <div className="fksm-table-wrap">
            <table className="fksm-table fksm-table--cards">
              <thead>
                <tr>
                  <th>Certificate</th>
                  <th>Recipient</th>
                  <th>Class / seminar</th>
                  <th>Issued</th>
                  <th>Status</th>
                  {canManage && <th aria-label="Actions" />}
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className="fksm-subject">
                        <strong>{c.certificateNumber}</strong>
                        <span>
                          <a className="fksm-link" href={`/academy/verify/${encodeURIComponent(c.verificationId)}`} target="_blank" rel="noreferrer">
                            {c.verificationId}
                          </a>
                        </span>
                      </span>
                    </td>
                    <td>
                      <span className="fksm-subject">
                        <strong>{c.recipientName}</strong>
                        <span>{c.recipientEmail}</span>
                      </span>
                    </td>
                    <td>
                      <span className="fksm-subject">
                        <strong>{c.activityName}</strong>
                        <span>
                          {c.institutionName} · {c.instructorName}
                        </span>
                      </span>
                    </td>
                    <td className="fksm-date">{formatDateTime(c.issuedAt)}</td>
                    <td>
                      <Pill tone={c.status === "valid" ? "green" : "red"}>{c.status === "valid" ? "Valid" : "Revoked"}</Pill>
                      {c.status === "revoked" && c.lastChange?.reason && <span className="fksm-muted fkac-small"> “{c.lastChange.reason}”</span>}
                    </td>
                    {canManage && (
                      <td>
                        {c.status === "valid" ? (
                          <button
                            type="button"
                            className="fksm-btn fksm-btn--danger fksm-btn--sm"
                            onClick={() =>
                              confirm.ask(
                                {
                                  title: `Revoke ${c.certificateNumber}?`,
                                  description: `${c.recipientName}'s certificate for “${c.activityName}” will show as revoked to anyone who checks it.`,
                                  confirmLabel: "Revoke",
                                  tone: "danger",
                                  reasonLabel: "Reason (shown on the verification page history)",
                                },
                                async (reason) => {
                                  await academyAdminApi.revokeCertificate(c.id, reason);
                                  toast("success", "Certificate revoked.");
                                  void list.refetch();
                                },
                              )
                            }
                          >
                            Revoke
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="fksm-btn fksm-btn--secondary fksm-btn--sm"
                            onClick={() =>
                              confirm.ask({ title: `Restore ${c.certificateNumber}?`, description: "It becomes valid again.", confirmLabel: "Restore", tone: "primary" }, async () => {
                                await academyAdminApi.restoreCertificate(c.id);
                                toast("success", "Certificate restored.");
                                void list.refetch();
                              })
                            }
                          >
                            Restore
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={list.data.page} hasMore={list.data.hasMore} total={list.data.total} onPage={(n) => set({ page: String(n) })} />
        </>
      )}
      {confirm.element}
    </Card>
  );
}

/* ---------------------------------------------------------------- accounts */

const ROLE_LABEL: Record<string, string> = { student: "Learner", instructor: "Creator / instructor", administrator: "Academy admin", staff: "Academy staff" };

function AccountsPage() {
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const canManage = useCanManage();
  const confirm = useConfirm();
  const [status, set, params] = useParam("status");
  const q = params.get("q") ?? "";
  const role = params.get("role") ?? "";
  const page = Number(params.get("page")) || 1;
  const [draft, setDraft] = useState(q);
  const list = useAdminQuery(() => academyAdminApi.accounts({ q, role, status, page }), [q, role, status, page]);

  return (
    <Card title="Academy accounts" icon={<Users size={20} />}>
      <p className="fksm-muted fkac-intro">Learners, creators and school student logins on Fockis Academy (separate from main Fockis accounts). A suspended account can't sign in to Academy; it sees your reason.</p>
      <div className="fksm-tabs" role="tablist" aria-label="Status">
        {[
          { v: "", l: "All" },
          { v: "active", l: "Active" },
          { v: "suspended", l: "Suspended" },
          { v: "school", l: "School logins" },
        ].map((t) => (
          <button key={t.v || "all"} type="button" role="tab" aria-selected={status === t.v} className={status === t.v ? "is-active" : ""} onClick={() => set({ status: t.v })}>
            {t.l}
          </button>
        ))}
      </div>
      <div className="fksm-filters">
        <form
          className="fksm-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            set({ q: draft.trim() });
          }}
        >
          <Search size={16} aria-hidden="true" />
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Name or email…" aria-label="Search accounts" />
        </form>
        <select className="fksm-select" value={role} onChange={(e) => set({ role: e.target.value })} aria-label="Role">
          <option value="">All roles</option>
          {Object.entries(ROLE_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      {list.loading && !list.data ? (
        <SmLoading />
      ) : list.error ? (
        <SmError message={list.error} onRetry={list.refetch} />
      ) : !list.data?.items.length ? (
        <SmEmpty icon={<Users size={24} />} title="No accounts found" />
      ) : (
        <>
          <div className="fksm-table-wrap">
            <table className="fksm-table fksm-table--cards">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Role</th>
                  <th>Classes created</th>
                  <th>Enrolled in</th>
                  <th>Joined</th>
                  <th>Status</th>
                  {canManage && <th aria-label="Actions" />}
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <span className="fksm-subject">
                        <strong>{u.name}</strong>
                        <span>{u.email}</span>
                      </span>
                    </td>
                    <td>
                      {ROLE_LABEL[u.role] ?? u.role}
                      {u.school && <span className="fksm-muted fkac-small"> · {u.school.name}</span>}
                    </td>
                    <td>{u.classesCreated}</td>
                    <td>{u.enrollments}</td>
                    <td className="fksm-date">{timeAgo(u.createdAt)}</td>
                    <td>
                      <Pill tone={u.active ? "green" : "red"}>{u.active ? "Active" : "Suspended"}</Pill>
                      {!u.active && u.suspendedReason && <span className="fksm-muted fkac-small"> “{u.suspendedReason}”</span>}
                    </td>
                    {canManage && (
                      <td>
                        {u.active ? (
                          u.role !== "administrator" && (
                            <button
                              type="button"
                              className="fksm-btn fksm-btn--danger fksm-btn--sm"
                              onClick={() =>
                                confirm.ask(
                                  {
                                    title: `Suspend ${u.name}?`,
                                    description: "They're signed out of Academy and can't sign in until reactivated. Their classes stay as they are — take a class down separately if needed.",
                                    confirmLabel: "Suspend",
                                    tone: "danger",
                                    reasonLabel: "Reason (they see it when signing in)",
                                  },
                                  async (reason) => {
                                    await academyAdminApi.suspendAccount(u.id, reason);
                                    toast("success", "Account suspended.");
                                    void list.refetch();
                                  },
                                )
                              }
                            >
                              Suspend
                            </button>
                          )
                        ) : (
                          <button
                            type="button"
                            className="fksm-btn fksm-btn--secondary fksm-btn--sm"
                            onClick={() =>
                              confirm.ask({ title: `Reactivate ${u.name}?`, description: "They can sign in to Academy again.", confirmLabel: "Reactivate", tone: "primary" }, async () => {
                                await academyAdminApi.reactivateAccount(u.id);
                                toast("success", "Account reactivated.");
                                void list.refetch();
                              })
                            }
                          >
                            Reactivate
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={list.data.page} hasMore={list.data.hasMore} total={list.data.total} onPage={(n) => set({ page: String(n) })} />
        </>
      )}
      {confirm.element}
    </Card>
  );
}

/* ---------------------------------------------------------------- routes */

export default function AcademyAdminCenterRoutes() {
  return (
    <Shell>
      <Routes>
        <Route index element={<OverviewPage />} />
        <Route path="classes" element={<ClassesPage />} />
        <Route path="classes/:code" element={<ClassDetailPage />} />
        <Route path="creators" element={<CreatorsPage />} />
        <Route path="creators/:id" element={<CreatorDetailPage />} />
        <Route path="schools" element={<SchoolsPage />} />
        <Route path="schools/:id" element={<SchoolDetailPage />} />
        {/* Domain prices moved to Admin → Domains → Pricing (one list for every Fockis domain). */}
        <Route path="domain-pricing" element={<Navigate to="/admin/domains/pricing" replace />} />
        <Route path="certificates" element={<CertificatesPage />} />
        <Route path="learners" element={<AccountsPage />} />
      </Routes>
    </Shell>
  );
}
