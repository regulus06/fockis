import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  getLanguage,
  subscribeToLanguage,
} from "./index";

export type SupportedLanguage =
  | "en"
  | "ht"
  | "fr"
  | "es";

export interface AutoTranslateContextValue {
  language: SupportedLanguage;
  translateText: (text: string) => Promise<string>;
  isTranslating: boolean;
}

export interface AutoTranslateProviderProps {
  children: ReactNode;
  enabled?: boolean;
}

const AutoTranslateContext =
  createContext<AutoTranslateContextValue | null>(null);

const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  "en",
  "ht",
  "fr",
  "es",
];

const CACHE_PREFIX = "fockis_auto_translation_v2";

const memoryCache = new Map<string, string>();

/*
 * Prevent repeated requests when the translation service
 * is unavailable.
 *
 * IMPORTANT:
 * The backend translation controller is:
 *
 *   @Controller("translation")
 *   @Post()
 *
 * Therefore the correct endpoint is:
 *
 *   POST /translation
 *
 * NOT:
 *
 *   POST /translations/translate
 */
let translationServiceUnavailable = false;

const originalTextMap = new WeakMap<Text, string>();

const IGNORED_TAGS = new Set<string>([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "CODE",
  "PRE",
  "TEXTAREA",
  "INPUT",
  "SELECT",
  "OPTION",
  "SVG",
  "PATH",
  "CANVAS",
  "VIDEO",
  "AUDIO",
]);

const IGNORED_ATTRIBUTES = [
  "data-no-translate",
  "data-translate-ignore",
  "translate-ignore",
];

const PROTECTED_WORDS = new Set<string>([
  "Fockis",
  "Stripe",
  "MonCash",
  "NatCash",
  "PayPal",
  "Google",
  "Facebook",
  "Instagram",
  "YouTube",
  "TikTok",
  "WhatsApp",
  "Discord",
  "Microsoft",
  "Apple",
  "Android",
  "iOS",
  "React",
  "TypeScript",
  "JavaScript",
  "NestJS",
  "MongoDB",
  "Mongoose",
  "JWT",
  "API",
  "URL",
  "SVG",
  "HTML",
  "CSS",
]);

function isSupportedLanguage(
  value: unknown,
): value is SupportedLanguage {
  return (
    typeof value === "string" &&
    SUPPORTED_LANGUAGES.includes(
      value as SupportedLanguage,
    )
  );
}

function normalizeText(
  value: string,
): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  let result = "";
  let pendingSpace = false;

  for (const character of trimmed) {
    const whitespace =
      character === " " ||
      character === "\t" ||
      character === "\n" ||
      character === "\r" ||
      character === "\f" ||
      character === "\v" ||
      character === "\u00a0";

    if (whitespace) {
      pendingSpace = true;
      continue;
    }

    if (
      pendingSpace &&
      result.length > 0
    ) {
      result += " ";
    }

    pendingSpace = false;
    result += character;
  }

  return result;
}

function makeCacheKey(
  language: SupportedLanguage,
  text: string,
): string {
  return (
    CACHE_PREFIX +
    ":" +
    language +
    ":" +
    text
  );
}

function readCache(
  language: SupportedLanguage,
  text: string,
): string | null {
  const key = makeCacheKey(
    language,
    text,
  );

  const memoryValue =
    memoryCache.get(key);

  if (memoryValue) {
    return memoryValue;
  }

  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  try {
    const stored =
      window.localStorage.getItem(key);

    if (stored) {
      memoryCache.set(
        key,
        stored,
      );

      return stored;
    }
  } catch {
    return null;
  }

  return null;
}

function writeCache(
  language: SupportedLanguage,
  text: string,
  translatedText: string,
): void {
  const key = makeCacheKey(
    language,
    text,
  );

  memoryCache.set(
    key,
    translatedText,
  );

  if (
    typeof window === "undefined"
  ) {
    return;
  }

  try {
    window.localStorage.setItem(
      key,
      translatedText,
    );
  } catch {
    return;
  }
}

function looksLikeUrl(
  text: string,
): boolean {
  const value =
    text.toLowerCase();

  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("www.") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:")
  );
}

function looksLikeRoute(
  text: string,
): boolean {
  return (
    text.startsWith("/") &&
    !text.includes(" ")
  );
}

function looksLikeFockisId(
  text: string,
): boolean {
  const upper =
    text.toUpperCase();

  if (
    upper.startsWith("FK") &&
    upper.length >= 8 &&
    !upper.includes(" ")
  ) {
    return true;
  }

  return text
    .toLowerCase()
    .startsWith("fockis-");
}

