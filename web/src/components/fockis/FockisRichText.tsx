import { Fragment, type ReactNode } from "react";

/**
 * Renders post text with #hashtags, @mentions and web links highlighted.
 *
 * Fockis has no hashtag or @username routes today, so tags and mentions
 * are styled text (not links). Plain http(s) links open in a new tab.
 * Text is never injected as HTML.
 */

const TOKEN_PATTERN =
  /(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?]|(?<![\p{L}\p{N}_&/])#[\p{L}\p{N}_]{1,64}|(?<![\p{L}\p{N}_.])@[A-Za-z0-9_](?:[A-Za-z0-9_.]{0,28}[A-Za-z0-9_])?)/gu;

export default function FockisRichText({ text }: { text: string }) {
  if (!text) return null;

  const parts: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(TOKEN_PATTERN)) {
    const value = match[0];
    const start = match.index ?? 0;

    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }

    if (value.startsWith("http")) {
      parts.push(
        <a
          key={`l-${start}`}
          className="fk-rich-text__link"
          href={value}
          target="_blank"
          rel="noopener noreferrer nofollow"
        >
          {value.replace(/^https?:\/\//, "")}
        </a>,
      );
    } else if (value.startsWith("#")) {
      parts.push(
        <span key={`t-${start}`} className="fk-rich-text__tag">
          {value}
        </span>,
      );
    } else {
      parts.push(
        <span key={`m-${start}`} className="fk-rich-text__mention">
          {value}
        </span>,
      );
    }

    lastIndex = start + value.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <Fragment>{parts}</Fragment>;
}
