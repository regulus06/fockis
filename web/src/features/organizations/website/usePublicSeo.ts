/**
 * usePublicSeo.ts
 * -----------------------------------------------------------------------------
 * Search and sharing metadata for a public organization homepage: page title,
 * meta description, canonical URL, Open Graph / Twitter tags, robots, and
 * schema.org structured data (JSON-LD). Everything is removed / restored when
 * the page unmounts, so other pages keep their own metadata.
 *
 * The app renders in the browser: crawlers that run JavaScript (Google does)
 * see these tags. Nothing here guarantees indexing or ranking.
 * -----------------------------------------------------------------------------
 */

import { useEffect } from "react";

export interface PublicSeo {
  title: string;
  description: string;
  canonicalPath: string;
  image?: string | null;
  /** false = ask search engines not to index (unlisted organizations). */
  index: boolean;
  jsonLd?: Record<string, unknown> | null;
}

const MARK = "data-fockis-seo";

function absolute(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url, window.location.origin).toString();
  } catch {
    return null;
  }
}

export function usePublicSeo(seo: PublicSeo | null): void {
  const key = seo ? JSON.stringify(seo) : "";
  useEffect(() => {
    if (!seo) return;
    const head = document.head;
    const previousTitle = document.title;
    const added: Element[] = [];
    const hidden: { el: Element; attr: string | null }[] = [];

    const meta = (attr: "name" | "property", name: string, content: string | null | undefined) => {
      if (!content) return;
      // Hide an existing tag with the same name while this page is shown.
      head.querySelectorAll(`meta[${attr}="${name}"]:not([${MARK}])`).forEach((el) => {
        hidden.push({ el, attr: el.getAttribute("content") });
        el.setAttribute("content", content);
      });
      if (head.querySelector(`meta[${attr}="${name}"]`)) return;
      const el = document.createElement("meta");
      el.setAttribute(attr, name);
      el.setAttribute("content", content);
      el.setAttribute(MARK, "");
      head.appendChild(el);
      added.push(el);
    };

    const canonical = absolute(seo.canonicalPath);
    const image = absolute(seo.image);
    const description = seo.description.replace(/\s+/g, " ").trim().slice(0, 300);

    document.title = seo.title;
    meta("name", "description", description);
    meta("name", "robots", seo.index ? "index, follow" : "noindex, nofollow");
    meta("property", "og:type", "website");
    meta("property", "og:title", seo.title);
    meta("property", "og:description", description);
    meta("property", "og:url", canonical);
    meta("property", "og:image", image);
    meta("name", "twitter:card", image ? "summary_large_image" : "summary");
    meta("name", "twitter:title", seo.title);
    meta("name", "twitter:description", description);
    meta("name", "twitter:image", image);

    if (canonical) {
      const link = document.createElement("link");
      link.rel = "canonical";
      link.href = canonical;
      link.setAttribute(MARK, "");
      head.appendChild(link);
      added.push(link);
    }
    if (seo.jsonLd) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute(MARK, "");
      script.textContent = JSON.stringify(seo.jsonLd).replace(/</g, "\\u003c");
      head.appendChild(script);
      added.push(script);
    }

    return () => {
      document.title = previousTitle;
      added.forEach((el) => el.remove());
      hidden.forEach(({ el, attr }) => (attr === null ? el.removeAttribute("content") : el.setAttribute("content", attr)));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

/** Private screens (dashboards, member portal): ask search engines not to index them. */
export function useNoIndex(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const el = document.createElement("meta");
    el.name = "robots";
    el.content = "noindex, nofollow";
    el.setAttribute(MARK, "");
    document.head.appendChild(el);
    return () => el.remove();
  }, [enabled]);
}
