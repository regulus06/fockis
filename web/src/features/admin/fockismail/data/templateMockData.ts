// Small-business email templates and automation templates.

import type { EmailBlockType, EmailTemplate, JourneyNodeData, Seed } from "../types/mailchimp.types";
import type { BusinessType } from "../types/platform.types";
import { documentFrom } from "../utils/emailBlocks";
import { daysAgo } from "./demoTime";

type Layout = Array<[EmailBlockType, string?]>;

const promo = (h: string, cta: string): Layout => [["logo"], ["image"], ["heading", h], ["text"], ["coupon"], ["button", cta], ["footer"]];
const note = (h: string, cta: string): Layout => [["logo"], ["heading", h], ["text"], ["button", cta], ["social"], ["footer"]];
const event = (h: string, cta: string): Layout => [["logo"], ["image"], ["heading", h], ["text"], ["countdown"], ["button", cta], ["footer"]];

const SMALL: Array<[string, string, string, Layout, BusinessType[]]> = [
  ["Restaurant promotion", "Feature a dish or special with a reservation button.", "#c2410c", promo("This week's chef special", "Reserve a table"), ["restaurant"]],
  ["Grand opening", "Announce your opening with date, address, and an invite.", "#1f5eff", event("We're open!", "Get directions"), []],
  ["New product", "Introduce something new with a photo and a clear button.", "#0e9f6e", [["logo"], ["image"], ["heading", "Meet our newest arrival"], ["text"], ["product"], ["button", "Shop now"], ["footer"]], ["retail", "ecommerce"]],
  ["Weekend sale", "A short, urgent sale email with a countdown.", "#d64545", [["logo"], ["heading", "Weekend sale: up to 30% off"], ["countdown"], ["product_grid"], ["button", "Shop the sale"], ["footer"]], ["retail", "ecommerce"]],
  ["Holiday promotion", "Seasonal offer with festive layout.", "#b91c1c", promo("Holiday savings are here", "See holiday offers"), []],
  ["Customer appreciation", "Say thank you to loyal customers with a small gift.", "#7c3aed", note("Thank you for being with us", "Claim your thank-you gift"), []],
  ["Birthday offer", "Celebrate a customer's birthday with a personal offer.", "#db2777", [["logo"], ["heading", "Happy birthday, *|FNAME|*!"], ["text"], ["coupon"], ["button", "Redeem your gift"], ["footer"]], []],
  ["Review request", "Ask happy customers to leave a review.", "#c98a04", note("How did we do?", "Leave a quick review"), ["restaurant", "barbershop", "salon", "local_service", "professional_services"]],
  ["Welcome customer", "Greet new customers and set expectations.", "#1f5eff", note("Welcome! We're glad you're here", "Explore what we offer"), []],
  ["Abandoned cart", "Remind shoppers about items left in their cart.", "#0e9f6e", [["logo"], ["heading", "You left something behind"], ["product"], ["button", "Return to your cart"], ["footer"]], ["ecommerce", "retail"]],
  ["Customer winback", "Invite lapsed customers back with an offer.", "#0891b2", promo("We miss you", "Come back and save"), []],
  ["Newsletter", "Monthly news with three short stories.", "#14213d", [["logo"], ["heading", "This month at our place"], ["image"], ["text"], ["columns"], ["button", "Read more"], ["footer"]], []],
  ["Appointment reminder", "Remind customers about upcoming appointments.", "#4338ca", note("See you soon", "Manage your appointment"), ["barbershop", "salon", "gym_fitness", "professional_services", "local_service"]],
  ["Real estate listing", "Showcase a property with photos and key details.", "#1e3a8a", [["logo"], ["image"], ["heading", "Just listed: 3 bed, 2 bath"], ["columns"], ["button", "View the listing"], ["footer"]], ["real_estate"]],
  ["Open house", "Invite buyers to an open house.", "#1e3a8a", event("Open house this Sunday", "RSVP for the open house"), ["real_estate"]],
  ["Service promotion", "Promote one service with benefits and a booking button.", "#a16207", promo("Book our fall service special", "Book now"), ["construction", "local_service", "professional_services", "consulting", "barbershop", "salon"]],
];

export const smallBusinessTemplates: Seed<EmailTemplate>[] = SMALL.map(([name, description, accent, layout, types], i) => ({
  id: `tpl_sb_${String(i + 1).padStart(2, "0")}`,
  name,
  category: "small_business",
  description,
  fockisSpecific: false,
  businessTypes: types,
  accent,
  updatedAt: daysAgo(10 + i),
  usageCount: 0,
  document: documentFrom(layout),
}));

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  trigger: string;
  icon: "sparkle" | "cart" | "refresh" | "star" | "users" | "check" | "clock" | "mail";
  /** Visual flow: Trigger → Wait → Email → Condition → Action. */
  steps: JourneyNodeData[];
}

