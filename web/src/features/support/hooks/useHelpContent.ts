import { useEffect } from "react";
import { create } from "zustand";

import { supportApi, supportErrorMessage } from "../services/supportApi";
import type { FaqItem, HelpArticle, HelpContentItem } from "../types";

interface HelpContentState {
  articles: HelpArticle[];
  faqs: FaqItem[];
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  load: (force?: boolean) => Promise<void>;
}

const toArticle = (item: HelpContentItem): HelpArticle => ({
  id: item.slug,
  topic: item.topic,
  title: item.title,
  summary: item.summary,
  body: item.body,
  links: item.links,
  keywords: item.keywords,
  featured: item.featured,
});

const toFaq = (item: HelpContentItem): FaqItem => ({
  id: item.slug,
  topic: item.topic,
  question: item.title,
  answer: item.summary,
  link: item.links[0],
});

/**
 * Published Help Center content (GET /support/help/articles), managed by
 * staff in Admin Center → Help Articles Manager. Loaded once per session.
 */
export const useHelpContentStore = create<HelpContentState>((set, get) => ({
  articles: [],
  faqs: [],
  status: "idle",
  error: null,
  load: async (force = false) => {
    if (!force && (get().status === "loading" || get().status === "ready")) return;
    set({ status: "loading", error: null });
    try {
      const items = await supportApi.helpContent();
      set({
        articles: items.filter((i) => i.kind === "article").map(toArticle),
        faqs: items.filter((i) => i.kind === "faq").map(toFaq),
        status: "ready",
      });
    } catch (error) {
      set({ status: "error", error: supportErrorMessage(error, "The Help Center couldn't be loaded.") });
    }
  },
}));

export function useHelpContent() {
  const state = useHelpContentStore();
  useEffect(() => {
    void state.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return state;
}
