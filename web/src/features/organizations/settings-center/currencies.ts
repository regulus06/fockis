/**
 * currencies.ts — every valid ISO 4217 currency, from the browser's maintained
 * list (Intl), with name, symbol, decimal precision and a flag where one
 * exists. Falls back to a short list on very old browsers.
 */

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  flag: string;
}

const FALLBACK = ["USD", "HTG", "EUR", "CAD", "GBP", "DOP", "MXN", "BRL", "XOF", "XAF", "JPY", "CHF", "AUD", "CNY", "INR", "NGN", "ZAR", "KES", "GHS", "JMD", "TTD", "BSD", "COP", "PEN", "CLP", "ARS"];
const NOT_IN_USE = new Set(["XAU", "XAG", "XPD", "XPT", "XTS", "XXX", "XDR", "XSU", "XUA", "XBA", "XBB", "XBC", "XBD"]);

function flagFor(code: string): string {
  if (code === "EUR") return "🇪🇺";
  if (code.startsWith("X")) return "";
  const region = code.slice(0, 2);
  if (!/^[A-Z]{2}$/.test(region)) return "";
  return String.fromCodePoint(...[...region].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

let cache: CurrencyInfo[] | null = null;

export function allCurrencies(): CurrencyInfo[] {
  if (cache) return cache;
  let codes: string[] = FALLBACK;
  try {
    const list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("currency");
    if (list?.length) codes = list;
  } catch {
    /* keep fallback */
  }
  const names = (() => {
    try {
      return new Intl.DisplayNames(["en"], { type: "currency" });
    } catch {
      return null;
    }
  })();
  cache = codes
    .filter((c) => !NOT_IN_USE.has(c))
    .map((code) => {
      let symbol = code;
      let decimals = 2;
      try {
        const nf = new Intl.NumberFormat("en", { style: "currency", currency: code, currencyDisplay: "narrowSymbol" });
        symbol = nf.formatToParts(0).find((p) => p.type === "currency")?.value ?? code;
        decimals = nf.resolvedOptions().maximumFractionDigits ?? 2;
      } catch {
        /* keep defaults */
      }
      return { code, name: names?.of(code) ?? code, symbol: symbol === code ? "" : symbol, decimals, flag: flagFor(code) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  return cache;
}

export function currencyInfo(code: string): CurrencyInfo {
  return allCurrencies().find((c) => c.code === code) ?? { code, name: code, symbol: "", decimals: 2, flag: flagFor(code) };
}

export function currencyLabel(code: string): string {
  const c = currencyInfo(code);
  return `${c.code} – ${c.name}${c.symbol ? ` (${c.symbol})` : ""}`;
}

/** Formats with the currency's own precision (e.g. JPY 0 decimals, HTG 2). */
export function formatMoney(amount: number, code: string, locale?: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: code }).format(amount);
  } catch {
    return `${amount.toFixed(currencyInfo(code).decimals)} ${code}`;
  }
}

export function searchCurrencies(query: string): CurrencyInfo[] {
  const q = query.trim().toLowerCase();
  const list = allCurrencies();
  if (!q) return list;
  return list.filter((c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.symbol.toLowerCase() === q);
}

/* ------------------------------------------------------------------ time zones */

export function allTimeZones(): { id: string; label: string }[] {
  let zones: string[] = [];
  try {
    zones = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
  } catch {
    zones = [];
  }
  if (!zones.length) zones = ["America/Port-au-Prince", "America/New_York", "America/Santo_Domingo", "America/Toronto", "Europe/Paris", "UTC"];
  const now = new Date();
  return zones.map((id) => {
    let offset = "";
    try {
      offset = new Intl.DateTimeFormat("en", { timeZone: id, timeZoneName: "shortOffset" }).formatToParts(now).find((p) => p.type === "timeZoneName")?.value ?? "";
    } catch {
      /* ignore */
    }
    const city = id.split("/").slice(1).join(" / ").replace(/_/g, " ") || id;
    return { id, label: `${city} (${id})${offset ? ` · ${offset}` : ""}` };
  });
}

export const LANGUAGES: { id: string; label: string }[] = [
  { id: "fr", label: "Français (FR)" },
  { id: "ht", label: "Kreyòl ayisyen (HT)" },
  { id: "en", label: "English (EN)" },
  { id: "es", label: "Español (ES)" },
  { id: "pt", label: "Português (PT)" },
  { id: "de", label: "Deutsch (DE)" },
  { id: "it", label: "Italiano (IT)" },
  { id: "nl", label: "Nederlands (NL)" },
  { id: "sw", label: "Kiswahili (SW)" },
  { id: "ar", label: "العربية (AR)" },
  { id: "zh", label: "中文 (ZH)" },
];

export const DATE_FORMATS = [
  { id: "DD/MM/YYYY", sample: "31/12/2026" },
  { id: "MM/DD/YYYY", sample: "12/31/2026" },
  { id: "YYYY-MM-DD", sample: "2026-12-31" },
  { id: "D MMM YYYY", sample: "31 Dec 2026" },
];
