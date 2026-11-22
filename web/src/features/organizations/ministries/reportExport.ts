/**
 * reportExport.ts
 * -----------------------------------------------------------------------------
 * Client-side exports for ministry reports: CSV, Excel (.xlsx) and PDF.
 *
 *   CSV   UTF-8 with BOM so Excel opens accents correctly.
 *   XLSX  A real Office Open XML workbook (one sheet), packed in a ZIP built
 *         here (stored entries + CRC-32) — no extra dependency.
 *   PDF   A clean printable page opened in a new window; the browser's
 *         "Save as PDF" produces the file (same approach as certificates).
 * -----------------------------------------------------------------------------
 */

export type Cell = string | number | null | undefined;

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const safeFileName = (s: string) => s.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "report";

/* ------------------------------------------------------------------- CSV */

export function exportCsv(name: string, headers: string[], rows: Cell[][]) {
  const esc = (v: Cell) => {
    const s = v == null ? "" : String(v);
    // Neutralise spreadsheet formulas in user-entered text.
    const safe = /^[=+\-@]/.test(s) && typeof v !== "number" ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const body = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  download(`${name}.csv`, new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" }));
}

/* ------------------------------------------------------------------ XLSX */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zip(files: { name: string; text: string }[]): Blob {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = enc.encode(f.text);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(8, 0, true); // stored
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    parts.push(new Uint8Array(local.buffer), name, data);

    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true);
    cen.setUint16(4, 20, true);
    cen.setUint16(6, 20, true);
    cen.setUint32(16, crc, true);
    cen.setUint32(20, data.length, true);
    cen.setUint32(24, data.length, true);
    cen.setUint16(28, name.length, true);
    cen.setUint32(42, offset, true);
    central.push(new Uint8Array(cen.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const cenSize = central.reduce((a, b) => a + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cenSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)] as BlobPart[], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

const xml = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c] as string).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");

function colName(i: number) {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

export function exportXlsx(name: string, sheetName: string, headers: string[], rows: Cell[][]) {
  const all = [headers, ...rows];
  const sheetRows = all
    .map((r, ri) => {
      const cells = r
        .map((v, ci) => {
          const ref = `${colName(ci)}${ri + 1}`;
          const style = ri === 0 ? ' s="1"' : "";
          if (typeof v === "number" && Number.isFinite(v)) return `<c r="${ref}"${style}><v>${v}</v></c>`;
          if (v == null || v === "") return "";
          return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${xml(String(v))}</t></is></c>`;
        })
        .join("");
      return `<row r="${ri + 1}">${cells}</row>`;
    })
    .join("");
  const widths = headers.map((h, i) => Math.min(48, Math.max(10, h.length + 2, ...rows.map((r) => String(r[i] ?? "").length + 2))));
  const cols = `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>`;
  const safeSheet = xml(sheetName.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Report");

  download(
    `${name}.xlsx`,
    zip([
      {
        name: "[Content_Types].xml",
        text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
      },
      {
        name: "_rels/.rels",
        text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      },
      {
        name: "xl/workbook.xml",
        text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${safeSheet}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      },
      {
        name: "xl/_rels/workbook.xml.rels",
        text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
      },
      {
        name: "xl/styles.xml",
        text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
      },
      {
        name: "xl/worksheets/sheet1.xml",
        text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${cols}<sheetData>${sheetRows}</sheetData></worksheet>`,
      },
    ]),
  );
}

/* ------------------------------------------------------------------- PDF */

/** Opens a printable report; returns false when pop-ups are blocked. */
export function exportPdf(title: string, subtitle: string, sections: { heading?: string; headers: string[]; rows: Cell[][] }[]): boolean {
  const win = window.open("", "_blank", "noopener=no,width=1000,height=760");
  if (!win) return false;
  const h = (s: Cell) => xml(s == null ? "" : String(s));
  const tables = sections
    .map(
      (sec) => `${sec.heading ? `<h2>${h(sec.heading)}</h2>` : ""}<table><thead><tr>${sec.headers.map((x) => `<th>${h(x)}</th>`).join("")}</tr></thead><tbody>${
        sec.rows.length ? sec.rows.map((r) => `<tr>${r.map((c) => `<td>${h(c)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${sec.headers.length}">No data</td></tr>`
      }</tbody></table>`,
    )
    .join("");
  win.document.open();
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${h(title)}</title><style>
    *{box-sizing:border-box}body{font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f1d3a;margin:32px}
    h1{font-size:22px;margin:0 0 4px}p{margin:0 0 20px;color:#5b6b88;font-size:13px}
    h2{font-size:15px;margin:22px 0 8px}table{width:100%;border-collapse:collapse;font-size:12px}
    th{background:#eef3ff;text-align:left;padding:8px;border-bottom:2px solid #c9d6f5}
    td{padding:7px 8px;border-bottom:1px solid #e3e9f5}@page{margin:14mm}
  </style></head><body><h1>${h(title)}</h1><p>${h(subtitle)}</p>${tables}
  <script>window.onload=function(){setTimeout(function(){window.print()},250)}</script></body></html>`);
  win.document.close();
  return true;
}
