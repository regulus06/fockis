import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "../renderer/icons";
import { websiteStudioApi, apiError } from "../services/websiteStudioApi";
import { getToken } from "../../../utils/auth";
import { StudioNav } from "./WebsiteStudioHome";
import "../styles/studio.scss";

const EXAMPLES = [
  "Create a modern luxury car dealership website with vehicle listings, financing information, appointment booking, and contact forms.",
  "A cozy bakery called \"Golden Crust\" that sells sourdough, pastries and custom birthday cakes with pickup and delivery.",
  "A Haitian church in Miami with service times, events, giving information and a visitor welcome page.",
  "A braiding and natural hair salon with online booking, a team page and a small product shop.",
];

export default function BuildWithAI() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const steps = ["Understanding your request", "Choosing the best category & design", "Creating pages & sections", "Writing content", "Applying your theme"];
  const [step, setStep] = useState(0);

  const generate = async () => {
    if (!getToken()) {
      window.location.href = `/login?redirect=${encodeURIComponent("/website-studio/ai")}`;
      return;
    }
    setBusy(true);
    setError(null);
    setStep(0);
    const timer = window.setInterval(() => setStep((s) => Math.min(steps.length - 1, s + 1)), 1800);
    try {
      const res = await websiteStudioApi.aiGenerate(prompt.trim(), params.get("organizationId") ?? undefined);
      navigate(`/website-studio/editor/${res.website.id}`);
    } catch (e) {
      setError(apiError(e, "The website could not be generated."));
    } finally {
      window.clearInterval(timer);
      setBusy(false);
    }
  };

  return (
    <div className="wst">
      <StudioNav />
      <section className="wst-ai">
        <span className="wst-option__icon"><Icon name="Sparkles" size={30} /></span>
        <h1>Build your website with AI</h1>
        <p>Describe your business. AI picks the right category and design, creates the pages and sections, writes the content and opens it in the editor — fully editable.</p>
        <textarea rows={6} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the website you want…" maxLength={4000} />
        <div className="wst-ai__examples">
          {EXAMPLES.map((x) => <button type="button" key={x} onClick={() => setPrompt(x)}>{x}</button>)}
        </div>
        {error ? <p className="wst-error">{error}</p> : null}
        {busy ? (
          <ol className="wst-ai__steps">
            {steps.map((s, i) => <li key={s} className={i < step ? "is-done" : i === step ? "is-active" : ""}>{s}</li>)}
          </ol>
        ) : null}
        <button type="button" className="wst-btn wst-btn--primary wst-btn--lg" disabled={busy || prompt.trim().length < 10} onClick={generate}>
          <Icon name="Sparkles" size={18} /> {busy ? "Generating…" : "Generate my website"}
        </button>
      </section>
    </div>
  );
}
