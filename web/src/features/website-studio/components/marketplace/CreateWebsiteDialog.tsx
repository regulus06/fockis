import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "../../renderer/icons";
import { websiteStudioApi, apiError } from "../../services/websiteStudioApi";
import { getToken } from "../../../../utils/auth";
import type { WebsiteTemplate } from "../../types/studio";

/**
 * Creates the user's own independent copy of a template (or a blank / imported site)
 * and opens it in the editor.
 */
export default function CreateWebsiteDialog({
  template,
  categorySlug,
  mode = "template",
  onClose,
}: {
  template?: WebsiteTemplate | null;
  categorySlug?: string | null;
  mode?: "template" | "scratch" | "import";
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const organizationId = params.get("organizationId") ?? undefined;
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!getToken()) {
    return (
      <div className="wst-modal" onClick={onClose}>
        <div className="wst-modal__panel" onClick={(e) => e.stopPropagation()}>
          <h3>Sign in to create your website</h3>
          <p>Your website is saved to your Fockis account.</p>
          <a className="wst-btn wst-btn--primary" href={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}>Sign in</a>
        </div>
      </div>
    );
  }

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      let importContent: unknown;
      if (mode === "import") {
        if (!file) throw new Error("Choose a Fockis website export file (.json).");
        if (file.size > 5 * 1024 * 1024) throw new Error("The file is too large.");
        importContent = JSON.parse(await file.text());
      }
      const site = await websiteStudioApi.createWebsite({
        name: name.trim(),
        mode,
        templateSlug: template?.slug,
        categorySlug: categorySlug ?? template?.categorySlugs?.[0] ?? undefined,
        organizationId,
        importContent: importContent as any,
      });
      navigate(`/website-studio/editor/${site.id}`);
    } catch (e) {
      setError(e instanceof SyntaxError ? "That file is not a valid website export." : apiError(e, "The website could not be created."));
      setBusy(false);
    }
  };

  return (
    <div className="wst-modal" onClick={onClose} role="dialog" aria-modal="true">
      <div className="wst-modal__panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="wst-modal__close" onClick={onClose} aria-label="Close"><Icon name="X" size={18} /></button>
        <h3>{mode === "scratch" ? "Start from scratch" : mode === "import" ? "Import a design" : `Use ${template?.name}`}</h3>
        <p className="wst-muted">
          {mode === "template"
            ? "You get your own complete copy of this design. Changes never affect the original template or anyone else's website."
            : mode === "import"
              ? "Upload a design exported from Fockis Website Studio (Settings → Export)."
              : "Begin with an empty page and build with sections and elements."}
        </p>
        <label className="wst-field">
          <span>Business or website name</span>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mia's Bakery" maxLength={120} onKeyDown={(e) => e.key === "Enter" && name.trim() && create()} />
        </label>
        {mode === "import" ? (
          <label className="wst-field">
            <span>Website export (.json)</span>
            <input type="file" accept="application/json,.json" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        ) : null}
        {organizationId ? <p className="wst-note"><Icon name="Users" size={14} /> This website will belong to your organization.</p> : null}
        {error ? <p className="wst-error">{error}</p> : null}
        <button type="button" className="wst-btn wst-btn--primary wst-btn--block" disabled={!name.trim() || busy} onClick={create}>
          {busy ? "Creating your website…" : "Create website"}
        </button>
      </div>
    </div>
  );
}
