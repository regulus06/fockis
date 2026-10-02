import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApplicationStepper } from "../components";
import {
  useApplicationFlow,
  useJobDetails,
} from "../hooks";
import styles from "../styles/ApplyPage.module.scss";

export function ApplyPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const { job } = useJobDetails(jobId);

  const {
    currentStep,
    payload,
    isSubmitting,
    submitError,
    submittedApplicationId,
    goNext,
    goBack,
    updatePayload,
    resetFlow,
  } = useApplicationFlow();

  useEffect(() => {
    if (jobId) {
      resetFlow(jobId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const isLastStep = currentStep === 8;
  const isReviewStep = currentStep === 7;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>
          Apply — {job?.title ?? "Loading role…"}
        </h1>

        {job && (
          <p>
            {job.company.name} · {job.location}
          </p>
        )}
      </div>

      <ApplicationStepper currentStep={currentStep} />

      <div className={styles.card}>
        {/* ============================================================
            STEP 0 — PERSONAL INFORMATION
        ============================================================ */}

        {currentStep === 0 && (
          <>
            <div className={styles.row}>
              <div className={styles.field}>
                <label>Full name</label>

                <input
                  value={payload.fullName ?? ""}
                  onChange={(e) =>
                    updatePayload({
                      fullName: e.target.value,
                    })
                  }
                  placeholder="Jordan Ellis"
                />
              </div>

              <div className={styles.field}>
                <label>Email</label>

                <input
                  type="email"
                  value={payload.email ?? ""}
                  onChange={(e) =>
                    updatePayload({
                      email: e.target.value,
                    })
                  }
                  placeholder="jordan@email.com"
                />
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label>Phone</label>

                <input
                  value={payload.phone ?? ""}
                  onChange={(e) =>
                    updatePayload({
                      phone: e.target.value,
                    })
                  }
                  placeholder="(614) 555-0134"
                />
              </div>

              <div className={styles.field}>
                <label>Location</label>

                <input
                  value={payload.location ?? ""}
                  onChange={(e) =>
                    updatePayload({
                      location: e.target.value,
                    })
                  }
                  placeholder="Columbus, OH"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label>LinkedIn / portfolio URL</label>

              <input
                value={payload.linkedInUrl ?? ""}
                onChange={(e) =>
                  updatePayload({
                    linkedInUrl: e.target.value,
                  })
                }
                placeholder="linkedin.com/in/jordanellis"
              />
            </div>
          </>
        )}

        {/* ============================================================
            STEP 1 — RESUME
        ============================================================ */}

        {currentStep === 1 && (
          <div className={styles.field}>
            <label>Resume</label>

            <div className={styles.upload}>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) =>
                  updatePayload({
                    resumeFileName:
                      e.target.files?.[0]?.name,
                  })
                }
              />

              <p>
                <b>Upload a file</b> or drag and drop —
                PDF, DOC up to 10MB
              </p>

              {payload.resumeFileName && (
                <p className={styles.fileName}>
                  {payload.resumeFileName}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            STEP 2 — EDUCATION
        ============================================================ */}

        {currentStep === 2 && (
          <>
            <div className={styles.field}>
              <label>School</label>

              <input
                value={
                  payload.education?.school ?? ""
                }
                onChange={(e) =>
                  updatePayload({
                    education: {
                      ...payload.education,
                      school: e.target.value,
                    } as typeof payload.education,
                  })
                }
                placeholder="Ohio State University"
              />
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label>Major</label>

                <input
                  value={
                    payload.education?.major ?? ""
                  }
                  onChange={(e) =>
                    updatePayload({
                      education: {
                        ...payload.education,
                        major: e.target.value,
                      } as typeof payload.education,
                    })
                  }
                  placeholder="Cybersecurity"
                />
              </div>

              <div className={styles.field}>
                <label>Graduation date</label>

                <input
                  type="month"
                  value={
                    payload.education?.graduationDate ??
                    ""
                  }
                  onChange={(e) =>
                    updatePayload({
                      education: {
                        ...payload.education,
                        graduationDate: e.target.value,
                      } as typeof payload.education,
                    })
                  }
                />
              </div>
            </div>
          </>
        )}

        {/* ============================================================
            STEP 3 — EXPERIENCE
        ============================================================ */}

        {currentStep === 3 && (
          <>
            <div className={styles.field}>
              <label>Most recent role</label>

              <input
                value={
                  payload.experience?.roleTitle ?? ""
                }
                onChange={(e) =>
                  updatePayload({
                    experience: {
                      ...payload.experience,
                      roleTitle: e.target.value,
                    } as typeof payload.experience,
                  })
                }
                placeholder="IT Help Desk Assistant"
              />
            </div>

            <div className={styles.field}>
              <label>Description</label>

              <textarea
                rows={3}
                value={
                  payload.experience?.description ?? ""
                }
                onChange={(e) =>
                  updatePayload({
                    experience: {
                      ...payload.experience,
                      description: e.target.value,
                    } as typeof payload.experience,
                  })
                }
                placeholder="What did you work on?"
              />
            </div>
          </>
        )}

        {/* ============================================================
            STEP 4 — SKILLS
        ============================================================ */}

        {currentStep === 4 && (
          <div className={styles.field}>
            <label>Skills</label>

            <input
              value={(payload.skills ?? []).join(", ")}
              onChange={(e) =>
                updatePayload({
                  skills: e.target.value
                    .split(",")
                    .map((skill: string) =>
                      skill.trim()
                    )
                    .filter(Boolean),
                })
              }
              placeholder="Python, Network Security, SIEM"
            />
          </div>
        )}

        {/* ============================================================
            STEP 5 — COVER LETTER
        ============================================================ */}

        {currentStep === 5 && (
          <div className={styles.field}>
            <label>Cover letter</label>

            <textarea
              rows={8}
              value={payload.coverLetter ?? ""}
              onChange={(e) =>
                updatePayload({
                  coverLetter: e.target.value,
                })
              }
              placeholder={`Tell ${
                job?.company.name ?? "the team"
              } why you're a fit...`}
            />
          </div>
        )}

        {/* ============================================================
            STEP 6 — WORK AUTHORIZATION / AVAILABILITY
        ============================================================ */}

        {currentStep === 6 && (
          <>
            <div className={styles.field}>
              <label>
                Are you authorized to work in the US?
              </label>

              <select
                value={
                  payload.workAuthorized === undefined
                    ? ""
                    : String(payload.workAuthorized)
                }
                onChange={(e) =>
                  updatePayload({
                    workAuthorized:
                      e.target.value === "true",
                  })
                }
              >
                <option value="">Select…</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            <div className={styles.field}>
              <label>When can you start?</label>

              <input
                value={
                  payload.availableStartDate ?? ""
                }
                onChange={(e) =>
                  updatePayload({
                    availableStartDate: e.target.value,
                  })
                }
                placeholder="June 2027"
              />
            </div>
          </>
        )}

        {/* ============================================================
            STEP 7 — REVIEW
        ============================================================ */}

        {isReviewStep && (
          <div>
            <h3>Review your application</h3>

            <p className={styles.reviewLine}>
              {payload.fullName || "Name not provided"} ·{" "}
              {payload.email || "Email not provided"}
            </p>

            <p className={styles.reviewLine}>
              Resume:{" "}
              {payload.resumeFileName ??
                "Not attached"}
            </p>

            <p className={styles.reviewLine}>
              {payload.education?.school ||
                "School not provided"}{" "}
              ·{" "}
              {payload.education?.major ||
                "Major not provided"}{" "}
              ·{" "}
              {payload.education?.graduationDate ||
                "Graduation date not provided"}
            </p>

            <p className={styles.reviewLine}>
              {payload.coverLetter
                ? "Cover letter attached"
                : "No cover letter"}
            </p>

            {submitError && (
              <p className={styles.errorLine}>
                {submitError}
              </p>
            )}
          </div>
        )}

        {/* ============================================================
            STEP 8 — SUCCESS
        ============================================================ */}

        {isLastStep && (
          <div className={styles.success}>
            <div className={styles.successIcon}>
              ✅
            </div>

            <h3>Application submitted</h3>

            <p>
              {job?.company.name ?? "The team"} typically
              responds within 5 business days. Track this
              application from your dashboard.
            </p>

            {submittedApplicationId && (
              <p className={styles.mono}>
                Reference: {submittedApplicationId}
              </p>
            )}
          </div>
        )}

        {/* ============================================================
            FOOTER NAVIGATION
        ============================================================ */}

        <div className={styles.footer}>
          {currentStep > 0 && !isLastStep ? (
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={goBack}
            >
              Back
            </button>
          ) : (
            <span />
          )}

          {isLastStep ? (
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() =>
                navigate("/careers/dashboard")
              }
            >
              Go to dashboard
            </button>
          ) : (
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={isSubmitting}
              onClick={goNext}
            >
              {isSubmitting
                ? "Submitting…"
                : isReviewStep
                  ? "Submit application"
                  : "Continue"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}