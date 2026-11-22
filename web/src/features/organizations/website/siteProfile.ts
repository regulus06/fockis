/**
 * siteProfile.ts
 * -----------------------------------------------------------------------------
 * Words and features of the public organization homepage per kind of
 * organization. The layout is shared (ChurchWebsiteTemplate.tsx); a church
 * keeps sermons, prayer requests and "Service Times", a business gets videos,
 * a general request card and opening hours — never sermons or prayer.
 * -----------------------------------------------------------------------------
 */

import type { RequestType } from "../requests/requestsApi";
import { categoryInfo, platformCategoryOf, termsFor, welcomesVisitors, type PlatformCategory } from "../ui/orgTerminology";

const CHURCH_TYPES = new Set([
  "church",
  "christian_church",
  "christian_ministry",
  "christian_fellowship",
  "mission",
  "prayer_organization",
  "christian_network",
  "christian_nonprofit",
  "bible_study_organization",
]);

export function isChurchType(type?: string | null): boolean {
  return CHURCH_TYPES.has(String(type ?? "").toLowerCase());
}

export interface SiteProfile {
  category: PlatformCategory;
  isChurch: boolean;
  isFaith: boolean;
  /** "Ministries", "Departments", "Committees"… */
  departments: string;
  /** Media section: "Latest Sermons" / "Latest Videos"… */
  contentTitle: string;
  contentNav: string;
  contentQuick: { title: string; text: string };
  /** Church media are sermons (category "sermon"); others show any published video/audio. */
  mediaKind: "sermons" | "videos";
  scheduleTitle: string;
  scheduleButton: string;
  scheduleEmpty: string;
  liveButton: string;
  visitButton: string | null;
  give: { title: string; nav: string; quickText: string; text: string; button: string };
  request: { title: string; text: string; button: string; quickTitle: string; quickText: string; type: RequestType };
  contactTitle: string;
  contactText: string;
  requestTypes: { value: RequestType; label: string }[];
  joinTitle: string;
  /** schema.org type for structured data. */
  schemaType: string;
}

const T = (value: RequestType, label: string) => ({ value, label });

export function siteProfile(type?: string | null): SiteProfile {
  const category = platformCategoryOf(type);
  const terms = termsFor(type);
  const isChurch = isChurchType(type);
  const isFaith = category === "faith";
  const visits = welcomesVisitors(type);
  const short = categoryInfo(type).short;

  const faithTypes = [
    T("general", "General inquiry"),
    T("prayer", "Prayer request"),
    T("counseling", "Counseling request"),
    ...(visits ? [T("visit", "Plan a visit")] : []),
    T("membership", "Membership inquiry"),
    ...(isChurch ? [T("baptism", "Baptism inquiry")] : []),
    T("volunteer", "Volunteer request"),
    T("assistance", "Assistance request"),
    T("meeting", "Meeting request"),
    T("other", "Other"),
  ];
  const otherTypes = [
    T("general", "General inquiry"),
    ...(visits ? [T("visit", "Plan a visit")] : []),
    T("membership", category === "business" ? "Join the team" : "Membership inquiry"),
    ...(category === "business" ? [] : [T("volunteer", "Volunteer request")]),
    ...(["nonprofit", "social", "youth", "health", "civic"].includes(category) ? [T("assistance", "Assistance request")] : []),
    T("meeting", "Meeting request"),
    T("other", "Other"),
  ];

  const contactTitle = isChurch
    ? "Contact Our Church"
    : category === "business"
      ? "Contact Our Company"
      : category === "sports" || category === "clubs"
        ? "Contact Our Club"
        : "Contact Our Organization";

  const schemaType = isChurch
    ? "Church"
    : isFaith
      ? "PlaceOfWorship"
      : category === "business"
        ? "LocalBusiness"
        : category === "sports"
          ? "SportsOrganization"
          : category === "nonprofit"
            ? "NGO"
            : "Organization";

  return {
    category,
    isChurch,
    isFaith,
    departments: terms.departments,
    contentTitle: isChurch ? "Latest Sermons" : isFaith ? "Latest Messages" : "Latest Videos",
    contentNav: isChurch ? "Sermons" : isFaith ? "Messages" : "Videos",
    contentQuick: { title: isChurch ? "Sermons" : isFaith ? "Messages" : "Videos", text: "Watch & Listen" },
    mediaKind: isFaith ? "sermons" : "videos",
    scheduleTitle: isChurch ? "Our Service Schedule" : isFaith ? "Our Gathering Times" : category === "business" ? "Opening Hours" : "Our Schedule",
    scheduleButton: isChurch ? "Service Times" : isFaith ? "Gathering Times" : category === "business" ? "Opening Hours" : "Schedule",
    scheduleEmpty: isChurch ? "Service times will be posted soon." : "Our schedule will be posted soon.",
    liveButton: isChurch ? "Watch Live Service" : "Watch Live",
    visitButton: visits ? "Plan a Visit" : null,
    give: isFaith
      ? { title: "Give Online", nav: "Give", quickText: "Tithes & Offerings", text: "Support the ministry, give your tithe, offering, or a special gift.", button: "Give Now" }
      : category === "nonprofit"
        ? { title: "Donate Online", nav: "Donate", quickText: "Support Our Work", text: "Your gift helps us serve our community.", button: "Donate Now" }
        : { title: "Support Us", nav: "Support", quickText: "Give Online", text: `Support ${short === "Other" ? "our work" : "our organization"} with an online gift.`, button: "Give Now" },
    request: isFaith
      ? { title: "Prayer Request", text: "Let us pray for you and with you.", button: "Submit a Request", quickTitle: "Prayer", quickText: "Submit a Request", type: "prayer" }
      : { title: "Send Us a Request", text: "Questions, partnerships or support — we're here to help.", button: "Send a Request", quickTitle: "Contact", quickText: "Send a Request", type: "general" },
    contactTitle,
    contactText: isFaith
      ? "Have a question, a prayer request or want to plan a visit? Send us a message — we're here for you."
      : "Have a question or a request? Send us a message — we'll get back to you.",
    requestTypes: isFaith ? faithTypes : otherTypes,
    joinTitle: isChurch ? "Join Us" : category === "business" ? "Join the Team" : category === "nonprofit" ? "Volunteer" : "Join Us",
    schemaType,
  };
}
