/**
 * Fockis Content Translation
 *
 * Types used by the reusable user-generated-content translation system.
 */

export type TranslationLanguageCode = string;

export type TranslationProvider =
  | "openai"
  | "google"
  | "deepl"
  | "azure"
  | "manual"
  | "unknown";

export interface TranslationRequest {
  text: string;
  targetLanguage: TranslationLanguageCode;
  sourceLanguage?: TranslationLanguageCode;
}

export interface TranslationResponse {
  sourceLanguage: TranslationLanguageCode;
  targetLanguage: TranslationLanguageCode;
  translatedText: string;
  cached?: boolean;
  provider?: TranslationProvider;
  model?: string;
}

export interface TranslationErrorResponse {
  message: string;
  code?: string;
  statusCode?: number;
}

export interface TranslationCacheEntry {
  key: string;
  text: string;
  sourceLanguage: TranslationLanguageCode;
  targetLanguage: TranslationLanguageCode;
  translatedText: string;
  createdAt: number;
}

export interface ContentTranslationState {
  translatedText: string | null;
  sourceLanguage: TranslationLanguageCode | null;
  isTranslating: boolean;
  isTranslated: boolean;
  error: string | null;
}

export interface TranslateButtonProps {
  text: string;
  targetLanguage?: TranslationLanguageCode;
  sourceLanguage?: TranslationLanguageCode;
  className?: string;
  disabled?: boolean;
  onTranslated?: (
    translatedText: string,
    sourceLanguage: TranslationLanguageCode,
  ) => void;
  onError?: (error: Error) => void;
}

export interface LanguageSelectorProps {
  value?: TranslationLanguageCode;
  onChange?: (language: TranslationLanguageCode) => void;
  languages?: TranslationLanguageCode[];
  className?: string;
  disabled?: boolean;
  label?: string;
}