function looksLikeNetworkAddress(
  text: string,
): boolean {
  const value =
    text.toLowerCase();

  return (
    value.includes("://") ||
    value.includes("localhost:") ||
    value.includes("192.168.") ||
    value.includes("127.0.0.1") ||
    value.includes("0.0.0.0")
  );
}

function looksLikeEmail(
  text: string,
): boolean {
  if (
    text.includes(" ") ||
    !text.includes("@")
  ) {
    return false;
  }

  const atIndex =
    text.indexOf("@");

  const dotIndex =
    text.indexOf(
      ".",
      atIndex,
    );

  return (
    atIndex > 0 &&
    dotIndex > atIndex + 1 &&
    dotIndex < text.length - 1
  );
}

function looksLikeNumber(
  text: string,
): boolean {
  if (!text) {
    return false;
  }

  let hasDigit = false;

  for (const character of text) {
    if (
      character >= "0" &&
      character <= "9"
    ) {
      hasDigit = true;
      continue;
    }

    if (
      character === "." ||
      character === "," ||
      character === "$" ||
      character === "%" ||
      character === "+" ||
      character === "-" ||
      character === "/" ||
      character === ":" ||
      character === " "
    ) {
      continue;
    }

    return false;
  }

  return hasDigit;
}

function looksLikeTime(
  text: string,
): boolean {
  const parts =
    text.split(":");

  if (
    parts.length !== 2 &&
    parts.length !== 3
  ) {
    return false;
  }

  for (const part of parts) {
    if (!part) {
      return false;
    }

    for (const character of part) {
      if (
        character < "0" ||
        character > "9"
      ) {
        return false;
      }
    }
  }

  return true;
}

function looksLikeDate(
  text: string,
): boolean {
  let separator = "";

  if (text.includes("/")) {
    separator = "/";
  } else if (
    text.includes("-")
  ) {
    separator = "-";
  }

  if (!separator) {
    return false;
  }

  const parts =
    text.split(separator);

  if (parts.length !== 3) {
    return false;
  }

  for (const part of parts) {
    if (!part) {
      return false;
    }

    for (const character of part) {
      if (
        character < "0" ||
        character > "9"
      ) {
        return false;
      }
    }
  }

  return true;
}

function looksLikeDomain(
  text: string,
): boolean {
  const value =
    text.toLowerCase();

  const domains = [
    "fockis.com",
    "fockis.org",
    "fockis.net",
    "fockis.edu",
    "fockis.church",
    "fockis.co",
    "fockis.io",
  ];

  for (const domain of domains) {
    if (
      value === domain ||
      value.startsWith(
        domain + "/",
      )
    ) {
      return true;
    }
  }

  return false;
}

function containsPlaceholder(
  text: string,
): boolean {
  return (
    (text.includes("{{") &&
      text.includes("}}")) ||
    (text.includes("${") &&
      text.includes("}")) ||
    text.includes("=>") ||
    text.includes("&&") ||
    text.includes("||")
  );
}

function containsProtectedWord(
  text: string,
): boolean {
  const words =
    normalizeText(text).split(" ");

  for (const word of words) {
    let cleaned = "";

    for (const character of word) {
      const punctuation =
        character === "," ||
        character === "." ||
        character === "!" ||
        character === "?" ||
        character === "(" ||
        character === ")" ||
        character === "[" ||
        character === "]" ||
        character === "{" ||
        character === "}" ||
        character === "*" ||
        character === "'" ||
        character === '"' ||
        character === ":" ||
        character === ";";

      if (!punctuation) {
        cleaned += character;
      }
    }

    for (
      const protectedWord of
      PROTECTED_WORDS
    ) {
      if (
        cleaned.toLowerCase() ===
        protectedWord.toLowerCase()
      ) {
        return true;
      }
    }
  }

  return false;
}

function isProtectedText(
  text: string,
): boolean {
  const value =
    normalizeText(text);

  if (!value) {
    return true;
  }

  if (value.length < 2) {
    return true;
  }

  if (value.length > 500) {
    return true;
  }

  if (looksLikeUrl(value)) {
    return true;
  }

  if (looksLikeRoute(value)) {
    return true;
  }

  if (looksLikeFockisId(value)) {
    return true;
  }

  if (
    looksLikeNetworkAddress(value)
  ) {
    return true;
  }

  if (looksLikeEmail(value)) {
    return true;
  }

  if (looksLikeNumber(value)) {
    return true;
  }

  if (looksLikeTime(value)) {
    return true;
  }

  if (looksLikeDate(value)) {
    return true;
  }

  if (looksLikeDomain(value)) {
    return true;
  }

  if (containsPlaceholder(value)) {
    return true;
  }

  if (
    value.includes("](") ||
    value.includes("**")
  ) {
    return true;
  }

  if (
    value.startsWith("<") &&
    value.endsWith(">")
  ) {
    return true;
  }

  if (
    PROTECTED_WORDS.has(value)
  ) {
    return true;
  }

  return false;
}

