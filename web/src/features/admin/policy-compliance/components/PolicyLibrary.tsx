import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Archive, ExternalLink, Eye, FileText, History, MoreHorizontal, Pencil, Plus, Search, Undo2 } from "lucide-react";

import { adminError } from "../../support/supportAdminApi";
import { Pager, SmEmpty, SmError, SmLoading, useAdminQuery, useConfirm } from "../../support/components/SmParts";
import { useAdminAccess } from "../../permissions/adminAccess";
import { PERMISSIONS } from "../../permissions/permission.constants";
import { useAdminNotificationStore } from "../../store/adminNotificationStore";
import { CATEGORIES, STATUSES, policyAdminApi, type PolicySummary } from "../policyAdminApi";
import { CategoryPill, StatusPill, policyIcon } from "./PolicyParts";

const P = PERMISSIONS;
const BASE = "/admin/policy-compliance";

function shortDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function RowMenu({ policy, onChanged }: { policy: PolicySummary; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const { can } = useAdminAccess();
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const confirm = useConfirm();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  const archive = () => {
    setOpen(false);
    confirm.ask(
      { title: `Archive ${policy.title}?`, description: "Archived policies are hidden from members. Their versions and acceptance records are kept, and you can restore the policy later.", confirmLabel: "Archive policy", tone: "danger", reasonLabel: "Reason" },
      async (reason) => {
        await policyAdminApi.archive(policy.id, reason);
        toast("success", `${policy.title} archived.`);
        onChanged();
      },
    );
  };

  const unarchive = async () => {
    setOpen(false);
    try {
      await policyAdminApi.unarchive(policy.id);
      toast("success", `${policy.title} restored.`);
      onChanged();
    } catch (e) {
      toast("error", adminError(e));
    }
  };

  return (
    <div className="fkpc-menu" ref={ref}>
      <button type="button" className="fksm-icon-btn" aria-label={`More actions for ${policy.title}`} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="fkpc-menu__list" role="menu">
          <button type="button" role="menuitem" onClick={() => navigate(`${BASE}/versions?policyId=${policy.id}`)}>
            <History size={16} /> Manage versions
          </button>
          {policy.status === "published" && (
            <a role="menuitem" href={`/policies/${policy.slug}`} target="_blank" rel="noreferrer">
              <ExternalLink size={16} /> View public page
            </a>
          )}
          {can([P.POLICY_PUBLISH]) &&
            (policy.status === "archived" ? (
              <button type="button" role="menuitem" onClick={() => void unarchive()}>
                <Undo2 size={16} /> Restore policy
              </button>
            ) : (
              <button type="button" role="menuitem" className="is-danger" onClick={archive}>
                <Archive size={16} /> Archive
              </button>
            ))}
        </div>
      )}
      {confirm.element}
    </div>
  );
}

export default function PolicyLibrary({ compact = false }: { compact?: boolean }) {
  const { can } = useAdminAccess();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [params] = useSearchParams();
  const [category, setCategory] = useState(params.get("category") || "all");
  const [status, setStatus] = useState(params.get("status") || "all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const { data, loading, error, refetch } = useAdminQuery(() => policyAdminApi.list({ search: query, category, status, page }), [query, category, status, page]);

  return (
    <section className="fksm-card fkpc-library" aria-labelledby="pc-library">
      <div className="fksm-card__head">
        <h2 id="pc-library">
          <FileText size={24} aria-hidden /> Policy Library
        </h2>
        {can([P.POLICY_EDIT]) && (
          <Link to={`${BASE}/policies/new`} className="fksm-btn fksm-btn--primary">
            <Plus size={17} aria-hidden /> Create Policy
          </Link>
        )}
      </div>

      <div className="fkpc-filters">
        <label className="fksm-search fkpc-filters__search">
          <Search size={17} aria-hidden />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search policies..." aria-label="Search policies" />
        </label>
        <select className="fksm-select" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} aria-label="Category">
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select className="fksm-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Status">
          <option value="all">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {loading && !data ? (
        <SmLoading label="Loading policies…" />
      ) : error && !data ? (
        <SmError message={error} onRetry={() => void refetch()} />
      ) : !data?.items.length ? (
        <SmEmpty icon={<FileText size={22} />} title={data?.all ? "No policies match" : "No policies yet"} text={data?.all ? "Try a different search or filter." : "Create the first policy to get started."} />
      ) : (
        <>
          <div className="fksm-table-wrap">
            <table className="fksm-table fkpc-table">
              <thead>
                <tr>
                  <th>Policy</th>
                  <th>Category</th>
                  <th>Current Version</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th className="fkpc-table__actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => {
                  const { icon: Icon, tone } = policyIcon(p.slug, p.category);
                  const shownStatus = p.status === "published" && p.working?.status === "scheduled" ? "scheduled" : p.status;
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="fkpc-policy">
                          <span className={`fkpc-policy__icon fkpc-policy__icon--${tone}`}>
                            <Icon size={19} aria-hidden />
                          </span>
                          <span className="fkpc-policy__text">
                            <Link to={`${BASE}/policies/${p.id}`}>{p.title}</Link>
                            <small>{p.description}</small>
                          </span>
                        </div>
                      </td>
                      <td>
                        <CategoryPill category={p.category} />
                      </td>
                      <td className="fkpc-version">
                        {p.publishedVersion ? `v${p.publishedVersion}` : p.working ? `v${p.working.version}` : "—"}
                        {p.publishedVersion && p.working && <small>v{p.working.version} in progress</small>}
                      </td>
                      <td>
                        <StatusPill status={shownStatus} />
                      </td>
                      <td className="fkpc-updated">
                        {shownStatus === "scheduled" && p.working?.scheduledFor ? shortDate(p.working.scheduledFor) : shortDate(p.updatedAt)}
                        {p.updatedBy?.username && shownStatus !== "scheduled" && <small>by {p.updatedBy.username}</small>}
                      </td>
                      <td className="fkpc-table__actions">
                        <div className="fkpc-row-actions">
                          <button type="button" className="fksm-icon-btn" aria-label={`View ${p.title}`} title="View" onClick={() => navigate(`${BASE}/policies/${p.id}?tab=preview`)}>
                            <Eye size={18} />
                          </button>
                          {can([P.POLICY_EDIT]) && (
                            <button type="button" className="fksm-icon-btn" aria-label={`Edit ${p.title}`} title="Edit" onClick={() => navigate(`${BASE}/policies/${p.id}`)}>
                              <Pencil size={17} />
                            </button>
                          )}
                          <RowMenu policy={p} onChanged={() => void refetch()} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!compact || data.hasMore || page > 1 ? <Pager page={page} hasMore={data.hasMore} total={data.total} onPage={setPage} /> : null}
        </>
      )}
    </section>
  );
}
