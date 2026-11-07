import { useRef, useState } from "react";
import { academyToken } from "../../../lib/academySession";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../../../components/academy/market/Icon";
import { Logo, Person, PEOPLE } from "../../../components/academy/market/Shared";
import { KitchenArt } from "../../../components/academy/market/Art";
import { useAcademyToast } from "../../../lib/academyToastStore";
import { createCourse, getMe, submitContactForm, updateCourse } from "../../../lib/academyApi";
import { setCourseVisibility, type Visibility } from "../../../lib/academyLearnApi";
import { useAcademyLoad } from "../../../lib/useAcademyLoad";
import "../../../styles/academy-market.scss";

/* ================================================================== */
/* /academy/teach — Become an Instructor (design board screen 3)       */
/* ================================================================== */

export function BecomeInstructor() {
  const perks = ["Create and sell courses", "Host live classes, seminars & workshops", "Earn income from your expertise", "Build your professional brand", "Get support from the Fockis Academy team"];
  return (
    <div className="fa-root fa-page">
      <div className="fa-container">
        <section className="fa-become">
          <div className="fa-become__copy">
            <div className="fa-crumbs">
              <Link to="/academy">Home</Link> / <span>Become an Instructor</span>
            </div>
            <h1>
              Teach, Share &amp; Earn
              <br />
              on Fockis Academy
            </h1>
            <p>Turn your knowledge into impact. Create courses, host seminars and workshops, build your audience and help learners around the world.</p>
            <ul className="fa-checks">
              {perks.map((p) => (
                <li key={p}>
                  <Icon name="checkCircle" size={17} /> {p}
                </li>
              ))}
            </ul>
            <div className="fa-become__btns">
              <Link to="/academy/studio/new" className="fa-btn fa-btn--primary">
                Start creating — it&apos;s free
              </Link>
              <Link to="/academy/teach/apply" className="fa-btn fa-btn--white">
                Apply as an Academy instructor
              </Link>
            </div>
          </div>
          <div className="fa-become__visual" aria-hidden="true">
            <div className="fa-become__person">
              <Person look={{ ...PEOPLE.elince, shirt: "#1e2a44" }} size={340} bg="transparent" round={false} />
            </div>
            <div className="fa-float fa-float--1">
              <span className="tone-green">
                <Icon name="wallet" />
              </span>
              <div>
                <b>Earn</b>
                <small>From your expertise</small>
              </div>
            </div>
            <div className="fa-float fa-float--2">
              <span className="tone-blue">
                <Icon name="users" />
              </span>
              <div>
                <b>Teach</b>
                <small>Live & recorded</small>
              </div>
            </div>
            <div className="fa-float fa-float--3">
              <span className="tone-purple">
                <Icon name="play" />
              </span>
              <div>
                <b>Publish</b>
                <small>Courses & seminars</small>
              </div>
            </div>
            <div className="fa-float fa-float--video">
              <div className="fa-mini-video">
                <Icon name="shield" size={30} />
                <span className="fa-mini-video__play">
                  <Icon name="play" size={14} fill="currentColor" />
                </span>
                <div className="fa-mini-video__bars">
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id="how" className="fa-steps3">
          {(
            [
              ["user", "Apply", "Tell us about your expertise, qualifications and teaching experience."],
              ["verified", "Get approved", "The Academy team reviews your application and upgrades your account to instructor."],
              ["monitor", "Teach", "Build courses, publish them and teach live in the Academy Classroom."],
            ] as const
          ).map(([ic, t, d], i) => (
            <div key={t} className="fa-card fa-step3">
              <span className="fa-step3__n">{i + 1}</span>
              <Icon name={ic} size={22} />
              <b>{t}</b>
              <p>{d}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

/* ================================================================== */
/* /academy/teach/apply — Instructor Application (screen 4)            */
/* Submitted through the existing contact endpoint (POST /academy/      */
/* contact, category "instructor-application") so it lands in Admin →   */
/* Contact Messages until a dedicated instructor-applications API exists.*/
/* ================================================================== */

const APP_STEPS = ["Personal Information", "Professional Details", "Expertise & Experience", "Qualifications", "Documents & Portfolio", "Review & Submit"];

type AppForm = { name: string; title: string; email: string; phone: string; bio: string; website: string; languages: string; expertise: string; years: string; education: string; certifications: string; portfolio: string };

export function InstructorApplication() {
  const [step, setStep] = useState(0);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState<AppForm>({ name: "", title: "", email: "", phone: "", bio: "", website: "", languages: "", expertise: "", years: "", education: "", certifications: "", portfolio: "" });
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof AppForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const field = (label: string, k: keyof AppForm, req = false, type = "text") => (
    <label className="fa-field">
      <span>
        {label}
        {req && <i>*</i>}
      </span>
      {type === "area" ? <textarea rows={4} value={form[k]} onChange={set(k)} required={req} /> : <input type={type} value={form[k]} onChange={set(k)} required={req} />}
    </label>
  );

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const lines = [
        `Professional title: ${form.title}`,
        `Phone: ${form.phone || "—"}`,
        `Website: ${form.website || "—"}`,
        `Languages: ${form.languages || "—"}`,
        `Expertise: ${form.expertise}`,
        `Years of experience: ${form.years}`,
        `Education: ${form.education}`,
        `Certifications: ${form.certifications || "—"}`,
        `Portfolio / documents: ${form.portfolio || "—"}`,
        "",
        "Biography:",
        form.bio,
      ];
      await submitContactForm({ name: form.name, email: form.email, phone: form.phone || undefined, subject: `Instructor application — ${form.name}`, category: "instructor-application", message: lines.join("\n") });
      setSent(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not submit your application.");
    } finally {
      setBusy(false);
    }
  }

  if (sent)
    return (
      <div className="fa-root fa-page fa-page--soft">
        <div className="fa-container fa-narrow">
          <div className="fa-card fa-gate">
            <span className="fa-stat__ic tone-green">
              <Icon name="checkCircle" size={22} />
            </span>
            <h2>Application submitted</h2>
            <p className="fa-muted">Thanks, {form.name.split(" ")[0]}. Your application is now pending review. The Academy team will email {form.email} with a decision.</p>
            <div className="fa-gate__btns">
              <Link className="fa-btn fa-btn--primary" to="/academy">
                Back to Academy
              </Link>
            </div>
          </div>
        </div>
      </div>
    );

  return (
    <div className="fa-root fa-page fa-page--soft">
      <div className="fa-container fa-narrow">
        <div className="fa-card fa-appcard">
          <div className="fa-appcard__head">
            <Logo />
            <div>
              <h2>Instructor Application</h2>
              <p>Apply to become an approved instructor on Fockis Academy.</p>
            </div>
          </div>
          <div className="fa-appcard__body">
            <ol className="fa-vsteps">
              {APP_STEPS.map((s, i) => (
                <li key={s} className={i === step ? "is-active" : i < step ? "is-done" : ""}>
                  <button type="button" onClick={() => i < step && setStep(i)}>
                    <span>{i < step ? <Icon name="check" size={12} /> : i + 1}</span>
                    {s}
                  </button>
                </li>
              ))}
            </ol>
            <form
              className="fa-appform"
              onSubmit={(e) => {
                e.preventDefault();
                if (step < APP_STEPS.length - 1) setStep(step + 1);
                else void submit();
              }}
            >
              <h4>{APP_STEPS[step]}</h4>
              {step === 0 && (
                <div className="fa-appform__grid">
                  <div className="fa-photo">
                    {photo ? <img src={photo} alt="Profile preview" /> : <Person look={PEOPLE.maria} size={104} bg="#e9eef8" />}
                    <button type="button" className="fa-btn fa-btn--outline fa-btn--xs" onClick={() => fileRef.current?.click()}>
                      Change Photo
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setPhoto(URL.createObjectURL(f));
                      }}
                    />
                  </div>
                  <div className="fa-fields">
                    {field("Full Name", "name", true)}
                    {field("Professional Title", "title", true)}
                    {field("Email", "email", true, "email")}
                    {field("Phone", "phone", false, "tel")}
                  </div>
                </div>
              )}
              {step === 1 && (
                <div className="fa-fields">
                  {field("Biography", "bio", true, "area")}
                  {field("Website", "website", false, "url")}
                  {field("Languages", "languages")}
                </div>
              )}
              {step === 2 && (
                <div className="fa-fields">
                  {field("Areas of expertise", "expertise", true)}
                  {field("Years of experience", "years", true, "number")}
                </div>
              )}
              {step === 3 && (
                <div className="fa-fields">
                  {field("Education", "education", true)}
                  {field("Certifications", "certifications")}
                </div>
              )}
              {step === 4 && (
                <div className="fa-fields">
                  {field("Portfolio / CV links", "portfolio", false, "area")}
                  <p className="fa-note">
                    <Icon name="lock" size={14} /> Paste links to your CV, certificates or portfolio. File uploads arrive with the instructor-applications API.
                  </p>
                </div>
              )}
              {step === 5 && (
                <dl className="fa-review">
                  {(Object.entries(form) as [keyof AppForm, string][])
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                </dl>
              )}
              {err && (
                <p className="fa-error" role="alert">
                  {err}
                </p>
              )}
              <div className="fa-appform__foot">
                <button type="button" className="fa-btn fa-btn--outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
                  Back
                </button>
                <button type="submit" className="fa-btn fa-btn--primary" disabled={busy}>
                  {step === APP_STEPS.length - 1 ? (busy ? "Submitting…" : "Submit Application") : "Continue"} <Icon name="right" size={15} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* /academy/instructor/course/new — Course Builder (screen 6)          */
/* POST /academy/courses (with modules), then PATCH visibility.        */
/* ================================================================== */

const BUILDER_STEPS = ["Basic Info", "Curriculum", "Materials", "Pricing", "Publish"];

export function CourseBuilder() {
  const navigate = useNavigate();
  const toast = useAcademyToast((s: { showToast: (message: string) => void }) => s.showToast);
  const hasToken = !!academyToken();
  const me = useAcademyLoad(() => (hasToken ? getMe() : Promise.reject(new Error("not-signed-in"))), [hasToken]);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [c, setC] = useState({ code: "", title: "", category: "Technology", difficulty: "All Levels", language: "English", desc: "", visibility: "draft" as Visibility });
  const [lessons, setLessons] = useState<string[]>(["Introduction"]);
  const [cover, setCover] = useState<string | null>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  if (!hasToken || me.state.status === "error")
    return (
      <div className="fa-root fa-page fa-page--soft">
        <div className="fa-container fa-narrow">
          <div className="fa-card fa-gate">
            <h2>Create a course</h2>
            <p className="fa-muted">Sign in with an instructor account to create courses.</p>
            <div className="fa-gate__btns">
              <Link className="fa-btn fa-btn--primary" to="/academy/login">
                Sign in to Academy
              </Link>
            </div>
          </div>
        </div>
      </div>
    );

  const validBasics = c.code.trim() && c.title.trim();

  async function save(publishAs?: Visibility) {
    if (me.state.status !== "ready") return;
    if (!validBasics) {
      setStep(0);
      setErr("Add a course code and title first.");
      return;
    }
    setBusy(true);
    setErr(null);
    const modules = lessons.map((t, i) => ({ order: i + 1, title: t.trim() })).filter((m) => m.title);
    const description = [c.desc.trim(), `Category: ${c.category} · Level: ${c.difficulty} · Language: ${c.language}`].filter(Boolean).join("\n\n");
    try {
      let code = createdCode;
      if (!code) {
        const created = await createCourse({ code: c.code.trim(), name: c.title.trim(), description, instructor: me.state.data.name, modules });
        code = created.code;
        setCreatedCode(code);
      } else {
        await updateCourse(code, { name: c.title.trim(), description, modules });
      }
      const vis = publishAs ?? "draft";
      await setCourseVisibility(code, vis);
      toast(vis === "draft" ? "Draft saved" : `Course saved as ${vis}`);
      if (publishAs) navigate("/academy/instructor/courses");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save the course.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fa-root fa-page fa-page--soft">
      <div className="fa-container fa-narrow">
        <div className="fa-crumbs fa-crumbs--top">
          <Link to="/academy/instructor">Instructor Dashboard</Link> / <span>Create Course</span>
        </div>
        <div className="fa-card fa-builder">
          <div className="fa-builder__head">
            <Logo />
            <ol className="fa-hsteps">
              {BUILDER_STEPS.map((s, i) => (
                <li key={s} className={i === step ? "is-active" : i < step ? "is-done" : ""}>
                  <button type="button" onClick={() => setStep(i)}>
                    <span>{i + 1}</span>
                    <small>{s}</small>
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <div className="fa-builder__body">
            {step === 0 && (
              <div className="fa-builder__grid">
                <div className="fa-cover">
                  {cover ? <img src={cover} alt="Course cover preview" /> : <KitchenArt />}
                  <button type="button" className="fa-btn fa-btn--outline fa-btn--xs" onClick={() => coverRef.current?.click()}>
                    Change Image
                  </button>
                  <input
                    ref={coverRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setCover(URL.createObjectURL(f));
                    }}
                  />
                  <small className="fa-muted">Preview only — cover upload needs a storage endpoint.</small>
                </div>
                <div className="fa-fields">
                  <h4>Basic Information</h4>
                  <div className="fa-row2">
                    <label className="fa-field">
                      <span>
                        Course Code<i>*</i>
                      </span>
                      <input value={c.code} disabled={!!createdCode} maxLength={20} placeholder="e.g. PST101" onChange={(e) => setC({ ...c, code: e.target.value.toUpperCase() })} />
                    </label>
                    <label className="fa-field">
                      <span>
                        Course Title<i>*</i>
                      </span>
                      <input value={c.title} maxLength={140} onChange={(e) => setC({ ...c, title: e.target.value })} />
                    </label>
                  </div>
                  <div className="fa-row3">
                    <label className="fa-field">
                      <span>Category</span>
                      <select value={c.category} onChange={(e) => setC({ ...c, category: e.target.value })}>
                        {["Technology", "Business", "Culinary Arts", "Health & Wellness", "Design & Arts", "Education"].map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </label>
                    <label className="fa-field">
                      <span>Difficulty</span>
                      <select value={c.difficulty} onChange={(e) => setC({ ...c, difficulty: e.target.value })}>
                        {["All Levels", "Beginner", "Intermediate", "Advanced"].map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </label>
                    <label className="fa-field">
                      <span>Language</span>
                      <select value={c.language} onChange={(e) => setC({ ...c, language: e.target.value })}>
                        {["English", "French", "Spanish", "Portuguese", "Haitian Creole"].map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="fa-field">
                    <span>Course Description</span>
                    <textarea rows={3} maxLength={600} value={c.desc} onChange={(e) => setC({ ...c, desc: e.target.value })} />
                  </label>
                </div>
              </div>
            )}
            {step === 1 && (
              <div className="fa-curr-edit">
                <div className="fa-curr-edit__sec">
                  <b>Lessons (saved as course modules, in order)</b>
                  {lessons.map((l, i) => (
                    <div key={i} className="fa-curr-edit__lesson">
                      <Icon name="play" size={14} />
                      <input value={l} placeholder={`Lesson ${i + 1}`} onChange={(e) => setLessons(lessons.map((x, j) => (j === i ? e.target.value : x)))} />
                      <button type="button" className="fa-icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => setLessons(lessons.map((x, j) => (j === i - 1 ? lessons[i] : j === i ? lessons[i - 1] : x)))}>
                        ↑
                      </button>
                      <button type="button" className="fa-icon-btn" aria-label="Remove lesson" onClick={() => setLessons(lessons.filter((_, j) => j !== i))}>
                        ✕
                      </button>
                    </div>
                  ))}
                  <button type="button" className="fa-link" onClick={() => setLessons([...lessons, ""])}>
                    <Icon name="plus" size={14} /> Add lesson
                  </button>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="fa-drop fa-drop--off">
                <Icon name="upload" size={26} />
                <b>Learning materials</b>
                <small>PDF, video, slides and audio uploads need the Academy materials endpoint (reusing Fockis storage). Not connected yet.</small>
              </div>
            )}
            {step === 3 && (
              <div className="fa-fields fa-fields--narrow">
                <p className="fa-note">
                  <Icon name="lock" size={14} /> Paid courses will use the existing Fockis checkout once Academy is connected to it. For now, enrollment goes through Admissions and is free.
                </p>
              </div>
            )}
            {step === 4 && (
              <div className="fa-fields fa-fields--narrow">
                {(["public", "hidden", "private", "draft"] as Visibility[]).map((v) => (
                  <label key={v} className={`fa-radio ${c.visibility === v ? "is-on" : ""}`}>
                    <input type="radio" checked={c.visibility === v} onChange={() => setC({ ...c, visibility: v })} />
                    {v === "public" ? "Public — listed in the catalog" : v === "hidden" ? "Hidden — only by link" : v === "private" ? "Private — enrolled students only" : "Draft — only you"}
                  </label>
                ))}
              </div>
            )}
            {err && (
              <p className="fa-error" role="alert">
                {err}
              </p>
            )}
            <div className="fa-builder__foot">
              <button type="button" className="fa-btn fa-btn--outline" disabled={busy || me.state.status !== "ready"} onClick={() => save()}>
                Save as Draft
              </button>
              {step < 4 ? (
                <button type="button" className="fa-btn fa-btn--primary" onClick={() => (step === 0 && !validBasics ? setErr("Add a course code and title first.") : (setErr(null), setStep(step + 1)))}>
                  Continue <Icon name="right" size={15} />
                </button>
              ) : (
                <button type="button" className="fa-btn fa-btn--primary" disabled={busy || me.state.status !== "ready"} onClick={() => save(c.visibility)}>
                  {busy ? "Saving…" : "Save & Finish"} <Icon name="right" size={15} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
