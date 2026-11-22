import type { Section, SectionType } from "../../types/content";

export type FieldType =
  | "text" | "textarea" | "image" | "color" | "select" | "number" | "toggle" | "link" | "icon"
  | "list" | "button" | "date" | "html" | "strings" | "links";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  itemFields?: FieldDef[];
  itemLabel?: string;
  newItem?: () => any;
  min?: number;
  max?: number;
  help?: string;
}

export interface SectionSchema {
  type: SectionType;
  label: string;
  icon: string;
  group: "element" | "section" | "component";
  description: string;
  variants?: { value: string; label: string }[];
  fields: FieldDef[];
  create: () => Omit<Section, "id">;
}

const btn = (label = "Learn More", href = "page:contact", style = "primary") => ({ label, href, icon: "", style });
const headingFields: FieldDef[] = [
  { key: "eyebrow", label: "Eyebrow", type: "text" },
  { key: "title", label: "Title", type: "text" },
  { key: "headingStyle", label: "Heading style", type: "select", options: [{ value: "lines", label: "Centered with lines" }, { value: "side-lines", label: "Title between lines" }, { value: "plain", label: "Plain" }] },
];
const buttonsField: FieldDef = { key: "buttons", label: "Buttons", type: "list", itemLabel: "label", newItem: () => btn(), itemFields: [{ key: "label", label: "Text", type: "text" }, { key: "href", label: "Link", type: "link" }, { key: "icon", label: "Icon", type: "icon" }, { key: "style", label: "Style", type: "select", options: ["primary", "outline", "accent", "outline-light", "outline-accent", "light"].map((v) => ({ value: v, label: v })) }] };
const pad = (t = 64, b = 64) => ({ paddingTop: t, paddingBottom: b });

