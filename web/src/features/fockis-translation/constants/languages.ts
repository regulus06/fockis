/**
 * Fockis supported languages.
 *
 * The translation engine itself accepts arbitrary BCP-47 language codes.
 * This registry provides the languages Fockis exposes in its UI.
 */

export interface FockisLanguage {
  code: string;
  name: string;
  nativeName: string;
  englishName: string;
  region?: string;
  script?: string;
  rtl?: boolean;
}

export const FOCKIS_LANGUAGES: readonly FockisLanguage[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    englishName: "English",
    region: "Worldwide",
  },
  {
    code: "ht",
    name: "Haitian Creole",
    nativeName: "Kreyòl Ayisyen",
    englishName: "Haitian Creole",
    region: "Haiti",
  },
  {
    code: "fr",
    name: "French",
    nativeName: "Français",
    englishName: "French",
    region: "Worldwide",
  },
  {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    englishName: "Spanish",
    region: "Worldwide",
  },
  {
    code: "pt",
    name: "Portuguese",
    nativeName: "Português",
    englishName: "Portuguese",
    region: "Worldwide",
  },
  {
    code: "pt-BR",
    name: "Brazilian Portuguese",
    nativeName: "Português (Brasil)",
    englishName: "Portuguese (Brazil)",
    region: "Brazil",
  },
  {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    englishName: "German",
    region: "Europe",
  },
  {
    code: "it",
    name: "Italian",
    nativeName: "Italiano",
    englishName: "Italian",
    region: "Europe",
  },
  {
    code: "nl",
    name: "Dutch",
    nativeName: "Nederlands",
    englishName: "Dutch",
    region: "Europe",
  },
  {
    code: "pl",
    name: "Polish",
    nativeName: "Polski",
    englishName: "Polish",
    region: "Europe",
  },
  {
    code: "uk",
    name: "Ukrainian",
    nativeName: "Українська",
    englishName: "Ukrainian",
    region: "Europe",
  },
  {
    code: "ru",
    name: "Russian",
    nativeName: "Русский",
    englishName: "Russian",
    region: "Worldwide",
  },
  {
    code: "tr",
    name: "Turkish",
    nativeName: "Türkçe",
    englishName: "Turkish",
    region: "Turkey",
  },
  {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    englishName: "Arabic",
    region: "Middle East",
    rtl: true,
  },
  {
    code: "he",
    name: "Hebrew",
    nativeName: "עברית",
    englishName: "Hebrew",
    region: "Israel",
    rtl: true,
  },
  {
    code: "fa",
    name: "Persian",
    nativeName: "فارسی",
    englishName: "Persian",
    region: "Iran",
    rtl: true,
  },
  {
    code: "ur",
    name: "Urdu",
    nativeName: "اردو",
    englishName: "Urdu",
    region: "South Asia",
    rtl: true,
  },
  {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    englishName: "Hindi",
    region: "India",
  },
  {
    code: "bn",
    name: "Bengali",
    nativeName: "বাংলা",
    englishName: "Bengali",
    region: "South Asia",
  },
  {
    code: "pa",
    name: "Punjabi",
    nativeName: "ਪੰਜਾਬੀ",
    englishName: "Punjabi",
    region: "South Asia",
  },
  {
    code: "gu",
    name: "Gujarati",
    nativeName: "ગુજરાતી",
    englishName: "Gujarati",
    region: "India",
  },
  {
    code: "mr",
    name: "Marathi",
    nativeName: "मराठी",
    englishName: "Marathi",
    region: "India",
  },
  {
    code: "ta",
    name: "Tamil",
    nativeName: "தமிழ்",
    englishName: "Tamil",
    region: "South Asia",
  },
  {
    code: "te",
    name: "Telugu",
    nativeName: "తెలుగు",
    englishName: "Telugu",
    region: "India",
  },
  {
    code: "kn",
    name: "Kannada",
    nativeName: "ಕನ್ನಡ",
    englishName: "Kannada",
    region: "India",
  },
  {
    code: "ml",
    name: "Malayalam",
    nativeName: "മലയാളം",
    englishName: "Malayalam",
    region: "India",
  },
  {
    code: "th",
    name: "Thai",
    nativeName: "ไทย",
    englishName: "Thai",
    region: "Thailand",
  },
  {
    code: "vi",
    name: "Vietnamese",
    nativeName: "Tiếng Việt",
    englishName: "Vietnamese",
    region: "Vietnam",
  },
  {
    code: "id",
    name: "Indonesian",
    nativeName: "Bahasa Indonesia",
    englishName: "Indonesian",
    region: "Indonesia",
  },
  {
    code: "ms",
    name: "Malay",
    nativeName: "Bahasa Melayu",
    englishName: "Malay",
    region: "Southeast Asia",
  },
  {
    code: "fil",
    name: "Filipino",
    nativeName: "Filipino",
    englishName: "Filipino",
    region: "Philippines",
  },
  {
    code: "ja",
    name: "Japanese",
    nativeName: "日本語",
    englishName: "Japanese",
    region: "Japan",
  },
  {
    code: "ko",
    name: "Korean",
    nativeName: "한국어",
    englishName: "Korean",
    region: "South Korea",
  },
  {
    code: "zh-CN",
    name: "Simplified Chinese",
    nativeName: "简体中文",
    englishName: "Chinese (Simplified)",
    region: "China",
    script: "Hans",
  },
  {
    code: "zh-TW",
    name: "Traditional Chinese",
    nativeName: "繁體中文",
    englishName: "Chinese (Traditional)",
    region: "Taiwan",
    script: "Hant",
  },
  {
    code: "zh-HK",
    name: "Chinese (Hong Kong)",
    nativeName: "繁體中文（香港）",
    englishName: "Chinese (Hong Kong)",
    region: "Hong Kong",
    script: "Hant",
  },
  {
    code: "sw",
    name: "Swahili",
    nativeName: "Kiswahili",
    englishName: "Swahili",
    region: "East Africa",
  },
  {
    code: "am",
    name: "Amharic",
    nativeName: "አማርኛ",
    englishName: "Amharic",
    region: "Ethiopia",
  },
  {
    code: "yo",
    name: "Yoruba",
    nativeName: "Yorùbá",
    englishName: "Yoruba",
    region: "West Africa",
  },
  {
    code: "ig",
    name: "Igbo",
    nativeName: "Igbo",
    englishName: "Igbo",
    region: "Nigeria",
  },
  {
    code: "ha",
    name: "Hausa",
    nativeName: "Hausa",
    englishName: "Hausa",
    region: "West Africa",
  },
  {
    code: "zu",
    name: "Zulu",
    nativeName: "isiZulu",
    englishName: "Zulu",
    region: "Southern Africa",
  },
  {
    code: "af",
    name: "Afrikaans",
    nativeName: "Afrikaans",
    englishName: "Afrikaans",
    region: "Southern Africa",
  },
  {
    code: "so",
    name: "Somali",
    nativeName: "Soomaali",
    englishName: "Somali",
    region: "East Africa",
  },
  {
    code: "rw",
    name: "Kinyarwanda",
    nativeName: "Ikinyarwanda",
    englishName: "Kinyarwanda",
    region: "Rwanda",
  },
  {
    code: "yo-NG",
    name: "Yoruba (Nigeria)",
    nativeName: "Yorùbá",
    englishName: "Yoruba (Nigeria)",
    region: "Nigeria",
  },
  {
    code: "la",
    name: "Latin",
    nativeName: "Latina",
    englishName: "Latin",
    region: "Worldwide",
  },
  {
    code: "el",
    name: "Greek",
    nativeName: "Ελληνικά",
    englishName: "Greek",
    region: "Greece",
  },
  {
    code: "cs",
    name: "Czech",
    nativeName: "Čeština",
    englishName: "Czech",
    region: "Europe",
  },
  {
    code: "sk",
    name: "Slovak",
    nativeName: "Slovenčina",
    englishName: "Slovak",
    region: "Europe",
  },
  {
    code: "ro",
    name: "Romanian",
    nativeName: "Română",
    englishName: "Romanian",
    region: "Europe",
  },
  {
    code: "hu",
    name: "Hungarian",
    nativeName: "Magyar",
    englishName: "Hungarian",
    region: "Europe",
  },
  {
    code: "sv",
    name: "Swedish",
    nativeName: "Svenska",
    englishName: "Swedish",
    region: "Europe",
  },
  {
    code: "no",
    name: "Norwegian",
    nativeName: "Norsk",
    englishName: "Norwegian",
    region: "Europe",
  },
  {
    code: "da",
    name: "Danish",
    nativeName: "Dansk",
    englishName: "Danish",
    region: "Europe",
  },
  {
    code: "fi",
    name: "Finnish",
    nativeName: "Suomi",
    englishName: "Finnish",
    region: "Europe",
  },
  {
    code: "is",
    name: "Icelandic",
    nativeName: "Íslenska",
    englishName: "Icelandic",
    region: "Iceland",
  },
  {
    code: "et",
    name: "Estonian",
    nativeName: "Eesti",
    englishName: "Estonian",
    region: "Europe",
  },
  {
    code: "lv",
    name: "Latvian",
    nativeName: "Latviešu",
    englishName: "Latvian",
    region: "Europe",
  },
  {
    code: "lt",
    name: "Lithuanian",
    nativeName: "Lietuvių",
    englishName: "Lithuanian",
    region: "Europe",
  },
  {
    code: "sl",
    name: "Slovenian",
    nativeName: "Slovenščina",
    englishName: "Slovenian",
    region: "Europe",
  },
  {
    code: "bg",
    name: "Bulgarian",
    nativeName: "Български",
    englishName: "Bulgarian",
    region: "Europe",
  },
  {
    code: "sr",
    name: "Serbian",
    nativeName: "Српски",
    englishName: "Serbian",
    region: "Europe",
  },
  {
    code: "hr",
    name: "Croatian",
    nativeName: "Hrvatski",
    englishName: "Croatian",
    region: "Europe",
  },
  {
    code: "bs",
    name: "Bosnian",
    nativeName: "Bosanski",
    englishName: "Bosnian",
    region: "Europe",
  },
];

export const DEFAULT_FOCKIS_LANGUAGE = "en";

export function getFockisLanguage(
  code: string | null | undefined,
): FockisLanguage | undefined {
  if (!code) {
    return undefined;
  }

  const normalized = code.trim().toLowerCase();

  return FOCKIS_LANGUAGES.find(
    (language) => language.code.toLowerCase() === normalized,
  );
}

export function isFockisLanguageSupported(code: string): boolean {
  return Boolean(getFockisLanguage(code));
}