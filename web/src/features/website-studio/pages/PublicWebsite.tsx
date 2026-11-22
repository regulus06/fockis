import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import SiteRenderer, { findPage } from "../renderer/SiteRenderer";
import { Icon } from "../renderer/icons";
import { websiteStudioApi, apiError } from "../services/websiteStudioApi";
import type { SiteContent } from "../types/content";
import type { PublicSite } from "../types/studio";
import "../styles/studio.scss";

const WIDTH = { desktop: "100%", tablet: "820px", mobile: "390px" } as const;

function setMeta(attr: "name" | "property", key: string, value: string | undefined) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!value) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    el.dataset.wsMeta = "1";
    document.head.appendChild(el);
  }
  el.content = value;
}

function setLink(rel: string, href: string | undefined) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"][data-ws-meta]`);
  if (!href) return el?.remove();
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    el.dataset.wsMeta = "1";
    document.head.appendChild(el);
  }
  el.href = href;
}

/** Applies SEO, social sharing and indexing metadata for the current page. */
function useSeo(content: SiteContent | null, pageSlug: string, url: string) {
  useEffect(() => {
    if (!content) return;
    const page = findPage(content, pageSlug, false) ?? content.pages[0];
    const s = content.settings;
    const title = page.seo.title && !page.isHomepage ? page.seo.title : page.isHomepage ? s.seo.siteTitle || s.businessName : `${page.title} | ${s.businessName}`;
    const description = page.seo.description || s.seo.description;
    const image = page.seo.ogImage || s.seo.ogImage;
    const prevTitle = document.title;
    document.title = title;
    setMeta("name", "description", description);
    setMeta("name", "robots", !s.seo.allowIndexing || page.seo.noindex ? "noindex, nofollow" : "index, follow");
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:image", image ? new URL(image, window.location.origin).href : undefined);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:url", url);
    setMeta("name", "twitter:card", image ? "summary_large_image" : "summary");
    setLink("canonical", page.seo.canonicalUrl || url);
    setLink("icon", s.faviconUrl || undefined);
    return () => {
      document.title = prevTitle;
      document.head.querySelectorAll("[data-ws-meta]").forEach((el) => el.remove());
    };
  }, [content, pageSlug, url]);
}

function NotPublished({ message }: { message: string }) {
  return (
    <div className="wst-public-missing" style={{ minHeight: "100vh", display: "grid", placeItems: "center", textAlign: "center", fontFamily: "system-ui, sans-serif", padding: 24 }}>
      <div>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>Website unavailable</h1>
        <p style={{ color: "#666" }}>{message}</p>
        <p style={{ marginTop: 18 }}><a href="https://fockis.com" style={{ color: "#2563eb" }}>Create your own website with Fockis</a></p>
      </div>
    </div>
  );
}

function LiveSite({ site, basePath, rest }: { site: PublicSite; basePath: string; rest: string }) {
  const location = useLocation();
  const [first, ...others] = rest.split("/").filter(Boolean);
  const slug = first ?? "";
  void others;
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const runtime = useMemo(() => ({ siteId: site.id, kind: "website" as const, basePath, query }), [site.id, basePath, query]);
  const url = `${window.location.origin}${basePath}/${slug}`.replace(/\/$/, "");
  useSeo(site.content, slug, url);
  useEffect(() => {
    void websiteStudioApi.trackView(site.id, `/${slug}`);
  }, [site.id, slug]);
  const known = slug === "" || slug === "product" || !!findPage(site.content, slug, false);
  if (!known) {
    return <NotPublished message="This page does not exist." />;
  }
  return <SiteRenderer content={site.content} pageSlug={slug} mode="live" runtime={runtime} />;
}

/** Published website at /s/:siteSlug/* — works without opening the editor. */
export default function PublicWebsite() {
  const { siteSlug = "", "*": rest = "" } = useParams();
  const [site, setSite] = useState<PublicSite | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    websiteStudioApi.publicBySlug(siteSlug).then(setSite).catch((e) => setError(apiError(e, "This website is not available.")));
  }, [siteSlug]);
  if (error) return <NotPublished message={error} />;
  if (!site) return null;
  return <LiveSite site={site} basePath={`/s/${site.slug}`} rest={rest} />;
}

/** Published website on a Fockis subdomain or a verified custom domain. */
export function HostedWebsite() {
  const location = useLocation();
  const [site, setSite] = useState<PublicSite | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    websiteStudioApi.publicByHost(window.location.host).then(setSite).catch((e) => setError(apiError(e, "No website is connected to this address.")));
  }, []);
  if (error) return <NotPublished message={error} />;
  if (!site) return null;
  return <LiveSite site={site} basePath="" rest={location.pathname} />;
}

/** Draft preview for owners/managers (not public). */
export function WebsitePreview() {
  const { websiteId = "" } = useParams();
  const [content, setContent] = useState<SiteContent | null>(null);
  const [name, setName] = useState("");
  const [page, setPage] = useState("");
  const [query, setQuery] = useState("");
  const [device, setDevice] = useState<keyof typeof WIDTH>("desktop");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    websiteStudioApi.website(websiteId).then((w) => (setContent(w.content), setName(w.name))).catch((e) => setError(apiError(e)));
  }, [websiteId]);
  const runtime = useMemo(() => ({ siteId: websiteId, kind: "website" as const, basePath: "", query: new URLSearchParams(query) }), [websiteId, query]);
  if (error) return <NotPublished message={error} />;
  if (!content) return null;
  return (
    <div className="wst-preview">
      <header className="wst-preview__bar">
        <Link to={`/website-studio/editor/${websiteId}`} className="wst-btn wst-btn--ghost wst-btn--sm"><Icon name="ChevronLeft" size={16} /> Back to editor</Link>
        <strong>Preview: {name}</strong>
        <div className="wst-seg">
          {(["desktop", "tablet", "mobile"] as const).map((d) => <button type="button" key={d} className={device === d ? "is-active" : ""} onClick={() => setDevice(d)}>{d}</button>)}
        </div>
        <span className="wst-muted">Draft — not visible to the public until you publish.</span>
      </header>
      <div className="wst-preview__stage">
        <div className="wst-preview__frame" style={{ width: WIDTH[device] }}>
          <SiteRenderer content={content} pageSlug={page} mode="preview" runtime={runtime} onNavigate={(s, q) => (setPage(s === "home" ? "" : s), setQuery(q.replace(/^\?/, "")), window.scrollTo({ top: 0 }))} />
        </div>
      </div>
    </div>
  );
}
