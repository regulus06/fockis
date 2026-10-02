import en from "./locales/en";
import ht from "./locales/ht";
import fr from "./locales/fr";
import es from "./locales/es";

import {
  DEFAULT_LANGUAGE,
  getInitialLanguage,
  saveLanguage,
  type FockisLanguage,
} from "./language";

export type TranslationDictionary = {
  [key: string]: unknown;
};

export const translations: Record<FockisLanguage, TranslationDictionary> = {
  en: en as unknown as TranslationDictionary,
  ht: ht as unknown as TranslationDictionary,
  fr: fr as unknown as TranslationDictionary,
  es: es as unknown as TranslationDictionary,
};

let currentLanguage: FockisLanguage = getInitialLanguage();

function syncDocumentLanguage(language: FockisLanguage): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.lang = language;
}

syncDocumentLanguage(currentLanguage);

export function getLanguage(): FockisLanguage {
  return currentLanguage;
}

export function setLanguage(language: FockisLanguage): void {
  currentLanguage = language;

  saveLanguage(language);

  syncDocumentLanguage(language);
}

function getValue(dictionary: unknown, path: string): unknown {
  if (!dictionary || !path) {
    return undefined;
  }

  return path.split(".").reduce<unknown>((current, key) => {
    if (
      current !== null &&
      typeof current === "object" &&
      key in current
    ) {
      return (current as Record<string, unknown>)[key];
    }

    return undefined;
  }, dictionary);
}

function interpolate(
  value: string,
  variables?: Record<string, string | number>,
): string {
  if (!variables) {
    return value;
  }

  return value.replace(
    /{{\s*([a-zA-Z0-9_]+)\s*}}/g,
    (_match: string, variableName: string) => {
      const variable = variables[variableName];

      if (variable === undefined || variable === null) {
        return "{{" + variableName + "}}";
      }

      return String(variable);
    },
  );
}

const HUMAN_READABLE_FALLBACKS: Record<string, string> = {
  "church.organization.browseLibrary": "Browse Library",

  "church.organization.media": "Media",

  "church.organization.nothingLive": "Nothing is live right now.",

  "church.organization.fockisEvents": "Fockis Events",

  "church.organization.events": "Events",

  "church.organization.planYourVisit": "Plan Your Visit",

  "church.organization.welcomeMessage": "Welcome Message",

  "church.organization.newHere": "New Here?",

  "church.organization.visitUs": "Visit Us",

  "church.organization.welcome": "Welcome",

  "church.organization.visit": "Visit",

  "church.organization.connectWith": "Connect With",

  "church.organization.planEducationVisit": "Plan your visit to",

  "church.organization.planFaithVisit": "Plan your visit to",

  "church.organization.planOrganizationVisit": "Plan your visit to",

  "church.organization.overview": "Overview",

  "church.organization.type": "Type",

  "church.organization.institution": "Institution",

  "church.organization.organizationNoun": "Organization",

  "church.organization.members": "Members",

  "church.organization.email": "Email",

  "church.organization.phone": "Phone",

  "church.organization.website": "Website",

  "church.organization.visitWebsite": "Visit website",

  "church.organization.leadership": "Leadership",

  "church.organization.noLeadership": "No leadership information is available.",

  "church.organization.locations": "Locations",

  "church.organization.noLocations": "No locations are available.",

  "church.organization.mainLocation": "Main Location",

  "church.organization.departments": "Departments",

  "church.organization.viewAll": "View all",

  "church.organization.noDepartments": "No departments are available.",

  "church.organization.groups": "Groups",

  "church.organization.noGroups": "No groups are available.",

  "church.organization.viewDirectory": "View directory",

  "church.organization.noMembers": "No members are available.",

  "church.organization.fockisLive": "Fockis Live",

  "church.organization.openLive": "Open Live",

  "church.organization.liveNow": "Live now",

  "church.organization.watchNow": "Watch now",

  "church.organization.mediaDescription":
    "Explore this organization's media library.",

  "church.organization.viewCalendar": "View calendar",

  "church.organization.createEvent": "Create event",

  "church.organization.noUpcomingEvents": "No upcoming events.",

  "church.organization.createFirstEvent": "Create the first event",

  "church.organization.planVisit": "Plan Your Visit",

  "church.organization.loading": "Loading organization...",

  "church.organization.loadError": "Unable to load this organization.",

  "church.organization.notFound": "Organization not found.",

  "church.organization.membershipError": "Unable to update your membership.",

  "church.organization.updatingMembership": "Updating membership...",

  "church.organization.leave": "Leave organization",

  "church.organization.requestPending": "Request pending",

  "church.organization.requestJoin": "Request to join",

  "church.organization.signInToJoin": "Sign in to join",

  "church.organization.logo": "Logo",

  "church.organization.cover.label": "Organization cover",

  "church.organization.cover.videoAlt": "Organization cover video",

  "church.organization.cover.video": "Video",

  "church.organization.cover.photo": "Photo",

  "church.organization.cover.upload": "Upload cover",

  "church.organization.cover.replace": "Replace cover",

  "church.organization.cover.uploading": "Uploading...",

  "church.organization.cover.useUrl": "Use URL",

  "church.organization.cover.delete": "Delete cover",

  "church.organization.cover.deleting": "Deleting...",

  "church.organization.cover.invalidType":
    "The selected file type could not be identified.",

  "church.organization.cover.fileTooLarge":
    "The cover file is too large. Maximum size is 100 MB.",

  "church.organization.cover.onlyImageVideo":
    "Please select an image or video.",

  "church.organization.cover.noPermission":
    "You do not have permission to manage the organization cover.",

  "church.organization.cover.invalidFile":
    "The selected cover file is invalid.",

  "church.organization.cover.videoUploaded":
    "Cover video uploaded successfully.",

  "church.organization.cover.imageUploaded":
    "Cover image uploaded successfully.",

  "church.organization.cover.uploadError": "Unable to upload the cover.",

  "church.organization.cover.urlPrompt":
    "Enter the cover image or video URL:",

  "church.organization.cover.urlRequired": "Please enter a cover URL.",

  "church.organization.cover.urlInvalid": "The cover URL is invalid.",

  "church.organization.cover.urlProtocol":
    "The cover URL must use HTTP or HTTPS.",

  "church.organization.cover.mediaTypePrompt":
    "Enter the media type: image or video",

  "church.organization.cover.mediaTypeInvalid":
    "Media type must be image or video.",

  "church.organization.cover.urlSaved": "Cover URL saved successfully.",

  "church.organization.cover.urlSaveError": "Unable to save the cover URL.",

  "church.organization.cover.deleteConfirm":
    "Are you sure you want to delete the organization cover?",

  "church.organization.cover.deleted": "Organization cover deleted.",

  "church.organization.cover.deleteError":
    "Unable to delete the organization cover.",
};

