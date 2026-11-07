import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAcademyToast } from "../../../lib/academyToastStore";
import { fetchSiteInfoForEdit, saveCampusStats, saveSiteInfo, SITE_FIELDS, type CampusStat, type SiteInfo } from "../../../lib/siteInfo";

/**
 * Admin → Settings → Institution. Edits the information shown on the public
 * Academy pages: Contact page, footer, social links and the Campus page
 * (hero text, photo and statistics). Saved to the Academy content system.
 */
export default function InstitutionSiteSettings() {
  const toast = useAcademyToast((s) => s.showToast);
  const [info, setInfo] = useState<SiteInfo>({});
  const [stats, setStats] = useState<CampusStat[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setStatus("loading");
    fetchSiteInfoForEdit()
      .then(({ info: i, stats: s }) => {
        setInfo(i);
        setStats(s);
        setStatus("ready");
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setStatus("error");
      });
  };
  useEffect(load, []);

  async function save() {
    const badUrl = SITE_FIELDS.find((f) => (f.key.startsWith("social_") || f.key === "website" || f.key === "campus_image") && info[f.key] && !/^https?:\/\//i.test(info[f.key] ?? ""));
    if (badUrl) return toast(`${badUrl.label} must start with https://`);
    if (info.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.email)) return toast("Check the contact email.");
    setSaving(true);
    try {
      await saveSiteInfo(info);
      await saveCampusStats(stats);
      toast("Institution settings saved — public pages updated");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") return <div className="card" style={{ padding: 24 }}>Loading institution settings…</div>;
  if (status === "error")
    return (
      <div className="card" style={{ padding: 24 }}>
        Couldn’t load settings. {error}
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-outline btn-sm" onClick={load}>Try again</button>
        </div>
      </div>
    );

  const groups = [...new Set(SITE_FIELDS.map((f) => f.group))];

  return (
    <>
      {groups.map((g) => (
        <div key={g} className="card" style={{ padding: 24, marginBottom: 18 }}>
          <h3>{g === "Campus page" ? "Campus page (/academy/campus)" : g}</h3>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>
            {g === "Contact" && "Shown on the Contact page. Empty fields are hidden."}
            {g === "Social links" && "Shown as icons in the Academy footer. Leave empty to hide a network."}
            {g === "Identity" && "Used in the footer and page titles."}
            {g === "Campus page" && "Empty fields use the default text. Without a photo URL the page shows an illustration."}
          </p>
          <div className="form-grid" style={{ marginTop: 16 }}>
            {SITE_FIELDS.filter((f) => f.group === g).map((f) => (
              <div key={f.key} className={`field${"multiline" in f && f.multiline ? " full" : ""}`}>
                <label>{f.label}</label>
                {"multiline" in f && f.multiline ? (
                  <textarea rows={3} value={info[f.key] ?? ""} placeholder={f.placeholder} onChange={(e) => setInfo({ ...info, [f.key]: e.target.value })} />
                ) : (
                  <input value={info[f.key] ?? ""} placeholder={f.placeholder} onChange={(e) => setInfo({ ...info, [f.key]: e.target.value })} />
                )}
              </div>
            ))}
          </div>

          {g === "Campus page" && (
            <>
              <h4 style={{ marginTop: 22, fontSize: 15 }}>Campus statistics</h4>
              <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>The numbers in the Campus hero (e.g. “5,000+ / Students”). Only real figures — leave the list empty to hide the row.</p>
              {stats.map((s, i) => (
                <div key={s._id || i} className="form-grid" style={{ marginTop: 10, alignItems: "end" }}>
                  <div className="field">
                    <label>Value</label>
                    <input value={s.value} placeholder="5,000+" onChange={(e) => setStats(stats.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                  </div>
                  <div className="field">
                    <label>Label</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input value={s.label} placeholder="Students" onChange={(e) => setStats(stats.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setStats(stats.filter((_, j) => j !== i))}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
              {stats.length < 6 && (
                <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => setStats([...stats, { value: "", label: "" }])}>
                  + Add statistic
                </button>
              )}
            </>
          )}
        </div>
      ))}

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>
          {saving ? "Saving…" : "Save Institution Settings"}
        </button>
        <Link className="btn btn-outline btn-sm" to="/academy/contact" target="_blank">View Contact page</Link>
        <Link className="btn btn-outline btn-sm" to="/academy/campus" target="_blank">View Campus page</Link>
      </div>
    </>
  );
}