function isIgnoredElement(
  element: HTMLElement,
): boolean {
  if (
    IGNORED_TAGS.has(
      element.tagName,
    )
  ) {
    return true;
  }

  for (
    const attribute of
    IGNORED_ATTRIBUTES
  ) {
    if (
      element.hasAttribute(
        attribute,
      )
    ) {
      return true;
    }
  }

  if (
    element.getAttribute(
      "translate",
    ) === "no"
  ) {
    return true;
  }

  if (
    element.isContentEditable
  ) {
    return true;
  }

  if (
    element.getAttribute(
      "aria-hidden",
    ) === "true"
  ) {
    return true;
  }

  return false;
}

function shouldTranslateNode(
  node: Text,
): boolean {
  if (!node.nodeValue) {
    return false;
  }

  const parent =
    node.parentElement;

  if (!parent) {
    return false;
  }

  let current: HTMLElement | null =
    parent;

  while (current !== null) {
    if (
      isIgnoredElement(current)
    ) {
      return false;
    }

    current =
      current.parentElement;
  }

  if (
    originalTextMap.has(node)
  ) {
    return false;
  }

  const text =
    normalizeText(
      node.nodeValue,
    );

  if (!text) {
    return false;
  }

  if (
    isProtectedText(text)
  ) {
    return false;
  }

  return true;
}

function collectTextNodes(
  root: Node,
): Text[] {
  const result: Text[] = [];

  if (
    typeof document === "undefined"
  ) {
    return result;
  }

  const walker =
    document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
    );

  let current =
    walker.nextNode();

  while (current) {
    const textNode =
      current as Text;

    if (
      shouldTranslateNode(
        textNode,
      )
    ) {
      result.push(
        textNode,
      );
    }

    current =
      walker.nextNode();
  }

  return result;
}

function restoreAllTranslations(): void {
  if (
    typeof document === "undefined" ||
    !document.body
  ) {
    return;
  }

  const walker =
    document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );

  const nodes: Text[] = [];

  let current =
    walker.nextNode();

  while (current) {
    nodes.push(
      current as Text,
    );

    current =
      walker.nextNode();
  }

  for (const node of nodes) {
    const original =
      originalTextMap.get(node);

    if (
      original !== undefined
    ) {
      node.nodeValue =
        original;

      originalTextMap.delete(
        node,
      );
    }
  }
}

function getApiBaseUrl(): string {
  const configuredApiUrl =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "";

  if (!configuredApiUrl) {
    return "";
  }

  let baseUrl =
    String(configuredApiUrl).trim();

  while (
    baseUrl.endsWith("/")
  ) {
    baseUrl =
      baseUrl.slice(
        0,
        -1,
      );
  }

  return baseUrl;
}

function getAuthToken(): string | null {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  return (
    window.localStorage.getItem(
      "access_token",
    ) ||
    window.localStorage.getItem(
      "accessToken",
    ) ||
    window.localStorage.getItem(
      "token",
    ) ||
    window.localStorage.getItem(
      "jwt",
    ) ||
    window.localStorage.getItem(
      "authToken",
    ) ||
    window.localStorage.getItem(
      "fockis_token",
    )
  );
}

/**
 * Sends text to the Fockis backend translation service.
 *
 * Backend:
 *
 * @Controller("translation")
 * @Post()
 *
 * Endpoint:
 *
 * POST /translation
 */
