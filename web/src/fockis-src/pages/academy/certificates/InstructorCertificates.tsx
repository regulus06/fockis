import { useEffect, useMemo, useRef, useState } from "react";
import { academyToken } from "../../../lib/academySession";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "../../../components/academy/market/Icon";
import { Badge, DashShell, Stat, type SideItem } from "../../../components/academy/market/Shared";
import { FaModal, StateLine } from "../../../components/academy/market/FaBlocks";
import CertificateCanvas, { printCertificate } from "../../../components/academy/certificates/CertificateCanvas";
import { SAMPLE_DATA, TEMPLATES } from "../../../components/academy/certificates/certificateDesign";
import { useAcademyLoad } from "../../../lib/useAcademyLoad";
import { useAcademyToast } from "../../../lib/academyToastStore";
import { getEvents, getMe } from "../../../lib/academyApi";
import { getMyCourses, shortDate } from "../../../lib/academyLearnApi";
import { creatorApi, studioApi } from "../../../lib/studioApi";
import { linksAreLocalOnly, publicSiteUrl } from "../../../lib/siteUrl";
import { STUDIO_NAV } from "../studio/CreatorStudio";
import {
  certData,
  deleteTemplate,
  duplicateTemplate,
  getRoster,
  issueCertificates,
  listIssued,
  listTemplates,
  restoreCertificate,
  revokeCertificate,
  verificationUrl,
  type IssuedCert,
  type RosterStudent,
} from "../../../lib/certificatesApi";
import "../../../styles/academy-market.scss";

/**
 * /academy/instructor/certificates — Certificate Management.
 *   Templates: saved designs (edit, duplicate, delete) + start from a Fockis template
 *   Issue:     after a course (enrolled students who completed it) or a seminar/workshop (attendee list)
 *   Issued:    every certificate with its number, status, revoke/restore, PDF, verification link
 */

type Tab = "templates" | "issue" | "issued";
const TEACHING = ["instructor", "staff", "administrator"];

const NAV: SideItem[] = [
  { label: "Overview", icon: "grid", to: "/academy/instructor" },
  { label: "My Courses", icon: "book", to: "/academy/instructor/courses" },
  { label: "Students", icon: "users", to: "/academy/instructor/students" },
  { label: "Certificates", icon: "award", to: "/academy/instructor/certificates" },
  { label: "Certificate Designer", icon: "palette", to: "/academy/instructor/certificates/designer" },
  { label: "Seminars & Events", icon: "mic", to: "/academy/calendar" },
  { label: "Academy Home", icon: "home", to: "/academy" },
];

function ViewModal({ cert, onClose }: { cert: IssuedCert; onClose: () => void }) {
  const ref = useRef<SVGSVGElement>(null);
  return (
    <FaModal title={`Certificate ${cert.certificateNumber}`} onClose={onClose}>
      <div className="fa-cert-view">
        <CertificateCanvas ref={ref} design={cert.design} data={certData(cert)} watermark={cert.status === "revoked" ? "REVOKED" : undefined} />
      </div>
      <div className="fa-builder__foot">
        <button className="fa-btn fa-btn--outline fa-btn--sm" onClick={() => window.open(verificationUrl(cert.verificationId), "_blank", "noopener")}>
          <Icon name="shield" size={14} /> Verification page
        </button>
        <button className="fa-btn fa-btn--primary fa-btn--sm" onClick={() => printCertificate(ref.current, cert.design.orientation, cert.certificateNumber)}>
          <Icon name="download" size={14} /> Download PDF
        </button>
      </div>
    </FaModal>
  );
}

