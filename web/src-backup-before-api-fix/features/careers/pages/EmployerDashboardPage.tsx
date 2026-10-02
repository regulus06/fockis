import { useState } from "react";

import {
  StatCard,
  EmployerJobRow,
} from "../components";

import {
  useEmployerJobs,
} from "../hooks";

import {
  employerApi,
} from "../services";

import type {
  EmployerJobSummary,
} from "../types";

import styles from "../styles/EmployerDashboardPage.module.scss";

/* ============================================================
   EMPLOYER DASHBOARD
============================================================ */

export function EmployerDashboardPage() {
  const {
    jobs,
    stats,
    isLoading,
  } = useEmployerJobs();

  /* ==========================================================
     FORM STATE
  ========================================================== */

  const [form, setForm] = useState({
    title: "",
    jobType: "internship",
    location: "",
    arrangement: "hybrid",
    salaryRange: "",
    deadline: "",
    description: "",
    skills: "",
  });

  const [status, setStatus] =
    useState<string | null>(null);

  /* ==========================================================
     MANAGE JOB
  ========================================================== */

  const handleManage = (
    job: EmployerJobSummary,
  ) => {
    setStatus(
      `Opening manage view for "${job.title}"`,
    );
  };

  /* ==========================================================
     PUBLISH JOB
  ========================================================== */

  const handlePublish = async () => {
    setStatus("Publishing…");

    try {
      /* ======================================================
         LOCATION
      ====================================================== */

      const location =
        form.location.trim();

      const city =
        location || "Columbus";

      const country =
        "United States";

      /* ======================================================
         REMOTE
      ====================================================== */

      const remote =
        form.arrangement === "remote";

      /* ======================================================
         JOB TYPE

         Frontend:
           internship
           co-op
           full-time
           part-time
           contract

         Backend:
           internship
           coop
           job
      ====================================================== */

      const type =
        form.jobType === "internship"
          ? "internship"
          : form.jobType === "co-op"
            ? "coop"
            : "job";

      /* ======================================================
         WORKPLACE TYPE

         Frontend:
           on-site

         Backend:
           onsite
      ====================================================== */

      const workplaceType =
        form.arrangement === "remote"
          ? "remote"
          : form.arrangement === "hybrid"
            ? "hybrid"
            : "onsite";

      /* ======================================================
         SALARY PERIOD
      ====================================================== */

      const salaryText =
        form.salaryRange
          .trim()
          .toLowerCase();

      const salaryPeriod =
        salaryText.includes("/hr") ||
        salaryText.includes("hour") ||
        salaryText.includes("hourly")
          ? "hourly"
          : salaryText.includes("/yr") ||
              salaryText.includes("year") ||
              salaryText.includes("yearly")
            ? "yearly"
            : undefined;

      /* ======================================================
         PUBLISH
      ====================================================== */

      await employerApi.postJob({
        title:
          form.title.trim(),

        /*
         * Current backend payload requires company.
         *
         * This should eventually come from the employer's
         * actual company/store rather than being hard-coded.
         */
        company:
          "My Company",

        country,

        city,

        location,

        type,

        workplaceType,

        description:
          form.description.trim(),

        salary:
          form.salaryRange.trim() ||
          undefined,

        currency:
          form.salaryRange.trim()
            ? "USD"
            : undefined,

        salaryPeriod,

        remote,

        applicationDeadline:
          form.deadline ||
          undefined,

        skills:
          form.skills
            .split(",")
            .map(
              (skill) =>
                skill.trim(),
            )
            .filter(Boolean),

        benefits: [],
      });

      /* ======================================================
         SUCCESS
      ====================================================== */

      setStatus(
        "Job published successfully.",
      );

      setForm({
        title: "",
        jobType: "internship",
        location: "",
        arrangement: "hybrid",
        salaryRange: "",
        deadline: "",
        description: "",
        skills: "",
      });
    } catch (err) {
      setStatus(
        err instanceof Error
          ? err.message
          : "Could not publish job.",
      );
    }
  };

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className={styles.page}>
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className={styles.header}>
        <div>
          <h1>
            Employer dashboard
          </h1>

          <p>
            Managing{" "}
            {jobs.length} open roles
          </p>
        </div>

        <button
          type="button"
          className={
            styles.primaryBtn
          }
          onClick={() =>
            setStatus(
              "Job posting form is below",
            )
          }
        >
          + Post a job
        </button>
      </div>

      {/* =====================================================
          STATS
      ===================================================== */}

      <div className={styles.stats}>
        <StatCard
          value={
            stats?.openJobs ?? "—"
          }
          label="Open jobs"
        />

        <StatCard
          value={
            stats?.totalApplicants ?? "—"
          }
          label="Total applicants"
        />

        <StatCard
          value={
            stats?.inInterview ?? "—"
          }
          label="In interview"
        />

        <StatCard
          value={
            stats
              ? `${stats.hireRate}%`
              : "—"
          }
          label="Applicant → hire rate"
        />
      </div>

      {/* =====================================================
          MANAGE JOBS
      ===================================================== */}

      <div
        className={
          styles.sectionHead
        }
      >
        <h2>
          Manage jobs
        </h2>
      </div>

      {isLoading ? (
        <div
          className={
            styles.loading
          }
        >
          Loading jobs…
        </div>
      ) : jobs.length === 0 ? (
        <div
          className={
            styles.empty
          }
        >
          No jobs have been
          posted yet.
        </div>
      ) : (
        jobs.map((job) => (
          <EmployerJobRow
            key={job.id}
            job={job}
            onManage={
              handleManage
            }
          />
        ))
      )}

      {/* =====================================================
          POST JOB
      ===================================================== */}

      <div
        className={
          styles.sectionHead
        }
        style={{
          marginTop: 32,
        }}
      >
        <h2>
          Post a job — preview
        </h2>
      </div>

      <div
        className={
          styles.formCard
        }
      >
        {/* ---------------------------------------------------
            TITLE + TYPE
        --------------------------------------------------- */}

        <div className={styles.row}>
          <div className={styles.field}>
            <label>
              Job title
            </label>

            <input
              value={form.title}
              onChange={(event) =>
                setForm({
                  ...form,
                  title:
                    event.target.value,
                })
              }
              placeholder="e.g. Software Engineering Intern"
            />
          </div>

          <div className={styles.field}>
            <label>
              Job type
            </label>

            <select
              value={form.jobType}
              onChange={(event) =>
                setForm({
                  ...form,
                  jobType:
                    event.target.value,
                })
              }
            >
              <option value="internship">
                Internship
              </option>

              <option value="co-op">
                Co-op
              </option>

              <option value="full-time">
                Full-time
              </option>

              <option value="part-time">
                Part-time
              </option>

              <option value="contract">
                Contract
              </option>
            </select>
          </div>
        </div>

        {/* ---------------------------------------------------
            LOCATION + ARRANGEMENT
        --------------------------------------------------- */}

        <div className={styles.row}>
          <div className={styles.field}>
            <label>
              Location
            </label>

            <input
              value={form.location}
              onChange={(event) =>
                setForm({
                  ...form,
                  location:
                    event.target.value,
                })
              }
              placeholder="Columbus, OH"
            />
          </div>

          <div className={styles.field}>
            <label>
              Work arrangement
            </label>

            <select
              value={form.arrangement}
              onChange={(event) =>
                setForm({
                  ...form,
                  arrangement:
                    event.target.value,
                })
              }
            >
              <option value="hybrid">
                Hybrid
              </option>

              <option value="remote">
                Remote
              </option>

              <option value="on-site">
                On-site
              </option>
            </select>
          </div>
        </div>

        {/* ---------------------------------------------------
            SALARY + DEADLINE
        --------------------------------------------------- */}

        <div className={styles.row}>
          <div className={styles.field}>
            <label>
              Salary range
            </label>

            <input
              value={
                form.salaryRange
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  salaryRange:
                    event.target.value,
                })
              }
              placeholder="$20–$25/hr"
            />
          </div>

          <div className={styles.field}>
            <label>
              Application deadline
            </label>

            <input
              type="date"
              value={form.deadline}
              onChange={(event) =>
                setForm({
                  ...form,
                  deadline:
                    event.target.value,
                })
              }
            />
          </div>
        </div>

        {/* ---------------------------------------------------
            DESCRIPTION
        --------------------------------------------------- */}

        <div className={styles.field}>
          <label>
            Description
          </label>

          <textarea
            rows={3}
            value={
              form.description
            }
            onChange={(event) =>
              setForm({
                ...form,
                description:
                  event.target.value,
              })
            }
            placeholder="What will this person work on?"
          />
        </div>

        {/* ---------------------------------------------------
            SKILLS
        --------------------------------------------------- */}

        <div className={styles.field}>
          <label>
            Required skills
          </label>

          <input
            value={form.skills}
            onChange={(event) =>
              setForm({
                ...form,
                skills:
                  event.target.value,
              })
            }
            placeholder="Python, SQL, Communication..."
          />
        </div>

        {/* ---------------------------------------------------
            STATUS
        --------------------------------------------------- */}

        {status && (
          <p
            className={
              styles.status
            }
          >
            {status}
          </p>
        )}

        {/* ---------------------------------------------------
            FOOTER
        --------------------------------------------------- */}

        <div
          className={
            styles.footer
          }
        >
          <button
            type="button"
            className={
              styles.ghostBtn
            }
            onClick={() =>
              setStatus(
                "Draft saved",
              )
            }
          >
            Save draft
          </button>

          <button
            type="button"
            className={
              styles.primaryBtn
            }
            onClick={
              handlePublish
            }
          >
            Preview & publish
          </button>
        </div>
      </div>
    </div>
  );
}