async function requestTranslation(
  text: string,
  targetLanguage: SupportedLanguage,
): Promise<string | null> {
  if (
    targetLanguage === "en"
  ) {
    return text;
  }

  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  if (
    translationServiceUnavailable
  ) {
    return null;
  }

  const baseUrl =
    getApiBaseUrl();

  if (!baseUrl) {
    console.error(
      "[AutoTranslate] Missing VITE_API_URL or VITE_API_BASE_URL.",
    );

    translationServiceUnavailable =
      true;

    return null;
  }

  const token =
    getAuthToken();

  const endpoint =
    `${baseUrl}/translation`;

  try {
    const response =
      await fetch(
        endpoint,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            ...(token
              ? {
                  Authorization:
                    `Bearer ${token}`,
                }
              : {}),
          },

          body: JSON.stringify({
            text: text.trim(),
            sourceLanguage: "en",
            targetLanguage,
          }),
        },
      );

    if (
      response.status === 404
    ) {
      translationServiceUnavailable =
        true;

      console.error(
        `[AutoTranslate] Translation endpoint returned 404: ${endpoint}`,
      );

      return null;
    }

    if (!response.ok) {
      const errorBody =
        await response
          .text()
          .catch(() => "");

      console.error(
        `[AutoTranslate] Translation request failed: ${response.status}`,
        errorBody,
      );

      return null;
    }

    const data =
      (await response.json()) as {
        translatedText?: unknown;
        translation?: unknown;
        text?: unknown;
        data?: {
          translatedText?: unknown;
          translation?: unknown;
          text?: unknown;
        };
      };

    if (
      typeof data.translatedText ===
      "string"
    ) {
      return normalizeText(
        data.translatedText,
      );
    }

    if (
      typeof data.translation ===
      "string"
    ) {
      return normalizeText(
        data.translation,
      );
    }

    if (
      typeof data.text ===
      "string"
    ) {
      return normalizeText(
        data.text,
      );
    }

    if (data.data) {
      if (
        typeof data.data
          .translatedText ===
        "string"
      ) {
        return normalizeText(
          data.data.translatedText,
        );
      }

      if (
        typeof data.data.translation ===
        "string"
      ) {
        return normalizeText(
          data.data.translation,
        );
      }

      if (
        typeof data.data.text ===
        "string"
      ) {
        return normalizeText(
          data.data.text,
        );
      }
    }

    console.error(
      "[AutoTranslate] Translation backend returned an unexpected response.",
      data,
    );

    return null;
  } catch (error) {
    console.error(
      "[AutoTranslate] Translation request failed.",
      error,
    );

    return null;
  }
}

async function translateSingleText(
  text: string,
  language: SupportedLanguage,
): Promise<string> {
  const normalized =
    normalizeText(text);

  if (!normalized) {
    return text;
  }

  if (
    language === "en"
  ) {
    return normalized;
  }

  if (
    isProtectedText(normalized)
  ) {
    return normalized;
  }

  const cached =
    readCache(
      language,
      normalized,
    );

  if (cached) {
    return cached;
  }

  const translated =
    await requestTranslation(
      normalized,
      language,
    );

  if (
    translated &&
    translated !== normalized
  ) {
    writeCache(
      language,
      normalized,
      translated,
    );

    return translated;
  }

  return normalized;
}