function humanizeTranslationKey(key: string): string {
  const explicitFallback = HUMAN_READABLE_FALLBACKS[key];

  if (explicitFallback) {
    return explicitFallback;
  }

  const segments = key.split(".").filter(Boolean);

  let value = segments.length > 0 ? segments[segments.length - 1] : key;

  value = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!value) {
    return "Text";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function t(
  key: string,
  variables?: Record<string, string | number>,
): string {
  const normalizedKey = key.trim();

  if (!normalizedKey) {
    return "";
  }

  const currentDictionary = translations[currentLanguage];

  const currentValue = getValue(currentDictionary, normalizedKey);

  if (typeof currentValue === "string" && currentValue.trim().length > 0) {
    return interpolate(currentValue, variables);
  }

  const englishDictionary = translations[DEFAULT_LANGUAGE];

  const englishValue = getValue(englishDictionary, normalizedKey);

  if (typeof englishValue === "string" && englishValue.trim().length > 0) {
    return interpolate(englishValue, variables);
  }

  const explicitFallback = HUMAN_READABLE_FALLBACKS[normalizedKey];

  if (explicitFallback) {
    return interpolate(explicitFallback, variables);
  }

  return interpolate(humanizeTranslationKey(normalizedKey), variables);
}

export function subscribeToLanguage(
  callback: (language: FockisLanguage) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<FockisLanguage>;

    const nextLanguage = customEvent.detail;

    if (
      nextLanguage === "en" ||
      nextLanguage === "ht" ||
      nextLanguage === "fr" ||
      nextLanguage === "es"
    ) {
      callback(nextLanguage);
    }
  };

  window.addEventListener("fockis-language-change", handler);

  return () => {
    window.removeEventListener("fockis-language-change", handler);
  };
}

export function changeLanguage(language: FockisLanguage): void {
  setLanguage(language);

  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<FockisLanguage>("fockis-language-change", {
      detail: language,
    }),
  );
}