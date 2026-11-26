/* ============================================================================
   COUNTRIES (worldwide, not US-only)
   ISO 3166-1 alpha-2 codes; names come from the browser (Intl.DisplayNames)
   in the viewer's language, so nothing is hardcoded per language.
============================================================================ */

const CODES = (
  "AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ " +
  "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR " +
  "GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IQ IR IS IT JE JM JO JP " +
  "KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ " +
  "NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW " +
  "SA SB SC SD SE SG SH SI SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ " +
  "UA UG US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW"
).split(" ");

let cache: Array<{ code: string; name: string }> | null = null;

export function countryName(code: string): string {
  const upper = (code || "").toUpperCase();
  if (!upper) return "";
  try {
    return new Intl.DisplayNames(undefined, { type: "region" }).of(upper) ?? upper;
  } catch {
    return upper;
  }
}

/** Every country, sorted by name in the viewer's language. */
export function countryOptions(): Array<{ code: string; name: string }> {
  if (cache) return cache;
  cache = CODES.map((code) => ({ code, name: countryName(code) })).sort((a, b) => a.name.localeCompare(b.name));
  return cache;
}
