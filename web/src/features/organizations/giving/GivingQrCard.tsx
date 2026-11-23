/**
 * GivingQrCard.tsx — Giving admin → "QR code for giving".
 *
 * The QR code and its link come from the server
 * (GET /church/organizations/:id/giving/qr?fund=), built from the church's
 * public address (fockis.com/o/<name>?give=1). Scanning it opens the church
 * page with the giving form; signed-out visitors sign in first and come back.
 *
 * Download (PNG / SVG), print a poster, or show it full screen (e.g. on the
 * projector during service).
 */

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Download, Loader2, Maximize2, Printer, QrCode, X } from "lucide-react";

import { givingApi, type GivingFund, type GivingQr } from "./givingApi";

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const fileSafe = (v: string) => v.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "giving";

function download(href: string, name: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function GivingQrCard({ organizationId, funds, enabled }: { organizationId: string; funds: GivingFund[]; enabled: boolean }) {
  const [fund, setFund] = useState("");
  const [qr, setQr] = useState<GivingQr | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [screen, setScreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const active = funds.filter((f) => f.active !== false && f.key);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    setQr(null);
    givingApi
      .qr(organizationId, fund || undefined, controller.signal)
      .then((r) => !controller.signal.aborted && setQr(r))
      .catch((e) => !controller.signal.aborted && setError(e instanceof Error ? e.message : "The QR code could not be made."));
    return () => controller.abort();
  }, [organizationId, fund]);

  const base = qr ? `${fileSafe(qr.organizationName)}-giving${qr.fund ? "-" + fileSafe(qr.fund.label) : ""}-qr` : "giving-qr";
  const heading = qr?.fund ? `Scan to give · ${qr.fund.label}` : "Scan to give";
  const shortUrl = qr ? qr.url.replace(/^https?:\/\//, "") : "";

  function printPoster() {
    if (!qr) return;
    const w = window.open("", "_blank", "width=800,height=1000");
    if (!w) {
      setError("Allow pop-ups for this site to print the poster.");
      return;
    }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(qr.organizationName)} — ${esc(heading)}</title>
<style>
  @page { size: auto; margin: 14mm; }
  body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #0f172a; text-align: center; margin: 0; }
  .p { display: flex; flex-direction: column; align-items: center; gap: 14px; padding-top: 24px; }
  h1 { font-size: 34px; margin: 0; }
  h2 { font-size: 26px; margin: 0; font-weight: 600; color: #1d4ed8; }
  img { width: 72vmin; max-width: 520px; height: auto; image-rendering: pixelated; }
  p { margin: 0; font-size: 16px; color: #334155; }
  .u { font-size: 15px; word-break: break-all; }
  .s { font-size: 13px; color: #64748b; }
</style></head><body><div class="p">
  <h1>${esc(qr.organizationName)}</h1>
  <h2>${esc(heading)}</h2>
  <img src="${qr.png}" alt="QR code">
  <p>Open your phone's camera and point it at the code.</p>
  <p class="u">${esc(shortUrl)}</p>
  <p class="s">Secure giving through Fockis</p>
</div><script>window.onload=function(){setTimeout(function(){window.print()},150)}<\/script></body></html>`);
    w.document.close();
  }

  const closeScreen = useCallback(() => {
    setScreen(false);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  }, []);

  function showOnScreen() {
    setScreen(true);
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
  }

  useEffect(() => {
    if (!screen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeScreen();
    const onFs = () => !document.fullscreenElement && setScreen(false);
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [screen, closeScreen]);

  async function copy() {
    if (!qr) return;
    try {
      await navigator.clipboard.writeText(qr.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("The link could not be copied.");
    }
  }

  return (
    <section className="gva-panel gva-qr">
      <h2>
        <QrCode aria-hidden="true" /> QR code for giving
      </h2>
      <p className="gv-muted">
        People scan it with their phone camera and the giving form opens on your church page. Print it on bulletins, posters and offering envelopes, or show it on the screen during service.
      </p>
      {!enabled && <p className="gv-error">Online giving is off. The code still opens your page, but the giving form only appears once you turn giving on.</p>}

      <div className="gva-qr__body">
        <div className="gva-qr__code">
          {qr ? <img src={qr.png} alt={`QR code: ${qr.url}`} /> : error ? null : <Loader2 className="gv-spin" aria-hidden="true" />}
        </div>
        <div className="gva-qr__side">
          {active.length > 1 && (
            <label className="gva-field">
              <span>Fund</span>
              <select className="gv-input" value={fund} onChange={(e) => setFund(e.target.value)}>
                <option value="">Let the giver choose</option>
                {active.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
              <small>Make a separate code for a building fund or a special offering.</small>
            </label>
          )}
          {error && <p className="gv-error">{error}</p>}
          {qr && (
            <>
              <p className="gva-qr__url">
                <span>{shortUrl}</span>
                <button type="button" className="gv-btn gv-btn--ghost gv-btn--sm" onClick={() => void copy()}>
                  {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />} {copied ? "Copied" : "Copy link"}
                </button>
              </p>
              <div className="gv-row gva-qr__actions">
                <button type="button" className="gv-btn gv-btn--primary" onClick={printPoster}>
                  <Printer aria-hidden="true" /> Print poster
                </button>
                <button type="button" className="gv-btn gv-btn--ghost" onClick={showOnScreen}>
                  <Maximize2 aria-hidden="true" /> Show on screen
                </button>
                <button type="button" className="gv-btn gv-btn--ghost" onClick={() => download(qr.png, `${base}.png`)}>
                  <Download aria-hidden="true" /> PNG
                </button>
                <button type="button" className="gv-btn gv-btn--ghost" onClick={() => download(URL.createObjectURL(new Blob([qr.svg], { type: "image/svg+xml" })), `${base}.svg`)}>
                  <Download aria-hidden="true" /> SVG
                </button>
              </div>
              <small className="gv-muted">PNG for slides and social posts; SVG stays sharp at any size for professional printing.</small>
            </>
          )}
        </div>
      </div>

      {screen && qr && createPortal(
        <div className="gva-qrscreen" role="dialog" aria-modal="true" aria-label={heading}>
          <button type="button" className="gva-qrscreen__close" onClick={closeScreen} aria-label="Close">
            <X aria-hidden="true" />
          </button>
          <h1>{qr.organizationName}</h1>
          <h2>{heading}</h2>
          <img src={qr.png} alt={`QR code: ${qr.url}`} />
          <p>{shortUrl}</p>
        </div>,
        document.body,
      )}
    </section>
  );
}
