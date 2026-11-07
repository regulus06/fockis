import { useRef, useState } from "react";
import { academyToken } from "../../../lib/academySession";
import { Link } from "react-router-dom";
import { LoadState } from "../../../components/academy/learn/CourseCard";
import { Icon } from "../../../components/academy/market/Icon";
import { Badge, DashShell } from "../../../components/academy/market/Shared";
import CertificateCanvas, { printCertificate } from "../../../components/academy/certificates/CertificateCanvas";
import { useAcademyLoad } from "../../../lib/useAcademyLoad";
import { useAcademyToast } from "../../../lib/academyToastStore";
import { getStudentCourses, type StudentCourse } from "../../../lib/academyApi";
import { shortDate } from "../../../lib/academyLearnApi";
import { certData, myCertificates, verificationUrl, type IssuedCert } from "../../../lib/certificatesApi";
import { SignInGate, STUDENT_NAV } from "../AcademyPortal";

/**
 * /academy/portal/certificates — the signed-in student's certificates
 * (GET /academy/certificates/mine). Each one is rendered from the design that
 * was frozen when it was issued, with its own number and QR code.
 * Also lists the student's enrollment IDs (used to verify enrollment).
 */
export default function StudentCertificates() {
  const hasToken = !!academyToken();
  const certs = useAcademyLoad(() => (hasToken ? myCertificates() : Promise.reject(new Error("not-signed-in"))), [hasToken]);
  const courses = useAcademyLoad(() => (hasToken ? getStudentCourses() : Promise.resolve([] as StudentCourse[])), [hasToken]);
  const toast = useAcademyToast((s) => s.showToast);
  const [selected, setSelected] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  if (!hasToken || (certs.state.status === "error" && /not-signed-in|401|unauthor/i.test(certs.state.error))) return <SignInGate what="My Certificates" />;

  const list: IssuedCert[] = certs.state.status === "ready" ? certs.state.data : [];
  const cur = list[Math.min(selected, Math.max(0, list.length - 1))];
  const enrollments = courses.state.status === "ready" ? courses.state.data : [];

  async function copy(text: string, ok: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast(ok);
    } catch {
      toast(text);
    }
  }

  return (
    <div className="fa-root">
      <DashShell items={STUDENT_NAV} active="Certificates" sub="My Learning">
        <div className="fa-dhead">
          <div>
            <h2>My Certificates</h2>
            <p>Your completed courses and seminars. Every certificate has a unique number and a QR code anyone can scan to verify it.</p>
          </div>
          <Link className="fa-btn fa-btn--outline" to="/academy/verify">
            <Icon name="shield" size={15} /> Verify a certificate
          </Link>
        </div>

        {certs.state.status === "loading" && <LoadState status="loading" />}
        {certs.state.status === "error" && <LoadState status="error" error={certs.state.error} onRetry={certs.reload} />}
        {certs.state.status === "ready" && list.length === 0 && (
          <div className="fa-card fa-pad fa-empty">
            <Icon name="award" size={30} />
            <b>No certificates yet</b>
            <p className="fa-muted">When your instructor issues a certificate for a course or seminar you completed, it appears here.</p>
            <Link className="fa-btn fa-btn--primary" to="/academy/portal">Continue learning</Link>
          </div>
        )}

        {cur && (
          <>
            <div className="fa-card fa-pad fa-certwrap fa-certwrap--live">
              <div className="fa-cert-view">
                <CertificateCanvas ref={svgRef} design={cur.design} data={certData(cur)} watermark={cur.status === "revoked" ? "REVOKED" : undefined} />
              </div>
              <div className="fa-certactions">
                <Badge tone={cur.status === "valid" ? "green" : "red"}>
                  <Icon name={cur.status === "valid" ? "verified" : "lock"} size={13} /> {cur.status === "valid" ? "Verified" : "Revoked"}
                </Badge>
                <dl className="fa-certmeta">
                  <dt>Certificate No.</dt>
                  <dd><code>{cur.certificateNumber}</code></dd>
                  <dt>{cur.activityType === "course" ? "Course" : cur.activityType === "seminar" ? "Seminar" : "Workshop"}</dt>
                  <dd>{cur.activityName}</dd>
                  <dt>Instructor</dt>
                  <dd>{cur.instructorName}</dd>
                  <dt>Completed</dt>
                  <dd>{shortDate(cur.completionDate)}</dd>
                  {cur.enrollmentNumber && (
                    <>
                      <dt>Enrollment ID</dt>
                      <dd><code>{cur.enrollmentNumber}</code></dd>
                    </>
                  )}
                </dl>
                <button className="fa-action" onClick={() => printCertificate(svgRef.current, cur.design.orientation, `${cur.certificateNumber} ${cur.recipientName}`)}>
                  <Icon name="download" size={16} /> Download PDF
                </button>
                <button className="fa-action" onClick={() => copy(verificationUrl(cur.verificationId), "Verification link copied")}>
                  <Icon name="share" size={16} /> Share verification link
                </button>
                <Link className="fa-action" to={`/academy/verify/${encodeURIComponent(cur.verificationId)}`}>
                  <Icon name="shield" size={16} /> Verify certificate
                </Link>
              </div>
            </div>
            {list.length > 1 && (
              <div className="fa-certlist">
                {list.map((c, i) => (
                  <button key={c._id} className={`fa-card ${i === selected ? "is-on" : ""}`} onClick={() => setSelected(i)}>
                    <Icon name="award" size={18} />
                    <span>
                      <b>{c.activityName}</b>
                      <small>{c.certificateNumber}{c.status === "revoked" ? " · revoked" : ""}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {enrollments.length > 0 && (
          <div className="fa-card fa-section">
            <div className="fa-tablehead">
              <div>
                <b>My enrollment IDs</b>
                <small>Each enrollment has its own ID. Employers or schools can confirm it on the verification page.</small>
              </div>
            </div>
            <div className="fa-tablewrap">
              <table className="fa-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Enrollment ID</th>
                    <th>Progress</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((c) => (
                    <tr key={c.enrollmentId || c.code}>
                      <td>
                        <b>{c.name}</b>
                        <small className="fa-sub">{c.code}</small>
                      </td>
                      <td>{typeof c.enrollmentNumber === "string" ? <code className="fa-code">{c.enrollmentNumber}</code> : "—"}</td>
                      <td>{Math.round(c.progress ?? 0)}%</td>
                      <td className="fa-actions">
                        {typeof c.enrollmentNumber === "string" && (
                          <button className="fa-icon-btn" title="Copy enrollment ID" onClick={() => copy(String(c.enrollmentNumber), "Enrollment ID copied")}>
                            <Icon name="share" size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DashShell>
    </div>
  );
}