export function AutoTranslateProvider({
  children,
  enabled = true,
}: AutoTranslateProviderProps) {
  const [
    language,
    setLanguage,
  ] =
    useState<SupportedLanguage>(
      () => {
        const saved =
          getLanguage();

        if (
          isSupportedLanguage(
            saved,
          )
        ) {
          return saved;
        }

        return "en";
      },
    );

  const [
    isTranslating,
    setIsTranslating,
  ] = useState(false);

  const translatingRef =
    useRef(false);

  const pendingNodesRef =
    useRef<Text[]>([]);

  useEffect(() => {
    translationServiceUnavailable =
      false;
  }, [language]);

  const translateNodes =
    useCallback(
      async (
        nodes: Text[],
      ): Promise<void> => {
        if (
          !enabled ||
          language === "en" ||
          nodes.length === 0 ||
          translatingRef.current ||
          translationServiceUnavailable
        ) {
          return;
        }

        translatingRef.current =
          true;

        setIsTranslating(true);

        try {
          const uniqueNodes =
            Array.from(
              new Set(nodes),
            );

          for (
            const node of
            uniqueNodes
          ) {
            if (
              !node.isConnected
            ) {
              continue;
            }

            if (
              !shouldTranslateNode(
                node,
              )
            ) {
              continue;
            }

            const original =
              node.nodeValue || "";

            const normalized =
              normalizeText(
                original,
              );

            if (!normalized) {
              continue;
            }

            originalTextMap.set(
              node,
              original,
            );

            const translated =
              await translateSingleText(
                normalized,
                language,
              );

            if (
              !node.isConnected
            ) {
              originalTextMap.delete(
                node,
              );

              continue;
            }

            if (
              translated &&
              translated !== normalized
            ) {
              node.nodeValue =
                translated;
            } else {
              originalTextMap.delete(
                node,
              );
            }

            if (
              translationServiceUnavailable
            ) {
              break;
            }
          }
        } finally {
          translatingRef.current =
            false;

          setIsTranslating(false);

          const pending =
            pendingNodesRef.current;

          pendingNodesRef.current =
            [];

          if (
            pending.length > 0 &&
            !translationServiceUnavailable &&
            typeof window !==
              "undefined"
          ) {
            window.setTimeout(
              () => {
                void translateNodes(
                  pending,
                );
              },
              0,
            );
          }
        }
      },
      [
        enabled,
        language,
      ],
    );

  const queueTranslationNodes =
    useCallback(
      (
        nodes: Text[],
      ): void => {
        if (
          !enabled ||
          language === "en" ||
          nodes.length === 0 ||
          translationServiceUnavailable
        ) {
          return;
        }

        if (
          translatingRef.current
        ) {
          pendingNodesRef.current =
            pendingNodesRef.current.concat(
              nodes,
            );

          return;
        }

        void translateNodes(
          nodes,
        );
      },
      [
        enabled,
        language,
        translateNodes,
      ],
    );

  const translateText =
    useCallback(
      async (
        text: string,
      ): Promise<string> => {
        return translateSingleText(
          text,
          language,
        );
      },
      [language],
    );

  useEffect(() => {
    if (!enabled) {
      restoreAllTranslations();
      return;
    }

    const unsubscribe =
      subscribeToLanguage(
        (nextLanguage) => {
          if (
            !isSupportedLanguage(
              nextLanguage,
            )
          ) {
            return;
          }

          if (
            nextLanguage === language
          ) {
            return;
          }

          translationServiceUnavailable =
            false;

          restoreAllTranslations();

          setLanguage(
            nextLanguage,
          );
        },
      );

    return unsubscribe;
  }, [
    enabled,
    language,
  ]);

  useEffect(() => {
    if (!enabled) {
      restoreAllTranslations();
      return;
    }

    if (
      typeof document ===
        "undefined" ||
      !document.body
    ) {
      return;
    }

    restoreAllTranslations();

    if (
      language !== "en"
    ) {
      const initialNodes =
        collectTextNodes(
          document.body,
        );

      queueTranslationNodes(
        initialNodes,
      );
    }

    const observer =
      new MutationObserver(
        (mutations) => {
          if (
            translationServiceUnavailable
          ) {
            return;
          }

          const nodes: Text[] =
            [];

          for (
            const mutation of
            mutations
          ) {
            if (
              mutation.type ===
                "characterData" &&
              mutation.target.nodeType ===
                Node.TEXT_NODE
            ) {
              const textNode =
                mutation.target as Text;

              if (
                shouldTranslateNode(
                  textNode,
                )
              ) {
                nodes.push(
                  textNode,
                );
              }
            }

            for (
              const addedNode of
              Array.from(
                mutation.addedNodes,
              )
            ) {
              if (
                addedNode.nodeType ===
                Node.TEXT_NODE
              ) {
                const textNode =
                  addedNode as Text;

                if (
                  shouldTranslateNode(
                    textNode,
                  )
                ) {
                  nodes.push(
                    textNode,
                  );
                }
              }

              if (
                addedNode.nodeType ===
                Node.ELEMENT_NODE
              ) {
                nodes.push(
                  ...collectTextNodes(
                    addedNode,
                  ),
                );
              }
            }
          }

          if (
            nodes.length > 0
          ) {
            queueTranslationNodes(
              nodes,
            );
          }
        },
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true,
        characterData: true,
      },
    );

    return () => {
      observer.disconnect();
    };
  }, [
    enabled,
    language,
    queueTranslationNodes,
  ]);

  useEffect(() => {
    return () => {
      restoreAllTranslations();

      pendingNodesRef.current =
        [];

      translatingRef.current =
        false;
    };
  }, []);

  const value =
    useMemo<AutoTranslateContextValue>(
      () => ({
        language,
        translateText,
        isTranslating,
      }),
      [
        language,
        translateText,
        isTranslating,
      ],
    );

  return (
    <AutoTranslateContext.Provider
      value={value}
    >
      {children}
    </AutoTranslateContext.Provider>
  );
}

export function useAutoTranslate():
  AutoTranslateContextValue {
  const context =
    useContext(
      AutoTranslateContext,
    );

  if (!context) {
    throw new Error(
      "useAutoTranslate must be used inside AutoTranslateProvider",
    );
  }

  return context;
}

export function markNoTranslate(
  element: HTMLElement | null,
): void {
  if (!element) {
    return;
  }

  element.setAttribute(
    "data-no-translate",
    "true",
  );
}

export function getAutoTranslationCacheKey(
  language: SupportedLanguage,
  text: string,
): string {
  return makeCacheKey(
    language,
    normalizeText(text),
  );
}