export default function InstructorCertificates() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useAcademyToast((s) => s.showToast);
  const hasToken = !!academyToken();
  const me = useAcademyLoad(() => (hasToken ? getMe() : Promise.reject(new Error("not-signed-in"))), [hasToken]);
  // People allowed to teach (Academy instructors/staff, creators approved by
  // Fockis, staff of an approved school) certify their own classes; campus
  // seminars/workshops stay with Academy teaching staff.
  const access = useAcademyLoad(() => (me.state.status === "ready" ? creatorApi.access() : Promise.resolve(null)), [me.state.status]);
  const ok =
    me.state.status === "ready" &&
    access.state.status === "ready" &&
    !!access.state.data &&
    (access.state.data.canTeach || access.state.data.schoolIds.length > 0);
  const teacher = ok && me.state.status === "ready" && TEACHING.includes(String(me.state.data.role));
  const templates = useAcademyLoad(() => (ok ? listTemplates() : Promise.resolve([])), [ok]);
  const issued = useAcademyLoad(() => (ok ? listIssued() : Promise.resolve([] as IssuedCert[])), [ok]);
  const courses = useAcademyLoad(
    () => (!ok ? Promise.resolve([]) : teacher ? getMyCourses() : studioApi.mine().then((list) => list as unknown as Awaited<ReturnType<typeof getMyCourses>>)),
    [ok, teacher],
  );
  const events = useAcademyLoad(() => (teacher ? getEvents() : Promise.resolve([])), [teacher]);

  const [tab, setTab] = useState<Tab>(params.get("issue") ? "issue" : "templates");
  const [viewing, setViewing] = useState<IssuedCert | null>(null);
  const [revoking, setRevoking] = useState<IssuedCert | null>(null);
  const [reason, setReason] = useState("");
  const [q, setQ] = useState("");

  // ----- issue form
  const [tplId, setTplId] = useState(params.get("issue") ?? "");
  const [type, setType] = useState<"course" | "seminar" | "workshop">("course");
  const [ref, setRef] = useState("");
  const [roster, setRoster] = useState<RosterStudent[] | null>(null);
  const [rosterErr, setRosterErr] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [attendees, setAttendees] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [duration, setDuration] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ issued: IssuedCert[]; skipped: string[] } | null>(null);
  const [rosterKey, setRosterKey] = useState(0);

  const tplList = templates.state.status === "ready" ? templates.state.data : [];
  useEffect(() => {
    if (!tplId && tplList.length) setTplId(tplList[0]._id);
  }, [tplList, tplId]);
  const tpl = tplList.find((t) => t._id === tplId);

  useEffect(() => {
    setRoster(null);
    setRosterErr(null);
    setPicked(new Set());
    if (type !== "course" || !ref) return;
    getRoster(ref)
      .then((r) => {
        setRoster(r.students);
        setPicked(new Set(r.students.filter((s) => s.eligible && !s.certificateNumber).map((s) => s.enrollmentId)));
      })
      .catch((e) => setRosterErr(e instanceof Error ? e.message : "Could not load students"));
  }, [type, ref, rosterKey]);

  const pastEvents = useMemo(
    () =>
      events.state.status === "ready"
        ? events.state.data
            .filter((e) => {
              const t = new Date(e.startDate || e.date || "").getTime();
              return !Number.isNaN(t) && t <= Date.now();
            })
            .sort((a, b) => new Date(b.startDate || b.date || "").getTime() - new Date(a.startDate || a.date || "").getTime())
        : [],
    [events.state],
  );

  const parsedAttendees = attendees
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [name, email] = l.split(/[,;\t]/).map((x) => x.trim());
      return { name, email: email || undefined };
    });

  const activityName = type === "course" ? (courses.state.status === "ready" ? courses.state.data.find((c) => c.code === ref)?.name : "") : pastEvents.find((e) => String(e._id || e.id) === ref)?.title;
  const previewName = type === "course" ? roster?.find((s) => picked.has(s.enrollmentId))?.name : parsedAttendees[0]?.name;

  async function issue() {
    if (!tpl) return toast("Choose a template first.");
    if (!ref) return toast(type === "course" ? "Choose a course." : "Choose the seminar or workshop.");
    const recipients = type === "course" ? [...picked].map((enrollmentId) => ({ enrollmentId })) : parsedAttendees.map((a) => ({ name: a.name, email: a.email }));
    if (!recipients.length) return toast(type === "course" ? "Select at least one student." : "Add at least one attendee.");
    const bad = type !== "course" && parsedAttendees.find((a) => a.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email));
    if (bad) return toast(`Check the email for ${bad.name}.`);
    setBusy(true);
    setResult(null);
    try {
      const r = await issueCertificates({ templateId: tpl._id, activityType: type, activityRef: ref, activityName: activityName || undefined, completionDate: date, duration: duration || undefined, recipients });
      setResult(r);
      toast(`${r.issued.length} certificate${r.issued.length === 1 ? "" : "s"} issued`);
      issued.reload();
      if (type === "course") setRosterKey((k) => k + 1);
      else setAttendees("");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not issue certificates");
    } finally {
      setBusy(false);
    }
  }

  // ----- gates
  if (!hasToken || (me.state.status === "error" && /not-signed-in|401|unauthor/i.test(me.state.error)))
    return (
      <div className="fa-root fa-page fa-page--soft">
        <div className="fa-container fa-narrow">
          <div className="fa-card fa-gate">
            <h2>Certificates</h2>
            <p className="fa-muted">Sign in with your instructor account.</p>
            <Link className="fa-btn fa-btn--primary" to="/academy/login">Sign in to Academy</Link>
          </div>
        </div>
      </div>
    );
  if (me.state.status === "loading" || (me.state.status === "ready" && access.state.status === "loading"))
    return <div className="fa-root fa-page fa-page--soft" />;
  if (me.state.status === "ready" && !ok)
    return (
      <div className="fa-root fa-page fa-page--soft">
        <div className="fa-container fa-narrow">
          <div className="fa-card fa-gate">
            <h2>Certificates</h2>
            <p className="fa-muted">Only approved instructors can issue certificates.</p>
            <Link className="fa-btn fa-btn--primary" to="/academy/teach/apply">Apply to teach</Link>
          </div>
        </div>
      </div>
    );

  const certs = issued.state.status === "ready" ? issued.state.data : [];
  const shown = certs.filter((c) => `${c.certificateNumber} ${c.recipientName} ${c.recipientEmail ?? ""} ${c.activityName} ${c.enrollmentNumber ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()));
  const valid = certs.filter((c) => c.status === "valid").length;

  return (
    <div className="fa-root">
      <DashShell items={teacher ? NAV : STUDIO_NAV} active="Certificates" sub={teacher ? "Instructor" : "Creator Studio"}>
        <div className="fa-dhead">
          <div>
            <h2>Certificates</h2>
            <p>Design templates, issue certificates after a course or seminar, and manage every certificate you issued.</p>
          </div>
          <Link className="fa-btn fa-btn--primary" to="/academy/instructor/certificates/designer">
            <Icon name="plus" size={15} /> New Template
          </Link>
        </div>
        {linksAreLocalOnly() && (
          <div className="fa-qrwarn" role="note">
            <Icon name="help" size={16} />
            <span>
              QR codes on certificates printed now point to <code>{publicSiteUrl()}</code>, which only works on this computer — a phone that scans them
              can&apos;t open it. Add <code>VITE_PUBLIC_SITE_URL=https://your-live-site</code> to <code>web/.env</code> (and deploy) so every QR opens the
              verification page with the student and class details.
            </span>
          </div>
        )}

        <div className="fa-stats fa-stats--4">
          <Stat icon="palette" value={templates.state.status === "ready" ? String(tplList.length) : "—"} label="My Templates" tone="purple" />
          <Stat icon="award" value={issued.state.status === "ready" ? String(certs.length) : "—"} label="Issued" tone="blue" />
          <Stat icon="verified" value={issued.state.status === "ready" ? String(valid) : "—"} label="Valid" tone="green" />
          <Stat icon="lock" value={issued.state.status === "ready" ? String(certs.length - valid) : "—"} label="Revoked" tone="red" />
        </div>

        <nav className="fa-tabs fa-tabs--card">
          {([
            ["templates", "Templates"],
            ["issue", "Issue Certificates"],
            ["issued", "Issued Certificates"],
          ] as [Tab, string][]).map(([k, l]) => (
            <button key={k} className={tab === k ? "is-active" : ""} onClick={() => setTab(k)}>
              {l}
            </button>
          ))}
        </nav>

        {/* ---------------- TEMPLATES */}
        {tab === "templates" && (
          <>
            <div className="fa-cardhead fa-cardhead--pad">
              <h4>My templates</h4>
            </div>
            <StateLine loading={templates.state.status === "loading"} error={templates.state.status === "error" ? templates.state.error : false} onRetry={templates.reload} />
            {templates.state.status === "ready" && tplList.length === 0 && <div className="fa-state">You haven’t saved a template yet. Start from one of the designs below.</div>}
            <div className="fa-tplgrid">
              {tplList.map((t) => (
                <div key={t._id} className="fa-card fa-tplcard">
                  <Link to={`/academy/instructor/certificates/designer/${t._id}`} className="fa-tplcard__thumb">
                    <CertificateCanvas design={t.design} data={SAMPLE_DATA} />
                  </Link>
                  <div className="fa-tplcard__body">
                    <b>{t.name}</b>
                    <small className="fa-muted">Updated {shortDate(t.updatedAt)}</small>
                    <div className="fa-job__btns">
                      <Link className="fa-btn fa-btn--outline fa-btn--xs" to={`/academy/instructor/certificates/designer/${t._id}`}>Edit</Link>
                      <button className="fa-btn fa-btn--outline fa-btn--xs" onClick={async () => { try { await duplicateTemplate(t._id); templates.reload(); toast("Template duplicated"); } catch (e) { toast(e instanceof Error ? e.message : "Could not duplicate"); } }}>Duplicate</button>
                      <button className="fa-btn fa-btn--primary fa-btn--xs" onClick={() => { setTplId(t._id); setTab("issue"); }}>Issue</button>
                      <button className="fa-icon-btn" title="Delete" onClick={async () => { if (!window.confirm(`Delete “${t.name}”? Issued certificates keep their design.`)) return; try { await deleteTemplate(t._id); templates.reload(); } catch (e) { toast(e instanceof Error ? e.message : "Could not delete"); } }}>✕</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="fa-cardhead fa-cardhead--pad fa-section">
              <h4>Start from a Fockis design</h4>
              <small className="fa-muted">{TEMPLATES.length} templates · all fully editable</small>
            </div>
            <div className="fa-tplgrid">
              {TEMPLATES.map((tp) => (
                <button key={tp.key} className="fa-card fa-tplcard fa-tplcard--btn" onClick={() => navigate(`/academy/instructor/certificates/designer?base=${tp.key}`)}>
                  <span className="fa-tplcard__thumb">
                    <CertificateCanvas design={tp.make()} data={SAMPLE_DATA} />
                  </span>
                  <span className="fa-tplcard__body">
                    <b>{tp.name}</b>
                    <small className="fa-muted">{tp.tag}</small>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ---------------- ISSUE */}
        {tab === "issue" && (
          <div className="fa-issue">
            <div className="fa-card fa-pad fa-issue__form">
              {tplList.length === 0 && templates.state.status === "ready" ? (
                <div className="fa-state">
                  Save a template first.&nbsp;<Link className="fa-link" to="/academy/instructor/certificates/designer">Open the designer</Link>
                </div>
              ) : (
                <>
                  <label className="fa-field">
                    <span>1. Template</span>
                    <select value={tplId} onChange={(e) => setTplId(e.target.value)}>
                      {tplList.map((t) => (
                        <option key={t._id} value={t._id}>{t.name}</option>
                      ))}
                    </select>
                  </label>
                  <div className="fa-field">
                    <span>2. Activity</span>
                    <div className="fa-seg">
                      {(teacher ? (["course", "seminar", "workshop"] as const) : (["course"] as const)).map((k) => (
                        <button key={k} className={type === k ? "is-on" : ""} onClick={() => { setType(k); setRef(""); setResult(null); }}>
                          {k[0].toUpperCase() + k.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  {type === "course" ? (
                    <label className="fa-field">
                      <span>Course</span>
                      <select value={ref} onChange={(e) => setRef(e.target.value)}>
                        <option value="">Choose one of your courses…</option>
                        {(courses.state.status === "ready" ? courses.state.data : []).map((c) => (
                          <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label className="fa-field">
                      <span>{type === "seminar" ? "Seminar" : "Workshop"} (past events only)</span>
                      <select value={ref} onChange={(e) => setRef(e.target.value)}>
                        <option value="">Choose the event…</option>
                        {pastEvents.map((e) => (
                          <option key={String(e._id || e.id)} value={String(e._id || e.id)}>{e.title} — {shortDate(e.startDate || e.date)}</option>
                        ))}
                      </select>
                      {events.state.status === "ready" && pastEvents.length === 0 && <small className="fa-hint">No finished events yet. Certificates can be issued after the event date.</small>}
                    </label>
                  )}

                  {type === "course" && ref && (
                    <div className="fa-field">
                      <span>3. Students who completed the course</span>
                      {rosterErr && <div className="fa-state fa-state--err">{rosterErr}</div>}
                      {!roster && !rosterErr && <StateLine loading />}
                      {roster && roster.length === 0 && <div className="fa-state">No students are enrolled yet.</div>}
                      {roster && roster.length > 0 && (
                        <div className="fa-roster">
                          <div className="fa-roster__head">
                            <label>
                              <input
                                type="checkbox"
                                checked={roster.filter((s) => s.eligible && !s.certificateNumber).every((s) => picked.has(s.enrollmentId)) && picked.size > 0}
                                onChange={(e) => setPicked(new Set(e.target.checked ? roster.filter((s) => s.eligible && !s.certificateNumber).map((s) => s.enrollmentId) : []))}
                              />
                              Select all eligible
                            </label>
                            <small>{picked.size} selected</small>
                          </div>
                          {roster.map((s) => (
                            <label key={s.enrollmentId} className={`fa-roster__row ${!s.eligible || s.certificateNumber ? "is-off" : ""}`}>
                              <input
                                type="checkbox"
                                disabled={!s.eligible || !!s.certificateNumber}
                                checked={picked.has(s.enrollmentId)}
                                onChange={(e) => {
                                  const n = new Set(picked);
                                  if (e.target.checked) n.add(s.enrollmentId);
                                  else n.delete(s.enrollmentId);
                                  setPicked(n);
                                }}
                              />
                              <span>
                                <b>{s.name}</b>
                                <small>{s.email} · <code>{s.enrollmentNumber}</code></small>
                              </span>
                              <span className="fa-roster__meta">
                                {s.certificateNumber ? <Badge tone="green">Issued {s.certificateNumber}</Badge> : s.eligible ? <Badge tone="blue">Completed</Badge> : <Badge tone="gray">{s.progress}% done</Badge>}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {type !== "course" && (
                    <label className="fa-field">
                      <span>3. Attendees — one per line: Name, email</span>
                      <textarea rows={7} value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder={"Amara Johnson, amara@example.com\nDaniel Wright, daniel@example.com"} />
                      <small className="fa-hint">{parsedAttendees.length} attendee{parsedAttendees.length === 1 ? "" : "s"}. With an email, the certificate also appears in that student’s Academy account.</small>
                    </label>
                  )}

                  <div className="fa-row2 fa-row2--even">
                    <label className="fa-field">
                      <span>Completion date</span>
                      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </label>
                    <label className="fa-field">
                      <span>Duration (optional)</span>
                      <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 24 hours" maxLength={60} />
                    </label>
                  </div>
                  <button className="fa-btn fa-btn--primary" disabled={busy} onClick={issue}>
                    <Icon name="award" size={15} /> {busy ? "Issuing…" : "Issue certificates"}
                  </button>
                  <p className="fa-hint">Each certificate gets a unique number (FA-YYYY-XXXXXX), a private verification ID and a QR code that opens its public verification page.</p>
                  {result && (
                    <div className="fa-success fa-success--block">
                      <b>
                        <Icon name="checkCircle" size={15} /> {result.issued.length} issued
                      </b>
                      {result.issued.slice(0, 6).map((c) => (
                        <span key={c._id}>{c.recipientName} — <code>{c.certificateNumber}</code></span>
                      ))}
                      {result.skipped.length > 0 && <span>Skipped: {result.skipped.join("; ")}</span>}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="fa-card fa-pad fa-issue__preview">
              <div className="fa-cardhead">
                <h4>Preview</h4>
                {tpl && <Link className="fa-link" to={`/academy/instructor/certificates/designer/${tpl._id}`}>Edit design</Link>}
              </div>
              {tpl ? (
                <CertificateCanvas
                  design={tpl.design}
                  data={{ ...SAMPLE_DATA, student_name: previewName || SAMPLE_DATA.student_name, course_name: activityName || SAMPLE_DATA.course_name, activity_type: type, instructor_name: me.state.status === "ready" ? me.state.data.name : SAMPLE_DATA.instructor_name, completion_date: new Date(date + "T12:00").toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }), duration: duration || SAMPLE_DATA.duration }}
                />
              ) : (
                <p className="fa-muted">Choose a template.</p>
              )}
            </div>
          </div>
        )}

        {/* ---------------- ISSUED */}
        {tab === "issued" && (
          <div className="fa-card">
            <div className="fa-tablehead">
              <div>
                <b>Issued certificates</b>
                <small>Search by number, student, email, enrollment ID or activity.</small>
              </div>
              <label className="fa-search">
                <Icon name="search" size={14} />
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />
              </label>
            </div>
            <StateLine loading={issued.state.status === "loading"} error={issued.state.status === "error" ? issued.state.error : false} onRetry={issued.reload} />
            {issued.state.status === "ready" && shown.length === 0 && <div className="fa-state" style={{ margin: 16 }}>No certificates yet.</div>}
            {shown.length > 0 && (
              <div className="fa-tablewrap">
                <table className="fa-table">
                  <thead>
                    <tr>
                      <th>Certificate</th>
                      <th>Recipient</th>
                      <th>Activity</th>
                      <th>Issued</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((c) => (
                      <tr key={c._id}>
                        <td>
                          <code className="fa-code">{c.certificateNumber}</code>
                        </td>
                        <td>
                          <b>{c.recipientName}</b>
                          <small className="fa-sub">{[c.recipientEmail, c.enrollmentNumber].filter(Boolean).join(" · ")}</small>
                        </td>
                        <td>
                          {c.activityName}
                          <small className="fa-sub">{c.activityType}</small>
                        </td>
                        <td>{shortDate(c.issuedAt)}</td>
                        <td>
                          <Badge tone={c.status === "valid" ? "green" : "red"}>{c.status === "valid" ? "Valid" : "Revoked"}</Badge>
                        </td>
                        <td className="fa-actions">
                          <button className="fa-btn fa-btn--xs fa-btn--outline" onClick={() => setViewing(c)}>View</button>
                          <button
                            className="fa-icon-btn"
                            title="Copy verification link"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(verificationUrl(c.verificationId));
                                toast("Verification link copied");
                              } catch {
                                toast(verificationUrl(c.verificationId));
                              }
                            }}
                          >
                            <Icon name="share" size={14} />
                          </button>
                          {c.status === "valid" ? (
                            <button className="fa-btn fa-btn--xs fa-btn--white" onClick={() => { setRevoking(c); setReason(""); }}>Revoke</button>
                          ) : (
                            <button className="fa-btn fa-btn--xs fa-btn--white" onClick={async () => { try { await restoreCertificate(c._id); issued.reload(); toast("Certificate restored"); } catch (e) { toast(e instanceof Error ? e.message : "Could not restore"); } }}>Restore</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </DashShell>

      {viewing && <ViewModal cert={viewing} onClose={() => setViewing(null)} />}
      {revoking && (
        <FaModal title={`Revoke ${revoking.certificateNumber}`} onClose={() => setRevoking(null)}>
          <p className="fa-muted">The certificate stays in the system and its verification page will show it as revoked. You can restore it later.</p>
          <label className="fa-field" style={{ marginTop: 12 }}>
            <span>Reason<i>*</i></span>
            <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
          </label>
          <div className="fa-builder__foot">
            <button className="fa-btn fa-btn--outline fa-btn--sm" onClick={() => setRevoking(null)}>Cancel</button>
            <button
              className="fa-btn fa-btn--primary fa-btn--sm fa-btn--danger"
              disabled={!reason.trim()}
              onClick={async () => {
                try {
                  await revokeCertificate(revoking._id, reason.trim());
                  issued.reload();
                  setRevoking(null);
                  toast("Certificate revoked");
                } catch (e) {
                  toast(e instanceof Error ? e.message : "Could not revoke");
                }
              }}
            >
              Revoke certificate
            </button>
          </div>
        </FaModal>
      )}
    </div>
  );
}
