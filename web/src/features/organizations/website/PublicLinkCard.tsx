/**
 * PublicLinkCard.tsx — Profile & Locations → Domain → "Public link".
 *
 * Shows the organization's shareable address (fockis.com/o/<name>) and lets
 * the owner choose another name. The server checks everything again (owner
 * only, valid and free name); old names keep redirecting to the new one.
 *
 *   GET /church/organizations/:id/public-link
 *   GET /church/organizations/:id/public-link/check?handle=
 *   PUT /church/organizations/:id/public-link
 */

import { useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Link2, Loader2, Save } from "lucide-react";

import { errorMessage } from "../ui/orgUi";
import { publicLinksApi, publicPath, publicSiteOrigin, type PublicLinkInfo } from "./publicLinks";

/** Same rules as the server's normalizeHandle (the server has the last word). */
function normalize(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

export default function PublicLinkCard({ organizationId, notify }: { organizationId: string; notify: (tone: "ok" | "error", text: string) => void }) {
  const [info, setInfo] = useState<PublicLinkInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [check, setCheck] = useState<{ handle: string; available: boolean; message: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    let alive = true;
    publicLinksApi
      .info(organizationId)
      .then((i) => {
        if (!alive) return;
        setInfo(i);
        setValue(i.handle ?? "");
      })
      .catch((e) => alive && setLoadError(errorMessage(e, "Couldn't load the public link.")));
    return () => {
      alive = false;
    };
  }, [organizationId]);

  const wanted = normalize(value);
  const changed = Boolean(info && wanted && wanted !== info.handle);

  // Check the name with the server while the owner types (debounced).
  useEffect(() => {
    if (!changed) {
      setCheck(null);
      return;
    }
    const id = ++seq.current;
    setChecking(true);
    const t = window.setTimeout(() => {
      publicLinksApi
        .check(organizationId, wanted)
        .then((r) => id === seq.current && setCheck(r))
        .catch((e) => id === seq.current && setCheck({ handle: wanted, available: false, message: errorMessage(e, "Couldn't check this name.") }))
        .finally(() => id === seq.current && setChecking(false));
    }, 400);
    return () => window.clearTimeout(t);
  }, [organizationId, wanted, changed]);

  async function save() {
    if (!changed) return;
    setSaving(true);
    try {
      const next = await publicLinksApi.rename(organizationId, wanted);
      setInfo(next);
      setValue(next.handle);
      setCheck(null);
      notify("ok", "Public link saved. The old link keeps working and points to the new one.");
    } catch (e) {
      notify("error", errorMessage(e, "Couldn't save the public link."));
    } finally {
      setSaving(false);
    }
  }

  const url = info?.handle ? `${publicSiteOrigin()}${publicPath(info.handle)}` : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      notify("error", "Couldn't copy the link.");
    }
  }

  if (loadError) return <p className="pl-alert" role="alert">{loadError}</p>;
  if (!info)
    return (
      <p className="pl-muted">
        <Loader2 className="pl-spin" aria-hidden="true" /> Loading public link…
      </p>
    );

  return (
    <div className="pl-stack">
      {info.handle ? (
        <div className="pl-domain">
          <Link2 aria-hidden="true" />
          <b>{url.replace(/^https?:\/\//, "")}</b>
          <button type="button" className="pl-btn pl-btn--ghost pl-btn--sm" onClick={() => void copy()}>
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />} {copied ? "Copied" : "Copy"}
          </button>
          <a className="pl-btn pl-btn--ghost pl-btn--sm" href={url} target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden="true" /> Open
          </a>
        </div>
      ) : (
        <p className="pl-help">Your public link is being prepared. Refresh in a minute.</p>
      )}
      {info.domainUrl && (
        <p className="pl-help">
          Your Fockis address <a href={info.domainUrl} target="_blank" rel="noreferrer">{info.domainUrl.replace(/^https?:\/\//, "")}</a> opens the same page.
        </p>
      )}

      <label className="pl-field">
        <span>Change the name in the link</span>
        <span className="pl-iconinput">
          <Link2 aria-hidden="true" />
          <input
            className="pl-input"
            maxLength={63}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. eglise-methodiste-ouanaminthe"
            aria-describedby="pl-handle-status"
          />
        </span>
        <small id="pl-handle-status" role="status">
          {!changed
            ? "Letters, numbers and dashes. Only the owner can change it."
            : checking
              ? `Checking ${publicPath(wanted)}…`
              : check
                ? check.available
                  ? `${publicPath(check.handle)} is available.`
                  : check.message
                : ""}
        </small>
      </label>

      <div>
        <button type="button" className="pl-btn pl-btn--primary" onClick={() => void save()} disabled={!changed || saving || checking || !check?.available}>
          {saving ? <Loader2 className="pl-spin" aria-hidden="true" /> : <Save aria-hidden="true" />} Save link
        </button>
      </div>

      {info.previousHandles.length > 0 && (
        <p className="pl-help">
          Old links that still redirect here: {info.previousHandles.map((h) => publicPath(h)).join(", ")}
        </p>
      )}
      <p className="pl-help">Search engines like Google find your page through this link when your organization is set to be discoverable.</p>
    </div>
  );
}
