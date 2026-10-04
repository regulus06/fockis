// Demo marketing applications submitted through /marketing/request.

import type { ApplicationDraft, ApplicationStatus, MarketingApplication } from "../types/platform.types";
import { daysAgo } from "./demoTime";

export function emptyApplicationDraft(): ApplicationDraft {
  return {
    business: { name: "", type: "restaurant", website: "", email: "", phone: "", address: "", serviceArea: "", description: "" },
    contact: { fullName: "", jobTitle: "", email: "", phone: "", preferredMethod: "email" },
    goals: [],
    goalsDetail: "",
    services: [],
    products: { mainProducts: "", mainServices: "", bestSellers: "", newOfferings: "", currentPromotions: "", averagePurchase: "", advantages: "", notes: "" },
    targetCustomers: { idealCustomer: "", ageRange: "", location: "", customerType: "", market: "b2c", interests: "", additional: "" },
    currentMarketing: { channels: [], whatWorked: "", whatDidNot: "", hasAgency: "no" },
    branding: { colors: [], fonts: "", uploads: [] },
    budget: "not_sure",
    currentAdSpend: "",
    timeline: "thirty_days",
    integrations: [],
  };
}

function history(path: ApplicationStatus[], startDaysAgo: number) {
  return path.map((status, i) => ({
    status,
    at: daysAgo(startDaysAgo - i * Math.max(0.5, startDaysAgo / (path.length + 1))),
    by: i === 0 ? "Applicant" : "Elince M.",
  }));
}

type AppSeed = Partial<ApplicationDraft> & { business: ApplicationDraft["business"]; contact: ApplicationDraft["contact"] };

function app(n: number, seed: AppSeed, path: ApplicationStatus[], startDaysAgo: number, extra: Partial<MarketingApplication> = {}): MarketingApplication {
  const base = emptyApplicationDraft();
  const statusHistory = history(path, startDaysAgo);
  return {
    ...base,
    ...seed,
    products: { ...base.products, ...seed.products },
    targetCustomers: { ...base.targetCustomers, ...seed.targetCustomers },
    currentMarketing: { ...base.currentMarketing, ...seed.currentMarketing },
    branding: { ...base.branding, ...seed.branding },
    id: `app_${n}`,
    reference: `FM-2026-${String(130 + n).padStart(4, "0")}`,
    status: path[path.length - 1],
    statusHistory,
    messages: [],
    createdAt: statusHistory[0].at,
    updatedAt: statusHistory[statusHistory.length - 1].at,
    ...extra,
  };
}