export const SECTION_SCHEMAS: Record<SectionType, SectionSchema> = {
  header: {
    type: "header", label: "Header", icon: "LayoutGrid", group: "section", description: "Logo, menu and actions",
    fields: [
      { key: "logoText", label: "Logo text", type: "text" },
      { key: "logoSubtext", label: "Logo subtitle", type: "text" },
      { key: "logoIcon", label: "Logo icon", type: "icon" },
      { key: "logoUrl", label: "Logo image (replaces text)", type: "image" },
      { key: "layout", label: "Layout", type: "select", options: [{ value: "standard", label: "Standard" }, { value: "retail", label: "Store (search + category bar)" }] },
      { key: "logoStyle", label: "Logo style", type: "select", options: ["simple", "bakery", "restaurant", "retail", "beauty", "barber"].map((v) => ({ value: v, label: v })) },
      { key: "showTopBar", label: "Show top information bar", type: "toggle" },
      { key: "topBarLeft", label: "Top bar items", type: "list", itemLabel: "text", newItem: () => ({ icon: "Phone", text: "New item" }), itemFields: [{ key: "icon", label: "Icon", type: "icon" }, { key: "text", label: "Text", type: "text" }] },
      { key: "showSocialInTopBar", label: "Social icons in top bar", type: "toggle" },
      { key: "showSearch", label: "Search", type: "toggle" },
      { key: "showAccount", label: "Account icon", type: "toggle" },
      { key: "showWishlist", label: "Wishlist", type: "toggle" },
      { key: "showCart", label: "Cart icon", type: "toggle" },
      { key: "searchPlaceholder", label: "Search placeholder", type: "text" },
      { key: "cta", label: "Header button", type: "button" },
    ],
    create: () => ({ type: "header", props: { layout: "standard", logoStyle: "simple", logoText: "My Site", logoSubtext: "", logoIcon: "Store", showCart: false, cta: btn("Contact Us") }, style: {} }),
  },
  footer: {
    type: "footer", label: "Footer", icon: "LayoutGrid", group: "section", description: "Links, contact and hours",
    fields: [
      { key: "about", label: "About text", type: "textarea" },
      { key: "columns", label: "Link columns", type: "list", itemLabel: "title", newItem: () => ({ title: "Links", links: [["Home", "page:home"]] }), itemFields: [{ key: "title", label: "Title", type: "text" }, { key: "links", label: "Links", type: "links" }] },
      { key: "showContact", label: "Contact column", type: "toggle" },
      { key: "showHours", label: "Hours column", type: "toggle" },
      { key: "showSocial", label: "Social icons", type: "toggle" },
      { key: "copyright", label: "Copyright ({year} = current year)", type: "text" },
    ],
    create: () => ({ type: "footer", props: { about: "", columns: [], showContact: true, showHours: true, showSocial: true, copyright: "© {year} My Business" }, style: {} }),
  },
  hero: {
    type: "hero", label: "Hero Banner", icon: "Frame", group: "section", description: "Big headline with image and buttons",
    variants: [{ value: "split", label: "Split (image right)" }, { value: "overlay", label: "Dark overlay" }, { value: "centered", label: "Centered on image" }, { value: "bakery", label: "Soft blend" }, { value: "retail", label: "Store promo" }],
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "eyebrowStyle", label: "Eyebrow style", type: "select", options: [{ value: "text-lines", label: "Text with lines" }, { value: "icon-lines", label: "Icon with lines" }, { value: "none", label: "Plain" }] },
      { key: "eyebrowIcon", label: "Eyebrow icon", type: "icon" },
      { key: "preTitle", label: "Small line above title", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "titleAccent", label: "Accent title", type: "text" },
      { key: "accentStyle", label: "Accent style", type: "select", options: [{ value: "script", label: "Script" }, { value: "italic-color", label: "Italic color" }] },
      { key: "accentInline", label: "Accent on same line", type: "toggle" },
      { key: "tagline", label: "Tagline", type: "text" },
      { key: "subtitle", label: "Subtitle", type: "textarea" },
      { key: "contentAlign", label: "Text alignment", type: "select", options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }] },
      { key: "image", label: "Image", type: "image" },
      { key: "images", label: "Slideshow images", type: "strings", help: "Add 2+ images to enable the slideshow." },
      { key: "showArrows", label: "Slideshow arrows", type: "toggle" },
      buttonsField,
    ],
    create: () => ({ type: "hero", variant: "split", props: { eyebrowStyle: "text-lines", eyebrow: "WELCOME", title: "Your Big Headline", titleAccent: "", accentStyle: "script", subtitle: "Describe what makes your business special.", contentAlign: "left", image: "", images: [], buttons: [btn("Get Started", "page:contact")] }, style: { minHeight: 480, paddingTop: 0, paddingBottom: 0 } }),
  },
  "features-strip": {
    type: "features-strip", label: "Benefits Strip", icon: "BadgeCheck", group: "section", description: "Icons with short benefits",
    variants: [{ value: "strip", label: "Strip" }, { value: "cards", label: "Cards" }],
    fields: [
      { key: "dividers", label: "Dividers", type: "toggle" },
      { key: "iconColor", label: "Icon color", type: "color" },
      { key: "items", label: "Items", type: "list", itemLabel: "title", newItem: () => ({ icon: "Star", title: "New benefit", text: "Short description" }), itemFields: [{ key: "icon", label: "Icon", type: "icon" }, { key: "title", label: "Title", type: "text" }, { key: "text", label: "Text", type: "text" }] },
    ],
    create: () => ({ type: "features-strip", variant: "strip", props: { dividers: true, items: [{ icon: "Truck", title: "Fast Delivery", text: "Right to your door" }, { icon: "ShieldCheck", title: "Trusted", text: "Quality guaranteed" }, { icon: "Heart", title: "Made with Love", text: "By our local team" }] }, style: { ...pad(28, 28), columns: 3, responsive: { mobile: { columns: 1 } } } }),
  },
  "category-cards": {
    type: "category-cards", label: "Image Cards", icon: "LayoutGrid", group: "section", description: "Cards with photo and label",
    variants: [{ value: "caption-below", label: "Caption below" }, { value: "caption-bar", label: "Colored bar" }, { value: "overlay", label: "Text on image" }, { value: "circle", label: "Circles" }],
    fields: [...headingFields, { key: "barColor", label: "Bar color", type: "color" }, { key: "barTextColor", label: "Bar text color", type: "color" }, { key: "items", label: "Cards", type: "list", itemLabel: "label", newItem: () => ({ image: "", label: "New card", icon: "", href: "page:home" }), itemFields: [{ key: "image", label: "Image", type: "image" }, { key: "label", label: "Label", type: "text" }, { key: "icon", label: "Icon", type: "icon" }, { key: "href", label: "Link", type: "link" }] }],
    create: () => ({ type: "category-cards", variant: "caption-below", props: { eyebrow: "EXPLORE", title: "Our Favorites", headingStyle: "lines", items: [1, 2, 3, 4].map((i) => ({ image: "", label: `Card ${i}`, icon: "", href: "page:home" })) }, style: { ...pad(56, 56), columns: 4, responsive: { tablet: { columns: 2 }, mobile: { columns: 2 } } } }),
  },
  "category-tiles": {
    type: "category-tiles", label: "Category Tiles", icon: "LayoutGrid", group: "component", description: "Small store category shortcuts",
    fields: [{ key: "items", label: "Tiles", type: "list", itemLabel: "label", newItem: () => ({ image: "", label: "Category", href: "page:shop" }), itemFields: [{ key: "image", label: "Image", type: "image" }, { key: "label", label: "Label", type: "text" }, { key: "href", label: "Link", type: "link" }] }],
    create: () => ({ type: "category-tiles", props: { items: [1, 2, 3, 4, 5, 6].map((i) => ({ image: "", label: `Category ${i}`, href: "page:shop" })) }, style: { ...pad(16, 16), columns: 6, responsive: { mobile: { columns: 3 } } } }),
  },
  "product-grid": {
    type: "product-grid", label: "Featured Products", icon: "ShoppingBag", group: "component", description: "Products from your catalog",
    variants: [{ value: "retail", label: "Store cards" }, { value: "soft", label: "Soft cards" }, { value: "menu", label: "Menu rows" }],
    fields: [...headingFields, { key: "filter", label: "Show", type: "select", options: [{ value: "featured", label: "Featured" }, { value: "all", label: "All" }, { value: "new", label: "New arrivals" }, { value: "bestseller", label: "Best sellers" }, { value: "sale", label: "On sale" }] }, { key: "limit", label: "How many", type: "number", min: 1, max: 24 }, { key: "showRatings", label: "Ratings", type: "toggle" }, { key: "showWishlist", label: "Wishlist hearts", type: "toggle" }, { key: "buttonLabel", label: "Button text", type: "text" }, { key: "tabs", label: "Filter tabs", type: "list", itemLabel: "label", newItem: () => ({ label: "On Sale", filter: "sale" }), itemFields: [{ key: "label", label: "Label", type: "text" }, { key: "filter", label: "Filter", type: "select", options: ["featured", "all", "new", "bestseller", "sale"].map((v) => ({ value: v, label: v })) }] }],
    create: () => ({ type: "product-grid", variant: "soft", props: { eyebrow: "SHOP", title: "Featured Products", headingStyle: "lines", tabs: [], filter: "featured", limit: 4, showRatings: true, showWishlist: false, buttonLabel: "Add to Cart" }, style: { ...pad(), columns: 4, responsive: { tablet: { columns: 2 }, mobile: { columns: 1 } } } }),
  },
  "product-catalog": {
    type: "product-catalog", label: "Shop / Menu", icon: "ShoppingCart", group: "component", description: "Full catalog with search, filters and sorting",
    variants: [{ value: "retail", label: "Store cards" }, { value: "soft", label: "Soft cards" }],
    fields: [{ key: "layout", label: "Layout", type: "select", options: [{ value: "grid", label: "Grid" }, { value: "list", label: "Menu list" }] }, { key: "showSearch", label: "Search", type: "toggle" }, { key: "showCategories", label: "Category filters", type: "toggle" }, { key: "showSort", label: "Sorting", type: "toggle" }, { key: "showRatings", label: "Ratings", type: "toggle" }, { key: "showWishlist", label: "Wishlist hearts", type: "toggle" }, { key: "filterTag", label: "Only show", type: "select", options: [{ value: "", label: "Everything" }, { value: "new", label: "New" }, { value: "bestseller", label: "Best sellers" }, { value: "sale", label: "On sale" }] }],
    create: () => ({ type: "product-catalog", variant: "retail", props: { layout: "grid", showSearch: true, showCategories: true, showSort: true, showAddToCart: true, filterTag: "" }, style: { ...pad(24, 72), columns: 4, responsive: { tablet: { columns: 3 }, mobile: { columns: 2 } } } }),
  },
  "promo-banner": {
    type: "promo-banner", label: "Promo Banner", icon: "Megaphone", group: "section", description: "Special offer with image and button",
    variants: [{ value: "split-soft", label: "Split" }, { value: "special", label: "Special of the day" }, { value: "split-gold", label: "Diagonal gold" }, { value: "walkin", label: "Bold center" }],
    fields: [{ key: "image", label: "Image", type: "image" }, { key: "scriptTitle", label: "Script title", type: "text" }, { key: "title", label: "Title", type: "text" }, { key: "text", label: "Text", type: "textarea" }, { key: "price", label: "Price label", type: "text" }, { key: "button", label: "Button", type: "button" }],
    create: () => ({ type: "promo-banner", variant: "split-soft", props: { image: "", scriptTitle: "Limited time", title: "Special Offer", text: "Describe your promotion here.", price: "", button: btn("Shop Now", "page:shop", "accent") }, style: { background: "#111111", textColor: "#FFFFFF", paddingTop: 0, paddingBottom: 0 } }),
  },
  "text-block": {
    type: "text-block", label: "Text", icon: "PenLine", group: "element", description: "Heading and paragraph",
    fields: [...headingFields, { key: "body", label: "Text", type: "textarea" }, buttonsField],
    create: () => ({ type: "text-block", props: { eyebrow: "", title: "New Heading", body: "Write your paragraph here.", headingStyle: "plain", buttons: [] }, style: { ...pad(), align: "center" } }),
  },
  "image-text": {
    type: "image-text", label: "Image + Text", icon: "Frame", group: "section", description: "Photo next to a story",
    fields: [{ key: "eyebrow", label: "Eyebrow", type: "text" }, { key: "title", label: "Title", type: "text" }, { key: "body", label: "Text", type: "textarea" }, { key: "image", label: "Image", type: "image" }, { key: "imageSide", label: "Image side", type: "select", options: [{ value: "left", label: "Left" }, { value: "right", label: "Right" }] }, buttonsField],
    create: () => ({ type: "image-text", props: { eyebrow: "", title: "Our Story", body: "Tell visitors about your business.", image: "", imageSide: "left", buttons: [] }, style: pad(72, 72) }),
  },
  image: {
    type: "image", label: "Image", icon: "Camera", group: "element", description: "A single image",
    fields: [{ key: "src", label: "Image", type: "image" }, { key: "caption", label: "Caption", type: "text" }, { key: "href", label: "Link", type: "link" }],
    create: () => ({ type: "image", props: { src: "", caption: "", href: "" }, style: pad(32, 32) }),
  },
  "button-row": {
    type: "button-row", label: "Buttons", icon: "ArrowRight", group: "element", description: "One or more buttons",
    fields: [buttonsField],
    create: () => ({ type: "button-row", props: { buttons: [btn("Click Here")] }, style: { ...pad(24, 24), align: "center" } }),
  },
  gallery: {
    type: "gallery", label: "Image Gallery", icon: "LayoutGrid", group: "section", description: "Grid of photos with lightbox",
    fields: [...headingFields, { key: "images", label: "Images", type: "list", itemLabel: "alt", newItem: () => ({ src: "", alt: "" }), itemFields: [{ key: "src", label: "Image", type: "image" }, { key: "alt", label: "Alt text", type: "text" }] }, { key: "lightbox", label: "Open in lightbox", type: "toggle" }],
    create: () => ({ type: "gallery", props: { eyebrow: "", title: "Gallery", headingStyle: "plain", images: [], lightbox: true }, style: { ...pad(), columns: 4, responsive: { tablet: { columns: 3 }, mobile: { columns: 2 } } } }),
  },
  video: {
    type: "video", label: "Video", icon: "Video", group: "element", description: "YouTube, Vimeo or uploaded MP4",
    fields: [...headingFields, { key: "url", label: "Video link (YouTube, Vimeo or MP4)", type: "text" }, { key: "poster", label: "Poster image (MP4)", type: "image" }],
    create: () => ({ type: "video", props: { eyebrow: "", title: "", headingStyle: "plain", url: "" }, style: pad() }),
  },
  testimonials: {
    type: "testimonials", label: "Testimonials", icon: "MessageCircle", group: "section", description: "Customer reviews",
    fields: [...headingFields, { key: "items", label: "Reviews", type: "list", itemLabel: "name", newItem: () => ({ quote: "Amazing!", name: "Customer", rating: 5 }), itemFields: [{ key: "quote", label: "Quote", type: "textarea" }, { key: "name", label: "Name", type: "text" }, { key: "rating", label: "Stars", type: "number", min: 1, max: 5 }] }],
    create: () => ({ type: "testimonials", props: { eyebrow: "REVIEWS", title: "What People Say", headingStyle: "lines", items: [{ quote: "Fantastic service!", name: "Alex", rating: 5 }, { quote: "Highly recommend.", name: "Sam", rating: 5 }, { quote: "Will come back!", name: "Jo", rating: 5 }] }, style: { ...pad(), columns: 3, responsive: { mobile: { columns: 1 } } } }),
  },
  team: {
    type: "team", label: "Team Members", icon: "Users", group: "component", description: "Staff from Business → Staff",
    fields: [...headingFields, { key: "showBook", label: "Show booking buttons", type: "toggle" }],
    create: () => ({ type: "team", props: { eyebrow: "OUR TEAM", title: "Meet the Team", headingStyle: "lines", showBook: false }, style: { ...pad(), columns: 3, responsive: { mobile: { columns: 1 } } } }),
  },
  "services-list": {
    type: "services-list", label: "Services", icon: "Sparkles", group: "component", description: "Services with prices and booking",
    fields: [...headingFields, { key: "showPrice", label: "Prices", type: "toggle" }, { key: "showDuration", label: "Durations", type: "toggle" }, { key: "showBook", label: "Book buttons", type: "toggle" }, { key: "bookHref", label: "Booking page", type: "link" }],
    create: () => ({ type: "services-list", props: { eyebrow: "SERVICES", title: "What We Offer", headingStyle: "lines", showPrice: true, showDuration: true, showBook: true, bookHref: "page:book" }, style: { ...pad(), columns: 3, responsive: { tablet: { columns: 2 }, mobile: { columns: 1 } } } }),
  },
  "pricing-table": {
    type: "pricing-table", label: "Pricing Table", icon: "Award", group: "section", description: "Plans and packages",
    fields: [...headingFields, { key: "plans", label: "Plans", type: "list", itemLabel: "name", newItem: () => ({ name: "Plan", price: "$49", period: "per month", features: ["Feature"], button: btn("Choose"), highlighted: false }), itemFields: [{ key: "name", label: "Name", type: "text" }, { key: "price", label: "Price", type: "text" }, { key: "period", label: "Period", type: "text" }, { key: "features", label: "Features", type: "strings" }, { key: "highlighted", label: "Highlight", type: "toggle" }, { key: "button", label: "Button", type: "button" }] }],
    create: () => ({ type: "pricing-table", props: { eyebrow: "", title: "Pricing", headingStyle: "lines", plans: [{ name: "Basic", price: "$29", period: "per month", features: ["Feature one"], button: btn("Choose") }, { name: "Pro", price: "$59", period: "per month", features: ["Everything in Basic", "More"], button: btn("Choose"), highlighted: true }] }, style: { ...pad(), columns: 2, responsive: { mobile: { columns: 1 } } } }),
  },
  "contact-form": {
    type: "contact-form", label: "Contact Form", icon: "Mail", group: "component", description: "Messages and leads to your inbox",
    fields: [{ key: "title", label: "Title", type: "text" }, { key: "text", label: "Intro", type: "textarea" }, { key: "submitLabel", label: "Button text", type: "text" }, { key: "formType", label: "Form type", type: "select", options: [{ value: "contact", label: "Contact" }, { value: "lead", label: "Lead / quote" }, { value: "catering", label: "Catering request" }] }, { key: "fields", label: "Fields", type: "strings", help: "Available: name, email, phone, subject, date, guests, message" }, { key: "showInfo", label: "Show contact info", type: "toggle" }, { key: "showHours", label: "Show hours", type: "toggle" }],
    create: () => ({ type: "contact-form", props: { title: "Contact Us", text: "We usually reply within a day.", submitLabel: "Send", formType: "contact", fields: ["name", "email", "message"], showInfo: true, showHours: true }, style: pad(72, 72) }),
  },
  map: {
    type: "map", label: "Map", icon: "MapPin", group: "element", description: "Google map of your address",
    fields: [{ key: "address", label: "Address (blank = business address)", type: "text" }, { key: "height", label: "Height", type: "number", min: 200, max: 900 }],
    create: () => ({ type: "map", props: { address: "", height: 360 }, style: { paddingTop: 0, paddingBottom: 0, fullWidth: true } }),
  },
  faq: {
    type: "faq", label: "FAQ", icon: "MessageCircle", group: "section", description: "Questions and answers",
    fields: [{ key: "title", label: "Title", type: "text" }, { key: "items", label: "Questions", type: "list", itemLabel: "q", newItem: () => ({ q: "New question?", a: "Answer." }), itemFields: [{ key: "q", label: "Question", type: "text" }, { key: "a", label: "Answer", type: "textarea" }] }],
    create: () => ({ type: "faq", props: { title: "Frequently Asked Questions", items: [{ q: "Question?", a: "Answer." }] }, style: pad() }),
  },
  newsletter: {
    type: "newsletter", label: "Newsletter", icon: "Mail", group: "component", description: "Email sign-up",
    fields: [{ key: "title", label: "Title", type: "text" }, { key: "text", label: "Text", type: "text" }, { key: "placeholder", label: "Placeholder", type: "text" }, { key: "buttonLabel", label: "Button", type: "text" }],
    create: () => ({ type: "newsletter", props: { title: "Join Our Newsletter", text: "Offers and news in your inbox.", placeholder: "Your email", buttonLabel: "Subscribe" }, style: { ...pad(48, 48), background: "#111111", textColor: "#FFFFFF" } }),
  },
  "booking-form": {
    type: "booking-form", label: "Appointment Booking", icon: "CalendarDays", group: "component", description: "Services, staff, availability",
    fields: [{ key: "title", label: "Title", type: "text" }, { key: "submitLabel", label: "Button", type: "text" }, { key: "allowStaffChoice", label: "Let clients choose a professional", type: "toggle" }],
    create: () => ({ type: "booking-form", props: { title: "Book an Appointment", submitLabel: "Confirm Booking", allowStaffChoice: true }, style: pad() }),
  },
  "reservation-form": {
    type: "reservation-form", label: "Table Reservations", icon: "CalendarDays", group: "component", description: "Restaurant reservations",
    fields: [{ key: "title", label: "Title", type: "text" }, { key: "submitLabel", label: "Button", type: "text" }],
    create: () => ({ type: "reservation-form", props: { title: "Reserve a Table", submitLabel: "Request Reservation" }, style: pad() }),
  },
  "custom-cake-form": {
    type: "custom-cake-form", label: "Custom Order Builder", icon: "CakeSlice", group: "component", description: "Size, flavor, filling, frosting",
    fields: [{ key: "title", label: "Title", type: "text" }, { key: "note", label: "Note", type: "text" }, { key: "submitLabel", label: "Button", type: "text" }],
    create: () => ({ type: "custom-cake-form", props: { title: "Design Your Cake", note: "Custom cakes need 48 hours notice.", submitLabel: "Add Cake to Order" }, style: pad() }),
  },
  events: {
    type: "events", label: "Events", icon: "PartyPopper", group: "section", description: "Upcoming events",
    fields: [...headingFields, { key: "items", label: "Events", type: "list", itemLabel: "title", newItem: () => ({ title: "New Event", date: "Saturday", time: "7:00 PM", description: "", image: "", location: "" }), itemFields: [{ key: "title", label: "Title", type: "text" }, { key: "date", label: "Date", type: "text" }, { key: "time", label: "Time", type: "text" }, { key: "location", label: "Location", type: "text" }, { key: "description", label: "Description", type: "textarea" }, { key: "image", label: "Image", type: "image" }] }],
    create: () => ({ type: "events", props: { title: "Upcoming Events", headingStyle: "plain", items: [] }, style: { ...pad(), columns: 3, responsive: { mobile: { columns: 1 } } } }),
  },
  stats: {
    type: "stats", label: "Statistics", icon: "Trophy", group: "section", description: "Big numbers",
    fields: [{ key: "items", label: "Numbers", type: "list", itemLabel: "label", newItem: () => ({ value: "100+", label: "Clients" }), itemFields: [{ key: "value", label: "Value", type: "text" }, { key: "label", label: "Label", type: "text" }] }],
    create: () => ({ type: "stats", props: { items: [{ value: "10+", label: "Years" }, { value: "500+", label: "Clients" }, { value: "5★", label: "Rating" }] }, style: { ...pad(48, 48), columns: 3, background: "#111111", textColor: "#FFFFFF" } }),
  },
  "social-links": {
    type: "social-links", label: "Social Links", icon: "Instagram", group: "element", description: "Icons from Business → Social",
    fields: [{ key: "title", label: "Title", type: "text" }],
    create: () => ({ type: "social-links", props: { title: "Follow Us" }, style: { ...pad(40, 40), align: "center" } }),
  },
  countdown: {
    type: "countdown", label: "Countdown Timer", icon: "Clock", group: "element", description: "Count down to a date",
    fields: [{ key: "title", label: "Title", type: "text" }, { key: "target", label: "Target date & time", type: "date" }, { key: "endedText", label: "Text when finished", type: "text" }],
    create: () => ({ type: "countdown", props: { title: "Grand Opening In", headingStyle: "plain", target: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16), endedText: "We are open!" }, style: { ...pad(), align: "center" } }),
  },
  "blog-posts": {
    type: "blog-posts", label: "Blog Posts", icon: "Newspaper", group: "section", description: "Articles and news",
    fields: [...headingFields, { key: "posts", label: "Posts", type: "list", itemLabel: "title", newItem: () => ({ title: "New Post", excerpt: "", image: "", date: new Date().toLocaleDateString() }), itemFields: [{ key: "title", label: "Title", type: "text" }, { key: "date", label: "Date", type: "text" }, { key: "excerpt", label: "Excerpt", type: "textarea" }, { key: "image", label: "Image", type: "image" }] }],
    create: () => ({ type: "blog-posts", props: { title: "Latest News", headingStyle: "plain", posts: [] }, style: { ...pad(), columns: 3, responsive: { mobile: { columns: 1 } } } }),
  },
  hours: {
    type: "hours", label: "Hours & Location", icon: "Clock", group: "component", description: "Opening hours from Business settings",
    fields: [{ key: "title", label: "Title", type: "text" }, { key: "text", label: "Text", type: "textarea" }, { key: "showAddress", label: "Address", type: "toggle" }, { key: "showPhone", label: "Phone", type: "toggle" }],
    create: () => ({ type: "hours", props: { title: "Opening Hours", text: "", showAddress: true, showPhone: true }, style: pad(56, 56) }),
  },
  cart: {
    type: "cart", label: "Cart", icon: "ShoppingCart", group: "component", description: "Shopping cart page",
    fields: [{ key: "title", label: "Title", type: "text" }, { key: "emptyText", label: "Empty message", type: "text" }, { key: "continueLabel", label: "Continue button", type: "text" }],
    create: () => ({ type: "cart", props: { title: "Your Cart", emptyText: "Your cart is empty.", continueLabel: "Continue Shopping", continueHref: "page:home" }, style: pad(56, 72) }),
  },
  account: {
    type: "account", label: "Customer Account", icon: "User", group: "component", description: "Orders, tracking and bookings",
    fields: [{ key: "title", label: "Title", type: "text" }, { key: "text", label: "Text", type: "textarea" }],
    create: () => ({ type: "account", props: { title: "My Account", text: "Sign in to see your orders." }, style: pad(56, 72) }),
  },
  spacer: {
    type: "spacer", label: "Spacer", icon: "Minus", group: "element", description: "Empty vertical space",
    fields: [{ key: "height", label: "Height (px)", type: "number", min: 8, max: 400 }],
    create: () => ({ type: "spacer", props: { height: 48 }, style: { paddingTop: 0, paddingBottom: 0 } }),
  },
  "custom-html": {
    type: "custom-html", label: "Custom HTML", icon: "LayoutGrid", group: "element", description: "Embed HTML (scripts are blocked)",
    fields: [{ key: "html", label: "HTML", type: "html", help: "Rendered in a secure sandbox. Scripts never run on your published site." }, { key: "height", label: "Height (px)", type: "number", min: 40, max: 2000 }],
    create: () => ({ type: "custom-html", props: { html: "<p>Hello</p>", height: 200 }, style: pad(32, 32) }),
  },
};

export const LIBRARY_GROUPS: { id: "element" | "section" | "component"; label: string }[] = [
  { id: "element", label: "Elements" },
  { id: "section", label: "Sections" },
  { id: "component", label: "Components" },
];

/** Section types that can be inserted from the library (header/footer are global). */
export const INSERTABLE = (Object.keys(SECTION_SCHEMAS) as SectionType[]).filter((t) => t !== "header" && t !== "footer");
