/**
 * academyTokenGuard.ts
 * -----------------------------------------------------------------------------
 * Ties the Academy sign-in to the Fockis account that was signed in when it
 * was created.
 *
 * Academy has its own accounts and keeps its own token ("academyToken").
 * Before this guard, that token stayed in the browser when someone signed out
 * of Fockis or switched to another Fockis account, so the next person was
 * still signed in to Academy as the previous one. They could then see that
 * person's "Edit in Studio" buttons, classes and school pages.
 *
 * Now every read of the Academy token checks that the same Fockis account (or
 * the same "nobody") is still signed in. If not, the Academy token is removed
 * and the visitor is treated as signed out of Academy.
 *
 * No imports on purpose: academyApi.ts and academySession.ts both use this.
 * -----------------------------------------------------------------------------
 */

const ACADEMY_KEYS = ["academyToken", "academy_token"];
const OWNER_KEY = "academyTokenOwner";
const FOCKIS_KEYS = ["accessToken", "access_token", "token", "authToken"];

/** Who is signed in to the main Fockis app ("" when nobody is). */
function fockisAccount(): string {
  try {
    for (const k of FOCKIS_KEYS) {
      const raw = localStorage.getItem(k)?.trim();
      if (!raw) continue;
      const part = raw.replace(/^Bearer\s+/i, "").split(".")[1];
      if (!part) return "fockis";
      const json = JSON.parse(decodeURIComponent(escape(atob(part.replace(/-/g, "+").replace(/_/g, "/")))));
      const id = json?.sub ?? json?.userId ?? json?.id ?? json?._id ?? json?.email;
      // An Academy token stored under a shared key is not a Fockis account.
      if (json?.authType === "academy") continue;
      return id ? String(id) : "fockis";
    }
  } catch {
    return "fockis";
  }
  return "";
}

function clearAcademy() {
  try {
    ACADEMY_KEYS.forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem(OWNER_KEY);
  } catch {
    /* storage unavailable */
  }
}

/** Call right after saving a new Academy token. */
export function rememberAcademyOwner(): void {
  try {
    localStorage.setItem(OWNER_KEY, `fockis:${fockisAccount()}`);
  } catch {
    /* storage unavailable */
  }
}

/**
 * The Academy token, but only while the Fockis account that created it is
 * still the one signed in. Tokens saved before this check existed have no
 * owner and are removed once, so the person signs in to Academy again.
 */
export function readAcademyToken(): string | null {
  try {
    let token: string | null = null;
    for (const k of ACADEMY_KEYS) {
      const v = localStorage.getItem(k);
      if (v) {
        token = v;
        break;
      }
    }
    if (!token) return null;
    if (localStorage.getItem(OWNER_KEY) !== `fockis:${fockisAccount()}`) {
      clearAcademy();
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

/** Remove the Academy sign-in (used by "sign out"). */
export function forgetAcademyToken(): void {
  clearAcademy();
}
