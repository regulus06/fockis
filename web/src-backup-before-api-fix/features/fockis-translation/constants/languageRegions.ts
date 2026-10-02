export interface LanguageRegion {
  id: string;
  name: string;
  languages: string[];
}

export const FOCKIS_LANGUAGE_REGIONS: readonly LanguageRegion[] = [
  {
    id: "global",
    name: "Worldwide",
    languages: ["en", "fr", "es", "pt"],
  },
  {
    id: "caribbean",
    name: "Caribbean",
    languages: ["ht", "en", "fr", "es"],
  },
  {
    id: "north-america",
    name: "North America",
    languages: ["en", "fr", "es"],
  },
  {
    id: "latin-america",
    name: "Latin America",
    languages: ["es", "pt", "fr"],
  },
  {
    id: "europe",
    name: "Europe",
    languages: [
      "en",
      "fr",
      "de",
      "es",
      "it",
      "nl",
      "pl",
      "uk",
      "ru",
      "pt",
      "el",
      "cs",
      "sk",
      "ro",
      "hu",
      "sv",
      "no",
      "da",
      "fi",
    ],
  },
  {
    id: "africa",
    name: "Africa",
    languages: [
      "en",
      "fr",
      "sw",
      "am",
      "yo",
      "ig",
      "ha",
      "zu",
      "af",
      "so",
      "rw",
    ],
  },
  {
    id: "middle-east",
    name: "Middle East",
    languages: ["ar", "he", "fa", "tr", "ur"],
  },
  {
    id: "south-asia",
    name: "South Asia",
    languages: [
      "hi",
      "bn",
      "pa",
      "gu",
      "mr",
      "ta",
      "te",
      "kn",
      "ml",
      "ur",
    ],
  },
  {
    id: "east-asia",
    name: "East Asia",
    languages: ["ja", "ko", "zh-CN", "zh-TW", "zh-HK"],
  },
  {
    id: "southeast-asia",
    name: "Southeast Asia",
    languages: ["th", "vi", "id", "ms", "fil"],
  },
];