function flow(id: string, trigger: string, wait: string, email: string, condition: string, yesAction: JourneyNodeData, noAction: JourneyNodeData): JourneyNodeData[] {
  return [
    { id: `${id}_t`, kind: "trigger", title: trigger, detail: "Starts the automation" },
    { id: `${id}_w`, kind: "wait", title: wait, detail: "Delay before the first email" },
    { id: `${id}_e`, kind: "email", title: email, detail: "Choose or edit the template" },
    { id: `${id}_c`, kind: "condition", title: condition, detail: "Checks what the contact did", yes: [yesAction], no: [noAction] },
  ];
}

export const automationTemplates: AutomationTemplate[] = [
  { id: "auto_welcome", name: "Welcome customer", description: "Greet new customers and introduce your business.", trigger: "Contact subscribes", icon: "sparkle",
    steps: flow("auto_welcome", "Contact subscribes", "Wait 1 hour", "Send welcome email", "Opened the email?", { id: "aw_y", kind: "tag", title: "Tag as engaged", detail: "Adds tag “Engaged”" }, { id: "aw_n", kind: "email", title: "Send a reminder", detail: "Template: Welcome customer" }) },
  { id: "auto_cart", name: "Abandoned cart", description: "Remind shoppers about items left in their cart.", trigger: "Cart idle for 4 hours", icon: "cart",
    steps: flow("auto_cart", "Cart idle for 4 hours", "Wait 4 hours", "Send cart reminder", "Purchased?", { id: "ac_y", kind: "tag", title: "Tag as buyer", detail: "Adds tag “Buyer”" }, { id: "ac_n", kind: "email", title: "Send 10% off code", detail: "Template: Abandoned cart" }) },
  { id: "auto_winback", name: "Customer winback", description: "Bring back customers who haven't visited in a while.", trigger: "No purchase in 90 days", icon: "refresh",
    steps: flow("auto_winback", "No purchase in 90 days", "Wait 1 day", "Send “we miss you”", "Came back?", { id: "awb_y", kind: "tag", title: "Remove lapsed tag", detail: "Removes “Lapsed”" }, { id: "awb_n", kind: "sms", title: "Send SMS offer", detail: "Short text with a code" }) },
  { id: "auto_review", name: "Review request", description: "Ask happy customers for a review after a visit.", trigger: "Visit or order completed", icon: "star",
    steps: flow("auto_review", "Visit or order completed", "Wait 2 days", "Ask for a review", "Clicked review link?", { id: "ar_y", kind: "tag", title: "Tag as reviewer", detail: "Adds tag “Reviewer”" }, { id: "ar_n", kind: "email", title: "Gentle reminder", detail: "Template: Review request" }) },
  { id: "auto_birthday", name: "Birthday", description: "Send a birthday offer every year.", trigger: "Contact's birthday", icon: "star",
    steps: flow("auto_birthday", "Contact's birthday", "Wait until 9 AM", "Send birthday offer", "Redeemed offer?", { id: "ab_y", kind: "tag", title: "Tag as redeemed", detail: "Adds tag “Birthday redeemed”" }, { id: "ab_n", kind: "sms", title: "Send SMS reminder", detail: "Offer ends soon" }) },
  { id: "auto_lead", name: "Lead follow-up", description: "Follow up quickly with new leads from forms.", trigger: "Form submitted", icon: "users",
    steps: flow("auto_lead", "Form submitted", "Wait 10 minutes", "Send thank-you and next steps", "Booked a call?", { id: "al_y", kind: "webhook", title: "Notify your team", detail: "POST to your CRM" }, { id: "al_n", kind: "email", title: "Send case study", detail: "Template: Service promotion" }) },
  { id: "auto_post", name: "Post purchase", description: "Thank buyers and suggest what's next.", trigger: "Order delivered", icon: "check",
    steps: flow("auto_post", "Order delivered", "Wait 3 days", "Send thank-you email", "Purchased again?", { id: "ap_y", kind: "tag", title: "Tag as repeat buyer", detail: "Adds tag “Repeat”" }, { id: "ap_n", kind: "email", title: "Recommend products", detail: "Template: New product" }) },
  { id: "auto_inactive", name: "Inactive customer", description: "Re-engage contacts who stopped opening emails.", trigger: "No opens in 60 days", icon: "clock",
    steps: flow("auto_inactive", "No opens in 60 days", "Wait 1 day", "Send re-engagement email", "Opened?", { id: "ai_y", kind: "tag", title: "Tag as re-engaged", detail: "Adds tag “Re-engaged”" }, { id: "ai_n", kind: "audience", title: "Move to inactive", detail: "Stops regular sends" }) },
];
