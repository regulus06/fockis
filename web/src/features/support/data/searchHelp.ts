import { HELP_TOPICS } from "./helpTopics";
import type { FaqItem, HelpArticle, HelpTopic } from "../types";

export type HelpSearchResult =
  | { type: "article"; score: number; item: HelpArticle }
  | { type: "faq"; score: number; item: FaqItem }
  | { type: "topic"; score: number; item: HelpTopic };

const words = (text: string) =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1);

function score(query: string, title: string, fields: string[]): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  const hay = [title, ...fields].join(" ").toLowerCase();
  let total = 0;
  if (title.toLowerCase().includes(q)) total += 12;
  else if (hay.includes(q)) total += 6;
  for (const w of words(q)) {
    if (title.toLowerCase().includes(w)) total += 4;
    else if (hay.includes(w)) total += 2;
  }
  return total;
}

/** Ranks articles, FAQs and topics for a help search. */
export function searchHelp(query: string, content: { articles: HelpArticle[]; faqs: FaqItem[] }, limit = 50): HelpSearchResult[] {
  if (!query.trim()) return [];
  const results: HelpSearchResult[] = [];
  for (const item of content.articles) {
    const bodyText = item.body.map((b) => [b.heading, b.text, ...(b.steps ?? [])].filter(Boolean).join(" "));
    const s = score(query, item.title, [item.summary, ...(item.keywords ?? []), ...bodyText]);
    if (s > 0) results.push({ type: "article", score: s + 1, item });
  }
  for (const item of content.faqs) {
    const s = score(query, item.question, [item.answer]);
    if (s > 0) results.push({ type: "faq", score: s, item });
  }
  for (const item of HELP_TOPICS) {
    const s = score(query, item.title, [item.description]);
    if (s > 0) results.push({ type: "topic", score: s, item });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function resultLink(result: HelpSearchResult): string {
  if (result.type === "article") return `/help/articles/${result.item.id}`;
  if (result.type === "faq") return `/help/faq?q=${encodeURIComponent(result.item.question)}#${result.item.id}`;
  return `/help/topics/${result.item.id}`;
}

export function resultTitle(result: HelpSearchResult): string {
  return result.type === "faq" ? result.item.question : result.item.title;
}