export const mockApplications: MarketingApplication[] = [
  app(1, {
    business: { name: "Sunrise Bakery", type: "restaurant", website: "https://sunrisebakery.com", email: "hello@sunrisebakery.com", phone: "+1 (614) 555-0181", address: "88 High St, Columbus, OH", serviceArea: "Short North and downtown", description: "Neighborhood bakery known for sourdough and morning pastries." },
    contact: { fullName: "Priya Patel", jobTitle: "Owner", email: "priya@sunrisebakery.com", phone: "+1 (614) 555-0182", preferredMethod: "email" },
    goals: ["more_customers", "repeat_customers", "build_email_list"],
    goalsDetail: "We want weekday mornings as busy as weekends and a loyalty list for pre-orders.",
    services: ["email_marketing", "social_media", "customer_retention"],
    products: { mainProducts: "Sourdough, croissants, custom cakes", mainServices: "Catering, pre-orders", bestSellers: "Almond croissant", newOfferings: "Holiday cookie boxes", currentPromotions: "", averagePurchase: "$18", advantages: "Everything baked from scratch at 4am", notes: "" },
    targetCustomers: { idealCustomer: "Local professionals and families within 2 miles", ageRange: "25–54", location: "Columbus", customerType: "Commuters, families", market: "b2c", interests: "Food, local events", additional: "" },
    currentMarketing: { channels: ["instagram", "print"], whatWorked: "Instagram photos of new pastries", whatDidNot: "Flyers", hasAgency: "no" },
    branding: { colors: ["#f59e0b", "#3f2a14"], fonts: "Playfair Display", uploads: [] },
    budget: "250_500", currentAdSpend: "$100/month", timeline: "asap", integrations: ["instagram", "stripe"],
  }, ["NEW"], 0.4),
  app(2, {
    business: { name: "Northside Auto Care", type: "local_service", website: "https://northsideauto.com", email: "service@northsideauto.com", phone: "+1 (614) 555-0144", address: "1200 Morse Rd, Columbus, OH", serviceArea: "North Columbus", description: "Independent auto repair and maintenance." },
    contact: { fullName: "Marcus Hill", jobTitle: "General manager", email: "marcus@northsideauto.com", phone: "+1 (614) 555-0145", preferredMethod: "phone" },
    goals: ["increase_appointments", "repeat_customers"], goalsDetail: "Remind customers about oil changes and seasonal tire swaps.",
    services: ["sms_marketing", "marketing_automation", "email_marketing"],
    budget: "500_1000", currentAdSpend: "$300/month on Google", timeline: "one_week", integrations: ["google", "crm"],
    currentMarketing: { channels: ["google", "website"], whatWorked: "Google reviews", whatDidNot: "Radio ads", hasAgency: "no" },
  }, ["NEW", "UNDER_REVIEW"], 2),
  app(3, {
    business: { name: "Luxe Threads", type: "ecommerce", website: "https://luxethreads.shop", email: "team@luxethreads.shop", phone: "+1 (614) 555-0110", address: "Online", serviceArea: "United States", description: "Online boutique for handmade scarves and wraps." },
    contact: { fullName: "Amara Okafor", jobTitle: "Founder", email: "amara@luxethreads.shop", phone: "+1 (614) 555-0111", preferredMethod: "fockis_messages" },
    goals: ["increase_sales", "launch_product"], goalsDetail: "Launching a winter collection in November.",
    services: ["email_marketing", "ecommerce_marketing", "social_media", "landing_pages"],
    budget: "1000_2500", currentAdSpend: "$600/month", timeline: "thirty_days", integrations: ["shopify", "instagram", "tiktok", "fockis"],
    currentMarketing: { channels: ["instagram", "tiktok", "email"], whatWorked: "TikTok try-on videos", whatDidNot: "Discount codes everywhere", hasAgency: "yes" },
  }, ["NEW", "UNDER_REVIEW", "MORE_INFORMATION_NEEDED"], 5),
  app(4, {
    business: { name: "Harbor Dental", type: "professional_services", website: "https://harbordental.com", email: "front@harbordental.com", phone: "+1 (614) 555-0170", address: "45 Lane Ave, Columbus, OH", serviceArea: "Clintonville and Upper Arlington", description: "Family dentistry and cosmetic care." },
    contact: { fullName: "Dr. Lena Brooks", jobTitle: "Practice owner", email: "lena@harbordental.com", phone: "+1 (614) 555-0171", preferredMethod: "email" },
    goals: ["increase_appointments", "generate_leads"], goalsDetail: "Fill cleaning appointments and promote whitening.",
    services: ["email_marketing", "sms_marketing", "marketing_automation", "local_marketing"],
    budget: "500_1000", timeline: "one_week", integrations: ["google"],
  }, ["NEW", "UNDER_REVIEW", "APPROVED"], 8),
  app(5, {
    business: { name: "XYZ Construction", type: "construction", website: "https://xyzconstruction.com", email: "hello@xyzconstruction.com", phone: "+1 (614) 555-0160", address: "300 Grove Rd, Grove City, OH", serviceArea: "Southwest Columbus", description: "Residential remodeling, decks, and additions." },
    contact: { fullName: "Tom Reyes", jobTitle: "Owner", email: "tom@xyzconstruction.com", phone: "+1 (614) 555-0161", preferredMethod: "phone" },
    goals: ["generate_leads", "promote_services"], services: ["email_marketing", "landing_pages"], budget: "250_500", timeline: "asap", integrations: [],
  }, ["NEW", "UNDER_REVIEW", "APPROVED", "CONVERTED_TO_CLIENT"], 9, { convertedBusinessId: "biz_xyz" }),
  app(6, {
    business: { name: "QuickCash Loans", type: "other", website: "", email: "info@quickcash.example", phone: "", address: "", serviceArea: "", description: "Short-term loans." },
    contact: { fullName: "J. Smith", jobTitle: "", email: "info@quickcash.example", phone: "", preferredMethod: "email" },
    goals: ["generate_leads"], services: ["sms_marketing", "advertising"], budget: "not_sure", timeline: "asap", integrations: [],
  }, ["NEW", "UNDER_REVIEW", "REJECTED"], 14),
];

mockApplications[2].messages = [
  { id: "m1", visibility: "client_visible", kind: "question", author: "Elince M.", body: "Thanks Amara! Could you share your launch date and which products you want to feature first?", at: daysAgo(3) },
  { id: "m2", visibility: "internal", kind: "note", author: "Elince M.", body: "Strong fit for e-commerce package. Already has an agency; ask why they're switching.", at: daysAgo(3) },
];
mockApplications[0].messages = [
  { id: "m1", visibility: "internal", kind: "note", author: "Dana Ross", body: "Great local fit. Suggest Growth plan.", at: daysAgo(0.2) },
];
