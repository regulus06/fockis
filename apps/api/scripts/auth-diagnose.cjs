/**
 * auth-diagnose.cjs: READ-ONLY sign-in / password-reset check.
 *
 *   cd apps/api
 *   node scripts/auth-diagnose.cjs                  (whole database summary)
 *   node scripts/auth-diagnose.cjs person@mail.com  (one account)
 *
 * Changes nothing. Never prints passwords, hashes, tokens or keys; emails are
 * masked. Reads MONGO_URI and mail settings from apps/api/.env.
 */
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

function loadEnv() {
  const file = path.join(__dirname, "..", ".env");
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[m[1]] = v;
  }
  return env;
}

const mask = (e) => {
  const s = String(e ?? "");
  const [u, d] = s.split("@");
  if (!d) return s ? s.slice(0, 2) + "***" : "(none)";
  return `${u.slice(0, 2)}***@${d}`;
};
const BCRYPT = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

(async () => {
  const env = { ...loadEnv(), ...process.env };
  const uri = env.MONGO_URI;
  if (!uri) {
    console.log("MONGO_URI not found in apps/api/.env");
    process.exit(1);
  }

  console.log("== Mail settings in apps/api/.env (Render has its own copy: check it too) ==");
  const from = env.MAIL_FROM || "";
  const fromDomain = (from.match(/@([^>\s]+)/) || [])[1] || "(none)";
  console.log("MAIL_FROM domain   :", fromDomain);
  console.log("RESEND_API_KEY set :", env.RESEND_API_KEY ? "yes" : "no");
  console.log("SMTP_HOST set      :", env.SMTP_HOST ? "yes" : "no");
  console.log("FRONTEND_URL       :", env.FRONTEND_URL || "(not set)");
  if (env.RESEND_API_KEY && /resend\.dev$/i.test(fromDomain)) {
    console.log("!! MAIL_FROM uses resend.dev: Resend then only delivers to YOUR OWN address. Other users get nothing.");
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const users = mongoose.connection.db.collection("users");
  const now = new Date();
  const fields = { email: 1, password: 1, isActive: 1, lockedUntil: 1, failedLoginAttempts: 1, passwordResetRequestedAt: 1, mfaEnabled: 1, createdAt: 1 };

  const target = process.argv[2];
  if (target) {
    const wanted = target.trim().toLowerCase();
    console.log(`\n== Account check for ${mask(wanted)} ==`);
    const exact = await users.findOne({ email: wanted }, { projection: fields });
    const loose = await users
      .find({ email: { $regex: `^\\s*${esc(wanted)}\\s*$`, $options: "i" } }, { projection: fields })
      .toArray();
    console.log("Found by exact email (what login/reset use):", exact ? "YES" : "NO");
    console.log("Found ignoring case/spaces                  :", loose.length);
    for (const u of loose) {
      console.log("  -", JSON.stringify({
        storedEmailMatchesExactly: u.email === wanted,
        storedEmailHasCapitalsOrSpaces: u.email !== String(u.email).trim().toLowerCase(),
        passwordHashLooksValid: BCRYPT.test(String(u.password || "")),
        isActive: u.isActive !== false,
        lockedNow: Boolean(u.lockedUntil && new Date(u.lockedUntil) > now),
        failedLoginAttempts: u.failedLoginAttempts || 0,
        mfaEnabled: Boolean(u.mfaEnabled),
        lastResetEmailRequested: u.passwordResetRequestedAt || null,
      }));
    }
    if (!loose.length) {
      const local = wanted.split("@")[0];
      const similar = await users
        .find({ email: { $regex: `^${esc(local)}@`, $options: "i" } }, { projection: { email: 1 } })
        .limit(10)
        .toArray();
      console.log("No account with that email. Accounts with the same name before @:", similar.map((u) => mask(u.email)));
    }
  } else {
    console.log("\n== Whole database (counts) ==");
    const all = await users.find({}, { projection: fields }).toArray();
    const notNormalized = all.filter((u) => typeof u.email === "string" && u.email !== u.email.trim().toLowerCase());
    const badHash = all.filter((u) => !BCRYPT.test(String(u.password || "")));
    const locked = all.filter((u) => u.lockedUntil && new Date(u.lockedUntil) > now);
    const disabled = all.filter((u) => u.isActive === false);
    const seen = new Map();
    for (const u of all) {
      const k = String(u.email || "").trim().toLowerCase();
      seen.set(k, (seen.get(k) || 0) + 1);
    }
    const dupes = [...seen.entries()].filter(([, n]) => n > 1);
    const domains = new Map();
    for (const u of all) {
      const d = String(u.email || "").split("@")[1]?.toLowerCase() || "(none)";
      domains.set(d, (domains.get(d) || 0) + 1);
    }

    console.log("Users                                   :", all.length);
    console.log("Email stored with capitals/spaces       :", notNormalized.length, notNormalized.slice(0, 15).map((u) => mask(u.email)));
    console.log("Same email twice (ignoring case)        :", dupes.length, dupes.slice(0, 15).map(([e]) => mask(e)));
    console.log("Password not a valid bcrypt hash        :", badHash.length, badHash.slice(0, 15).map((u) => mask(u.email)));
    console.log("Locked right now                        :", locked.length);
    console.log("Disabled (isActive=false)               :", disabled.length);
    console.log("Email domains (top 15)                  :", [...domains.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15));
  }

  await mongoose.disconnect();
})().catch(async (e) => {
  console.error("Check failed:", e.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
