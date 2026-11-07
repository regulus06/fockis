import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { LoadState } from "../../../components/academy/learn/CourseCard";
import FaCourseCard from "../../../components/academy/market/FaCourseCard";
import { Icon } from "../../../components/academy/market/Icon";
import { useAcademyLoad } from "../../../lib/useAcademyLoad";
import { getCatalogCourses, matchesQuery } from "../../../lib/academyLearnApi";

/** /academy/learn — public course catalog (real courses, visibility = public). */
export default function CourseExplore() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const sort = params.get("sort") ?? "";
  const kind = params.get("type") ?? "";
  const price = params.get("price") ?? "";
  const { state, reload } = useAcademyLoad(getCatalogCourses);

  const list = useMemo(() => {
    if (state.status !== "ready") return [];
    const items = state.data.filter((c) => {
      const m = c as typeof c & { kind?: string; isFree?: boolean; price?: number; brandName?: string; category?: string };
      if (kind && (m.kind ?? "course") !== kind) return false;
      const free = m.isFree !== false || !(Number(m.price) > 0);
      if (price === "free" && !free) return false;
      if (price === "paid" && free) return false;
      if (!q) return true;
      return matchesQuery(c, q) || `${m.brandName ?? ""} ${m.category ?? ""}`.toLowerCase().includes(q.trim().toLowerCase());
    });
    if (sort === "new") items.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
    if (sort === "name") items.sort((a, b) => a.name.localeCompare(b.name));
    return items;
  }, [state, q, sort, kind, price]);

  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  return (
    <div className="fa-root fa-page">
      <section className="fa-pagehead">
        <div className="fa-container">
          <h1>Explore classes</h1>
          <p>{q ? `Results for “${q}”` : "Courses, seminars, workshops and live classes from creators and businesses on Fockis."}</p>
        </div>
      </section>
      <div className="fa-container">
        <div className="fa-filterbar fa-card">
          <label className="fa-search fa-search--block">
            <Icon name="search" size={15} />
            <input type="search" value={q} placeholder="Class, topic or business" onChange={(e) => set("q", e.target.value)} aria-label="Search courses" />
          </label>
          <select className="fa-select" value={kind} onChange={(e) => set("type", e.target.value)} aria-label="Type">
            <option value="">All types</option>
            <option value="course">Courses</option>
            <option value="seminar">Seminars</option>
            <option value="live_class">Live classes</option>
            <option value="workshop">Workshops</option>
          </select>
          <select className="fa-select" value={price} onChange={(e) => set("price", e.target.value)} aria-label="Price">
            <option value="">Free & paid</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </select>
          <select className="fa-select" value={sort} onChange={(e) => set("sort", e.target.value)} aria-label="Sort">
            <option value="">Sort: default</option>
            <option value="name">Name (A–Z)</option>
            <option value="new">Newest</option>
          </select>
          {state.status === "ready" && (
            <small className="fa-muted">
              {list.length} {list.length === 1 ? "result" : "results"}
            </small>
          )}
        </div>
        <div className="fa-section">
          {state.status === "loading" && <LoadState status="loading" />}
          {state.status === "error" && <LoadState status="error" error={state.error} onRetry={reload} />}
          {state.status === "ready" &&
            (list.length === 0 ? (
              <LoadState status="empty" empty={q || kind || price ? "Nothing matches those filters yet." : "No classes are published yet."} />
            ) : (
              <div className="fa-cgrid">
                {list.map((c) => (
                  <FaCourseCard key={c._id || c.code} course={c} />
                ))}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
