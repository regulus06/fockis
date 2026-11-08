import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHero from "../../../components/academy/PageHero";
import { Icon } from "../../../components/academy/market/Icon";
import { StateLine } from "../../../components/academy/market/FaBlocks";
import CertificateCanvas from "../../../components/academy/certificates/CertificateCanvas";
import { shortDate } from "../../../lib/academyLearnApi";
import { certData, verifyCode, type VerifyResult } from "../../../lib/certificatesApi";
import { SAMPLE_VERIFICATION_ID } from "../../../lib/siteUrl";

/**
 * /academy/verify and /academy/verify/:code — public, no login.
 * Accepts the QR verification ID, the printed certificate number
 * (FA-YYYY-XXXXXX) or a student's enrollment ID (FAE-XXXXXXXX).
 * Checks against the backend — never trusts what is printed.
 */
export default function VerifyCertificate() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(code);
  const isSample = code.trim().toUpperCase() === SAMPLE_VERIFICATION_ID;
  const [state, setState] = useState<{ status: "idle" | "loading" | "found" | "missing" | "error" | "sample"; data?: VerifyResult; error?: string }>({ status: isSample ? "sample" : code ? "loading" : "idle" });
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setInput(code);
    if (!code) return setState({ status: "idle" });
    // QR codes on template previews in the designer point here.
    if (code.trim().toUpperCase() === SAMPLE_VERIFICATION_ID) return setState({ status: "sample" });
    let off = false;
    setState({ status: "loading" });
    verifyCode(code)
      .then((data) => !off && setState({ status: "found", data }))
      .catch((e) => !off && setState(e?.status === 404 ? { status: "missing" } : { status: "error", error: e instanceof Error ? e.message : String(e) }));
    return () => {
      off = true;
    };
  }, [code]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const v = input.trim();
    if (v) navigate(`/academy/verify/${encodeURIComponent(v)}`);
  }

  const d = state.data;
  const valid = d?.status === "valid";

  return (
    <div className="fa-root fa-page">
      <PageHero crumb="Verify" title="Verify a Certificate" subtitle="Scan the QR code on a Fockis Academy certificate, or enter its certificate number, verification ID or enrollment ID." icon="shield" />
      <div className="fa-container fa-section">
        <form className="fa-card fa-filterbar fa-verifybar" onSubmit={submit}>
          <label className="fa-search fa-search--block">
            <Icon name="search" size={15} />
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. FA-2026-7K3QX9 or FAE-4HT8KQ2P" aria-label="Certificate or enrollment code" />
          </label>
          <button className="fa-btn fa-btn--primary fa-btn--sm" type="submit">Verify</button>
        </form>

        <div className="fa-section">
          {state.status === "loading" && <StateLine loading />}
          {state.status === "sample" && (
            <div className="fa-verdict is-sample">
              <span><Icon name="help" size={26} /></span>
              <div>
                <b>This is a sample certificate</b>
                <p>
                  You scanned the QR code of a template preview, so there is no student behind it. Certificates issued to real students have their
                  own code: scanning one shows the student&apos;s name, the class, the creator, the completion and issue dates, the enrollment ID and
                  whether the certificate is still valid.
                </p>
              </div>
            </div>
          )}
          {state.status === "error" && <StateLine error={state.error} />}
          {state.status === "missing" && (
            <div className="fa-verdict is-bad">
              <span><Icon name="help" size={26} /></span>
              <div>
                <b>No match found</b>
                <p>We couldn’t find a certificate or enrollment with “{code}”. Check the code and try again — it is not case-sensitive.</p>
              </div>
            </div>
          )}

          {d && (
            <>
              <div className={`fa-verdict ${valid ? "is-ok" : "is-bad"}`}>
                <span><Icon name={valid ? "verified" : "lock"} size={28} /></span>
                <div>
                  <b>
                    {d.kind === "enrollment" ? "Valid enrollment" : valid ? "Authentic certificate" : "This certificate has been revoked"}
                  </b>
                  <p>
                    {d.kind === "enrollment"
                      ? `${d.recipientName} is enrolled in ${d.activityName}.`
                      : valid
                        ? d.institutionName && d.institutionName !== "Fockis Academy"
                          ? `Issued by ${d.institutionName} on Fockis Academy to ${d.recipientName}.`
                          : `Issued by Fockis Academy to ${d.recipientName}.`
                        : `It was revoked${d.revokedAt ? ` on ${shortDate(d.revokedAt)}` : ""}${d.revokedReason ? ` — ${d.revokedReason}` : ""}. It is no longer valid.`}
                  </p>
                </div>
              </div>

              <div className="fa-verify-grid">
                <dl className="fa-card fa-pad fa-verify-details">
                  <dt>{d.kind === "enrollment" ? "Student" : "Awarded to"}</dt>
                  <dd>{d.recipientName}</dd>
                  <dt>{d.activityType === "course" ? "Course" : d.activityType === "seminar" ? "Seminar" : "Workshop"}</dt>
                  <dd>{d.activityName}</dd>
                  {d.kind === "certificate" ? (
                    <>
                      <dt>Instructor</dt>
                      <dd>{d.instructorName}</dd>
                      <dt>Institution</dt>
                      <dd>{d.institutionName}</dd>
                      <dt>Completed</dt>
                      <dd>{shortDate(d.completionDate)}</dd>
                      <dt>Issued</dt>
                      <dd>{shortDate(d.issuedAt)}</dd>
                      <dt>Certificate No.</dt>
                      <dd><code>{d.certificateNumber}</code></dd>
                      {d.enrollmentNumber && (
                        <>
                          <dt>Enrollment ID</dt>
                          <dd><code>{d.enrollmentNumber}</code></dd>
                        </>
                      )}
                      <dt>Status</dt>
                      <dd className={valid ? "is-ok" : "is-bad"}>{valid ? "Valid" : "Revoked"}</dd>
                    </>
                  ) : (
                    <>
                      <dt>Enrollment ID</dt>
                      <dd><code>{d.enrollmentNumber}</code></dd>
                      <dt>Enrolled</dt>
                      <dd>{shortDate(d.enrolledAt ?? undefined) || "—"}</dd>
                      <dt>Progress</dt>
                      <dd>{Math.round(d.progress ?? 0)}%</dd>
                      <dt>Certificates</dt>
                      <dd>
                        {d.certificates?.length
                          ? d.certificates.map((c) => (
                              <Link key={c.certificateNumber} className="fa-link" to={`/academy/verify/${c.certificateNumber}`}>
                                {c.certificateNumber} {c.status === "revoked" ? "(revoked)" : ""}
                              </Link>
                            ))
                          : "None yet"}
                      </dd>
                    </>
                  )}
                </dl>
                {d.kind === "certificate" && d.design && (
                  <div className="fa-card fa-pad fa-cert-view">
                    <CertificateCanvas
                      ref={svgRef}
                      design={d.design}
                      data={certData({ recipientName: d.recipientName, activityName: d.activityName, activityType: d.activityType as "course", instructorName: d.instructorName ?? "", institutionName: d.institutionName, completionDate: d.completionDate ?? "", issuedAt: d.issuedAt ?? "", certificateNumber: d.certificateNumber ?? "", verificationId: d.verificationId ?? "", enrollmentNumber: d.enrollmentNumber ?? undefined })}
                      watermark={valid ? undefined : "REVOKED"}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {state.status === "idle" && (
            <div className="fa-fgrid fa-fgrid--3">
              {[
                ["grid", "Scan the QR code", "Every certificate has a QR code that opens this page with the result."],
                ["award", "Certificate number", "Printed on the certificate, e.g. FA-2026-7K3QX9."],
                ["user", "Enrollment ID", "Each enrolled student has one, e.g. FAE-4HT8KQ2P."],
              ].map(([ic, t, p], i) => (
                <div key={t} className="fa-card fa-feature">
                  <span className={`fa-stat__ic tone-${["blue", "green", "purple"][i]}`}>
                    <Icon name={ic} size={18} />
                  </span>
                  <b>{t}</b>
                  <p>{p}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
