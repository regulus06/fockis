import React from "react";
import {
  Armchair, ArrowRight, Award, BadgeCheck, Bath, Baby, Beef, Bike, BookHeart, BookOpen, Briefcase, Brush,
  Building2, CakeSlice, CalendarDays, Camera, Car, Check, ChefHat, ChevronDown, ChevronLeft, ChevronRight,
  Church, ClipboardList, Clock, Coffee, ConciergeBell, Cookie, Cpu, Croissant, CupSoda, Droplet, Drumstick,
  Dumbbell, Factory, Flower2, Frame, Gem, Gift, GraduationCap, Hammer, Hand, HardHat, Headphones, Heart,
  HeartHandshake, HeartPulse, Hotel, House, Lamp, Landmark, LayoutGrid, Leaf, LifeBuoy, Lightbulb, Lock,
  Mail, MapPin, Megaphone, Menu, MessageCircle, Mic, Minus, Music, Network, Newspaper, Palette, PartyPopper,
  PawPrint, PenLine, PenTool, Phone, Plane, Play, Plus, Repeat, RotateCcw, Ruler, Salad, Scale, Scissors,
  Search, Shirt, ShieldCheck, ShoppingBag, ShoppingBasket, ShoppingCart, Smile, Sofa, Soup, Sparkles, Star,
  Stethoscope, Store, Trash2, Trophy, Truck, User, Users, UtensilsCrossed, Video, Volleyball, Waves, Wheat,
  Wrench, X,
} from "lucide-react";

type IconProps = { size?: number; strokeWidth?: number; className?: string; color?: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconComponent = React.ComponentType<any>;

function svgBrand(path: React.ReactNode, viewBox = "0 0 24 24"): IconComponent {
  return function Brand({ size = 20, className, color }: IconProps) {
    return (
      <svg width={size} height={size} viewBox={viewBox} fill={color ?? "currentColor"} className={className} aria-hidden="true">
        {path}
      </svg>
    );
  };
}

const Facebook = svgBrand(<path d="M14 8h3V4h-3c-2.8 0-4 1.8-4 4.3V10H7v4h3v8h4v-8h3l1-4h-4V8.6c0-.4.3-.6.6-.6Z" />);
const Instagram = svgBrand(
  <>
    <path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2A3.2 3.2 0 1 1 12 8.8a3.2 3.2 0 0 1 0 6.4Z" />
    <path d="M17 2H7a5 5 0 0 0-5 5v10a5 5 0 0 0 5 5h10a5 5 0 0 0 5-5V7a5 5 0 0 0-5-5Zm3.2 15A3.2 3.2 0 0 1 17 20.2H7A3.2 3.2 0 0 1 3.8 17V7A3.2 3.2 0 0 1 7 3.8h10A3.2 3.2 0 0 1 20.2 7Z" />
    <circle cx="17.4" cy="6.6" r="1.2" />
  </>,
);
const TikTok = svgBrand(<path d="M16.5 3c.4 2.2 1.8 3.6 4 3.9v3.2c-1.5 0-2.9-.4-4-1.2v6.3a6 6 0 1 1-6-6c.3 0 .7 0 1 .1v3.3a2.8 2.8 0 1 0 1.8 2.6V3Z" />);
const Youtube = svgBrand(<path d="M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.6 12 31 31 0 0 0 2 15.8a3 3 0 0 0 2.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1c.3-1.3.4-2.5.4-3.8s-.1-2.5-.4-3.8ZM10 15V9l5.2 3Z" />);
const Twitter = svgBrand(<path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.2 21H2.1l7.3-8.3L1.8 3h6.4l4.4 5.8Zm-1.1 16.2h1.7L7.4 4.7H5.6Z" />);
const Linkedin = svgBrand(<path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.5h4V21H3Zm7 0h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.1c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21h-4Z" />);

/** Barber pole drawn with SVG so it can be recolored. */
const BarberPole: IconComponent = ({ size = 24, className }) => (
  <svg width={size * 0.55} height={size} viewBox="0 0 22 40" className={className} aria-hidden="true">
    <defs>
      <clipPath id="ws-pole-clip"><rect x="4" y="6" width="14" height="28" rx="7" /></clipPath>
      <pattern id="ws-pole-stripes" width="14" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
        <rect width="14" height="10" fill="#fff" />
        <rect width="14" height="3.4" y="0" fill="#D32F2F" />
        <rect width="14" height="3.4" y="5" fill="#1E5AA8" />
      </pattern>
    </defs>
    <rect x="3" y="0" width="16" height="6" rx="3" fill="#E9B54A" />
    <rect x="3" y="34" width="16" height="6" rx="3" fill="#E9B54A" />
    <g clipPath="url(#ws-pole-clip)"><rect x="0" y="0" width="22" height="40" fill="url(#ws-pole-stripes)" /></g>
    <rect x="4" y="6" width="14" height="28" rx="7" fill="none" stroke="#E9B54A" strokeWidth="1.2" />
  </svg>
);

export const ICONS: Record<string, IconComponent> = {
  Armchair, ArrowRight, Award, BadgeCheck, Bath, Baby, Beef, Bike, BookHeart, BookOpen, Briefcase, Brush,
  Building2, CakeSlice, CalendarDays, Camera, Car, Check, ChefHat, ChevronDown, ChevronLeft, ChevronRight,
  Church, ClipboardList, Clock, Coffee, ConciergeBell, Cookie, Cpu, Croissant, CupSoda, Droplet, Drumstick,
  Dumbbell, Factory, Flower2, Frame, Gem, Gift, GraduationCap, Hammer, Hand, HardHat, Headphones, Heart,
  HeartHandshake, HeartPulse, Hotel, Home: House, House, Lamp, Landmark, LayoutGrid, Leaf, LifeBuoy, Lightbulb, Lock,
  Mail, MapPin, Megaphone, Menu, MessageCircle, Mic, Minus, Music, Network, Newspaper, Palette, PartyPopper,
  PawPrint, PenLine, PenTool, Phone, Plane, Play, Plus, Repeat, RotateCcw, Ruler, Salad, Scale, Scissors,
  Search, Shirt, ShieldCheck, ShoppingBag, ShoppingBasket, ShoppingCart, Smile, Sofa, Soup, Sparkles, Star,
  Stethoscope, Store, Trash2, Trophy, Truck, User, Users, UtensilsCrossed, Video, Volleyball, Waves, Wheat,
  Wrench, X,
  Facebook, Instagram, TikTok, Youtube, Twitter, Linkedin, BarberPole,
};

export const ICON_NAMES = Object.keys(ICONS).sort();

export function Icon({ name, size = 20, strokeWidth = 1.75, className, color }: { name?: string | null } & IconProps) {
  if (!name) return null;
  const C = ICONS[name];
  if (!C) return null;
  return <C size={size} strokeWidth={strokeWidth} className={className} color={color} />;
}

export const SOCIAL_ICON: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "Youtube",
  twitter: "Twitter",
  linkedin: "Linkedin",
};
