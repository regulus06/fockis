import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import {
  getCachedTranslation,
  setCachedTranslation,
} from "../utils/translationCache";

import type {
  TranslationLanguageCode,
  TranslationRequest,
  TranslationResponse,
} from "../types/translation.types";

// ============================================================================
// API CONFIGURATION
// ============================================================================

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || FOCKIS_API_URL
).replace(/\/+$/, "");

const TRANSLATION_ENDPOINT =
  `${API_BASE_URL}/translation`;

// ============================================================================
// PUBLIC API URL HELPERS
// ============================================================================

export function getTranslationApiUrl(): string {
  return TRANSLATION_ENDPOINT;
}

export function getTranslationApiBaseUrl(): string {
  return API_BASE_URL;
}

// ============================================================================
// AUTH
// ============================================================================

const TOKEN_KEYS = [
  "access_token",
  "accessToken",
  "token",
  "jwt",
  "authToken",
  "fockis_token",
] as const;

function getAuthToken(): string | null {
  for (const key of TOKEN_KEYS) {
    const value = localStorage.getItem(key);

    if (value && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

// ============================================================================
// LANGUAGE HELPERS
// ============================================================================

function normalizeLanguageCode(
  language: TranslationLanguageCode,
): TranslationLanguageCode {
  return language
    .trim()
    .replace(/_/g, "-");
}

// ============================================================================
// HTTP HELPERS
// ============================================================================

function buildHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const token = getAuthToken();

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  return headers;
}

async function parseResponse<T>(
  response: Response,
): Promise<T> {
  const contentType =
    response.headers.get("content-type") || "";

  let body: unknown;

  if (
    contentType.includes(
      "application/json",
    )
  ) {
    body = await response.json();
  } else {
    body = await response.text();
  }

  if (!response.ok) {
    let message =
      `Translation request failed with status ${response.status}.`;

    if (
      typeof body === "object" &&
      body !== null &&
      "message" in body
    ) {
      const serverMessage =
        (body as {
          message?: unknown;
        }).message;

      if (
        typeof serverMessage ===
          "string" &&
        serverMessage.trim()
      ) {
        message = serverMessage;
      } else if (
        Array.isArray(serverMessage)
      ) {
        message =
          serverMessage.join(", ");
      }
    }

    throw new Error(message);
  }

  return body as T;
}

// ============================================================================
// TRANSLATE CONTENT
// ============================================================================

export async function translateContent(
  request: TranslationRequest,
  signal?: AbortSignal,
): Promise<TranslationResponse> {
  const text = request.text?.trim();

  if (!text) {
    throw new Error(
      "There is no content to translate.",
    );
  }

  const targetLanguage =
    normalizeLanguageCode(
      request.targetLanguage,
    );

  const sourceLanguage =
    request.sourceLanguage &&
    request.sourceLanguage !== "auto"
      ? normalizeLanguageCode(
          request.sourceLanguage,
        )
      : "auto";

  if (!targetLanguage) {
    throw new Error(
      "A target language is required.",
    );
  }

  // --------------------------------------------------------------------------
  // SAME LANGUAGE
  // --------------------------------------------------------------------------

  if (
    sourceLanguage !== "auto" &&
    sourceLanguage.toLowerCase() ===
      targetLanguage.toLowerCase()
  ) {
    return {
      translatedText: request.text,
      sourceLanguage,
      targetLanguage,
      provider: "openai",
      cached: true,
    };
  }

  // --------------------------------------------------------------------------
  // BROWSER CACHE
  // --------------------------------------------------------------------------

  if (sourceLanguage !== "auto") {
    const cached =
      getCachedTranslation(
        request.text,
        sourceLanguage,
        targetLanguage,
      );

    if (cached) {
      return {
        translatedText:
          cached.translatedText,

        sourceLanguage:
          cached.sourceLanguage,

        targetLanguage:
          cached.targetLanguage,

        cached: true,
      };
    }
  }

  // --------------------------------------------------------------------------
  // CHECK ABORT
  // --------------------------------------------------------------------------

  if (signal?.aborted) {
    throw new DOMException(
      "Translation request was aborted.",
      "AbortError",
    );
  }

  // --------------------------------------------------------------------------
  // BACKEND REQUEST
  // --------------------------------------------------------------------------

  const payload: TranslationRequest = {
    text: request.text,
    targetLanguage,
    sourceLanguage,
  };

  const response = await fetch(
    TRANSLATION_ENDPOINT,
    {
      method: "POST",

      headers: buildHeaders(),

      credentials: "include",

      body: JSON.stringify(
        payload,
      ),

      signal,
    },
  );

  const result =
    await parseResponse<TranslationResponse>(
      response,
    );

  // --------------------------------------------------------------------------
  // VALIDATE RESPONSE
  // --------------------------------------------------------------------------

  if (!result.translatedText) {
    throw new Error(
      "The translation service returned no translated text.",
    );
  }

  const detectedSourceLanguage =
    result.sourceLanguage ||
    (
      sourceLanguage !== "auto"
        ? sourceLanguage
        : "unknown"
    );

  const finalTargetLanguage =
    result.targetLanguage ||
    targetLanguage;

  // --------------------------------------------------------------------------
  // SAVE TO BROWSER CACHE
  // --------------------------------------------------------------------------

  if (
    detectedSourceLanguage !==
    "unknown"
  ) {
    setCachedTranslation(
      request.text,
      detectedSourceLanguage,
      finalTargetLanguage,
      result.translatedText,
    );
  }

  // --------------------------------------------------------------------------
  // RETURN RESULT
  // --------------------------------------------------------------------------

  return {
    ...result,

    translatedText:
      result.translatedText,

    sourceLanguage:
      detectedSourceLanguage,

    targetLanguage:
      finalTargetLanguage,

    cached:
      Boolean(result.cached),
  };
}

// ============================================================================
// DETECT CONTENT LANGUAGE
// ============================================================================

export async function detectContentLanguage(
  text: string,
  signal?: AbortSignal,
): Promise<string> {
  const trimmedText =
    text.trim();

  if (!trimmedText) {
    throw new Error(
      "There is no content for language detection.",
    );
  }

  if (signal?.aborted) {
    throw new DOMException(
      "Language detection was aborted.",
      "AbortError",
    );
  }

  const response = await fetch(
    `${TRANSLATION_ENDPOINT}/detect`,
    {
      method: "POST",

      headers: buildHeaders(),

      credentials: "include",

      body: JSON.stringify({
        text: trimmedText,
      }),

      signal,
    },
  );

  const result =
    await parseResponse<{
      sourceLanguage: string;
    }>(response);

  if (!result.sourceLanguage) {
    throw new Error(
      "The translation service could not detect the language.",
    );
  }

  return normalizeLanguageCode(
    result.sourceLanguage,
  );
}