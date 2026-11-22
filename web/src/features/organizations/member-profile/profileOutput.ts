/* Printable certificate and member export. Both are built client-side from
   the profile the viewer is already allowed to see. */

import { addressLines, fmtDate, ROLE_LABEL, STATUS_LABEL, type MemberDocument, type MemberProfileView } from "./memberProfileApi";

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

const CERT_TEXT: Record<string, { title: string; line: (v: MemberProfileView) => string }> = {
  membership_certificate: {
    title: "Certificate of Membership",
    line: (v) => `is a member in good standing of ${esc(v.organization.name)}, received into membership on ${esc(fmtDate(v.member.joinedAt))}.`,
  },
  baptism_certificate: {
    title: "Certificate of Baptism",
    line: (v) => {
      const b = v.details.baptism;
      return `was baptized on ${esc(fmtDate(b?.date))}${b?.location ? ` at ${esc(b.location)}` : ""}${b?.officiant ? `, officiated by ${esc(b.officiant)}` : ""}.`;
    },
  },
  confirmation_certificate: {
    title: "Certificate of Confirmation",
    line: (v) => `was confirmed on ${esc(fmtDate(v.details.confirmation?.date))} at ${esc(v.organization.name)}.`,
  },
};

export function printCertificate(view: MemberProfileView, doc: MemberDocument, logoSrc: string | null): boolean {
  const spec = CERT_TEXT[doc.category];
  if (!spec) return false;
  const win = window.open("", "_blank", "noopener=no,width=1000,height=760");
  if (!win) return false;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(spec.title)} – ${esc(view.member.displayName)}</title>
<style>
@page{size:landscape;margin:12mm}
body{margin:0;font-family:Georgia,'Times New Roman',serif;color:#0f1b3d;background:#fff}
.c{border:10px double #0b63d1;padding:48px 64px;min-height:calc(100vh - 120px);text-align:center;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px}
.c img{width:84px;height:84px;object-fit:contain;border-radius:50%}
.org{font-size:22px;letter-spacing:.06em;text-transform:uppercase}
h1{font-size:44px;margin:6px 0;color:#0b63d1;font-weight:normal}
.pre{font-style:italic;color:#475569}
.name{font-size:38px;border-bottom:1px solid #94a3b8;padding:0 32px 6px;margin:4px 0}
.line{font-size:18px;max-width:640px;line-height:1.5}
.sig{display:flex;gap:120px;margin-top:40px;font-size:14px;color:#475569}
.sig div{border-top:1px solid #94a3b8;padding-top:6px;min-width:200px}
.meta{margin-top:18px;font:12px/1.4 Arial,sans-serif;color:#64748b}
</style></head><body><div class="c">
${logoSrc ? `<img src="${esc(logoSrc)}" alt="">` : ""}
<div class="org">${esc(view.organization.name)}</div>
<h1>${esc(spec.title)}</h1>
<div class="pre">This certifies that</div>
<div class="name">${esc(view.member.displayName)}</div>
<div class="line">${spec.line(view)}</div>
<div class="sig"><div>Pastor / Director</div><div>Date: ${esc(fmtDate(doc.issuedAt ?? doc.createdAt))}</div></div>
<div class="meta">Certificate No. ${esc(doc.serial ?? doc.id)} · Issued ${esc(fmtDate(doc.issuedAt ?? doc.createdAt))}</div>
</div><script>window.onload=function(){setTimeout(function(){window.print()},250)}</script></body></html>`);
  win.document.close();
  return true;
}

function rows(view: MemberProfileView): [string, string][] {
  const m = view.member;
  const d = view.details;
  const out: [string, string][] = [
    ["Full name", m.displayName],
    ["Preferred name", d.preferredName],
    ["Member ID", d.membershipNumber || m.id],
    ["Organization", view.organization.name],
    ["Organization role", m.isOwner ? "Organization Owner" : (ROLE_LABEL[m.role] ?? m.role)],
    ["Church membership role", d.churchRole],
    ["Membership type", d.membershipType],
    ["Status", STATUS_LABEL[m.status] ?? m.status],
    ["Member since", fmtDate(m.joinedAt)],
    ["Location", m.location],
    ["Gender", d.gender],
    ["Languages", (d.languages ?? []).join(", ")],
  ];
  if (view.access.canViewPrivate) {
    out.push(["Date of birth", fmtDate(m.dateOfBirth)], ["Email", m.email ?? ""], ["Phone", m.phone ?? ""], ["Address", addressLines(m.address).join(", ")]);
    if (d.emergencyContact) out.push(["Emergency contact", [d.emergencyContact.name, d.emergencyContact.relationship, d.emergencyContact.phone].filter(Boolean).join(" · ")]);
  }
  out.push(
    ["Baptism", d.baptism?.status === "completed" ? `Completed ${fmtDate(d.baptism.date)}` : (d.baptism?.status ?? "not_recorded").replace("_", " ")],
    ["Confirmation", d.confirmation?.status === "completed" ? `Completed ${fmtDate(d.confirmation.date)}` : (d.confirmation?.status ?? "not_recorded").replace("_", " ")],
    ["Ministries", view.ministries.filter((x) => x.active).map((x) => `${x.name} (${x.role})`).join("; ")],
  );
  if (view.attendance) out.push(["Meetings attended", String(view.attendance.meetingsAttended)], ["Attendance rate", view.attendance.attendanceRate == null ? "—" : `${view.attendance.attendanceRate}%`]);
  if (d.family) {
    out.push(["Spouse", d.family.spouse?.name ?? ""], ["Children", d.family.children.map((c) => c.name).join(", ")], ["Household", d.family.household.map((c) => c.name).join(", ")]);
  }
  return out;
}

function download(name: string, type: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "member";

/** Notes are never exported; documents export as metadata only. */
export function exportMember(view: MemberProfileView, format: "csv" | "json") {
  const name = `${slug(view.member.displayName)}-profile-${new Date().toISOString().slice(0, 10)}`;
  if (format === "csv") {
    const cell = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["Field", "Value"], ...rows(view)].map((r) => r.map(cell).join(","));
    lines.push("", [cell("Timeline date"), cell("Kind"), cell("Title"), cell("Description")].join(","));
    for (const t of view.timeline) lines.push([fmtDate(t.date, false), t.kind, t.title, t.description].map(cell).join(","));
    download(`${name}.csv`, "text/csv;charset=utf-8", "﻿" + lines.join("\r\n"));
    return;
  }
  const payload = {
    exportedAt: new Date().toISOString(),
    organization: view.organization.name,
    profile: Object.fromEntries(rows(view)),
    ministries: view.ministries,
    timeline: view.timeline,
    documents: (view.documents ?? []).map(({ id, category, title, serial, issuedAt, expiresAt, createdAt }) => ({ id, category, title, serial, issuedAt, expiresAt, createdAt })),
  };
  download(`${name}.json`, "application/json", JSON.stringify(payload, null, 2));
}

export { rows as profileRows };
