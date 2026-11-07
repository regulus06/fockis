import { useState } from "react";
import { Icon } from "../market/Icon";
import { FaModal } from "../market/FaBlocks";
import type { Credentials } from "../../../lib/institutionsApi";
import { publicSiteUrl } from "../../../lib/siteUrl";

/**
 * Shows new student logins and temporary passwords ONCE, so staff can copy or
 * print them. Email delivery isn't connected yet; when it is, these are emailed.
 */
export default function CredentialsSheet({ school, items, failed, onClose }: { school: string; items: Credentials[]; failed?: { name: string; error: string }[]; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const signIn = `${publicSiteUrl()}/academy/login`;

  const text = (c: Credentials) => `${c.name}\nLogin: ${c.loginId}\nTemporary password: ${c.temporaryPassword}\nSign in at ${signIn} — you will choose your own password.`;

  async function copy(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  function print() {
    const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch] as string);
    const slips = items
      .map(
        (c) => `<div class="slip"><h3>${esc(school)}</h3><p class="n">${esc(c.name)}</p>
<table><tr><td>Login</td><td><b>${esc(c.loginId)}</b></td></tr><tr><td>Temporary password</td><td><b class="pw">${esc(c.temporaryPassword)}</b></td></tr></table>
<p class="h">Sign in at <b>${esc(signIn)}</b>. You will be asked to choose your own password the first time.</p></div>`,
      )
      .join("");
    const w = window.open("", "_blank", "width=820,height=900");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>${esc(school)} — student logins</title><style>
body{font-family:Inter,Arial,sans-serif;margin:24px;color:#0f1b33}.slip{border:1.5px dashed #94a3b8;border-radius:10px;padding:16px 18px;margin:0 0 14px;page-break-inside:avoid}
h3{margin:0 0 4px;font-size:13px;color:#1d5ee8;text-transform:uppercase;letter-spacing:.05em}.n{font-size:18px;font-weight:700;margin:0 0 10px}
table{border-collapse:collapse;font-size:14px}td{padding:3px 14px 3px 0}td:first-child{color:#475569}.pw{font-family:monospace;font-size:16px;letter-spacing:.06em}.h{font-size:12px;color:#475569;margin:10px 0 0}
</style></head><body>${slips}<script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  }

  return (
    <FaModal title={items.length === 1 ? "Student login created" : `${items.length} student logins created`} onClose={onClose}>
      <div className="fa-creds">
        <p className="fa-note">
          <Icon name="lock" size={14} /> Temporary passwords are shown <b>only now</b>. Copy or print them and give each student their own. Email delivery
          isn&apos;t connected yet. Each student must choose a new password the first time they sign in.
        </p>
        {items.length > 0 && (
          <div className="fa-creds__list">
            {items.map((c) => (
              <div key={c.userId} className="fa-creds__row">
                <div>
                  <b>{c.name}</b>
                  {c.personalEmail && <small>{c.personalEmail}</small>}
                </div>
                <code className="fa-creds__login">{c.loginId}</code>
                <code className="fa-creds__pw">{c.temporaryPassword}</code>
                <button className="fa-btn fa-btn--outline fa-btn--xs" onClick={() => copy(text(c), c.userId)}>
                  <Icon name={copied === c.userId ? "check" : "clipboard"} size={12} /> {copied === c.userId ? "Copied" : "Copy"}
                </button>
              </div>
            ))}
          </div>
        )}
        {failed && failed.length > 0 && (
          <div className="fa-creds__failed">
            <b>Not created ({failed.length})</b>
            <ul>
              {failed.map((f, i) => (
                <li key={i}>
                  {f.name}: {f.error}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="fa-creds__foot">
          {items.length > 1 && (
            <button className="fa-btn fa-btn--outline fa-btn--sm" onClick={() => copy(items.map(text).join("\n\n"), "all")}>
              <Icon name="clipboard" size={13} /> {copied === "all" ? "Copied all" : "Copy all"}
            </button>
          )}
          {items.length > 0 && (
            <button className="fa-btn fa-btn--outline fa-btn--sm" onClick={print}>
              <Icon name="download" size={13} /> Print login slips
            </button>
          )}
          <button className="fa-btn fa-btn--primary fa-btn--sm" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </FaModal>
  );
}
