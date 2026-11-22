import type React from "react";
import type { SectionType } from "../../types/content";
import HeaderSection from "./HeaderSection";
import FooterSection from "./FooterSection";
import HeroSection from "./HeroSection";
import { CategoryCards, CategoryTiles, FeaturesStrip, PromoBanner } from "./CardSections";
import { AccountSection, CartSection, ProductCatalog, ProductGrid } from "./CommerceSections";
import {
  BlogPosts, ButtonRow, Countdown, CustomHtml, Events, Faq, Gallery, Hours, ImageBlock, ImageText, MapSection,
  PricingTable, ServicesList, SocialLinksSection, Spacer, Stats, Team, Testimonials, TextBlock, VideoSection,
} from "./ContentSections";
import { BookingForm, ContactForm, CustomCakeForm, Newsletter, ReservationForm } from "./FormSections";

/** Registry of every universal component. New components only need an entry here + a schema entry. */
export const SECTION_COMPONENTS: Record<SectionType, React.ComponentType> = {
  header: HeaderSection,
  footer: FooterSection,
  hero: HeroSection,
  "features-strip": FeaturesStrip,
  "category-cards": CategoryCards,
  "category-tiles": CategoryTiles,
  "product-grid": ProductGrid,
  "product-catalog": ProductCatalog,
  "promo-banner": PromoBanner,
  "text-block": TextBlock,
  "image-text": ImageText,
  image: ImageBlock,
  "button-row": ButtonRow,
  gallery: Gallery,
  video: VideoSection,
  testimonials: Testimonials,
  team: Team,
  "services-list": ServicesList,
  "pricing-table": PricingTable,
  "contact-form": ContactForm,
  map: MapSection,
  faq: Faq,
  newsletter: Newsletter,
  "booking-form": BookingForm,
  "reservation-form": ReservationForm,
  "custom-cake-form": CustomCakeForm,
  events: Events,
  stats: Stats,
  "social-links": SocialLinksSection,
  countdown: Countdown,
  "blog-posts": BlogPosts,
  hours: Hours,
  cart: CartSection,
  account: AccountSection,
  spacer: Spacer,
  "custom-html": CustomHtml,
};
