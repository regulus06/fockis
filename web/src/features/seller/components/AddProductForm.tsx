import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FOCKIS_API_URL } from "../../../config/fockisConfig";
import { sellerApi } from "../services/sellerApi";
import ProductImageCropper from "./ProductImageCropper";
import "../styles/AddProductForm.scss";
import "../styles/ProductEditor.scss";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type Category = {
  _id?: string;
  id?: string;
  slug?: string;
  name: string;
  isActive?: boolean;
  active?: boolean;
  status?: string;
};

type Store = {
  _id: string;
  id?: string;
  name?: string;
  country?: string;
  countryCode?: string;
  currency?: string;
  [key: string]: unknown;
};

type AddProductFormProps = {
  mode?: "create" | "edit";
  productId?: string;
  initialData?: any;
};

type ProductFormState = {
  name: string;
  brand: string;
  location: string;
  description: string;
  price: number;
  stock: number;
  category: string;
};

type Variant = {
  id: string;
  color: string;
  size: string;
  sku: string;
  price: number;
  stock: number;
  imageUrl: string;
};

type CropJob = { file: File; replaceIndex?: number };

type WeightUnit = "lb" | "oz" | "kg" | "g";
type DimensionUnit = "in" | "cm" | "ft" | "mm" | "m";

const STEPS = [
  { id: "details", label: "Product details" },
  { id: "variants", label: "Variants & inventory" },
  { id: "shipping", label: "Shipping" },
  { id: "media", label: "Media" },
  { id: "review", label: "Review" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const EMPTY_FORM: ProductFormState = {
  name: "",
  brand: "",
  location: "",
  description: "",
  price: 0,
  stock: 0,
  category: "",
};

const DRAFT_KEY = "fockis.seller.productDraft.v1";

const LEGACY_CATEGORY_NAMES = new Set([
  "other", "others", "garbage", "old", "old category", "old-category",
  "uncategorized", "un-categorized", "uncategorised", "un-categorised",
  "default", "unknown", "test", "testing", "demo",
]);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const REQUIRED_IMAGE_WIDTH = 600;
const REQUIRED_IMAGE_HEIGHT = 600;
const MAX_IMAGES = 8;
const MAX_SOURCE_IMAGE_BYTES = 25 * 1024 * 1024;

const COUNTRY_CURRENCY: Record<string, string> = {
  US: "USD", USA: "USD", "UNITED STATES": "USD",
  CA: "CAD", CANADA: "CAD", HT: "HTG", HAITI: "HTG",
  DO: "DOP", "DOMINICAN REPUBLIC": "DOP", MX: "MXN", MEXICO: "MXN",
  BR: "BRL", BRAZIL: "BRL", GB: "GBP", UK: "GBP", "UNITED KINGDOM": "GBP",
  FR: "EUR", FRANCE: "EUR", DE: "EUR", GERMANY: "EUR", ES: "EUR", SPAIN: "EUR",
  IT: "EUR", ITALY: "EUR", PT: "EUR", PORTUGAL: "EUR", NL: "EUR", NETHERLANDS: "EUR",
  BE: "EUR", BELGIUM: "EUR", IE: "EUR", IRELAND: "EUR", AT: "EUR", AUSTRIA: "EUR",
  FI: "EUR", FINLAND: "EUR", GR: "EUR", GREECE: "EUR", CH: "CHF", SWITZERLAND: "CHF",
  AU: "AUD", AUSTRALIA: "AUD", NZ: "NZD", "NEW ZEALAND": "NZD", JP: "JPY", JAPAN: "JPY",
  CN: "CNY", CHINA: "CNY", IN: "INR", INDIA: "INR", KR: "KRW", "SOUTH KOREA": "KRW",
  SG: "SGD", SINGAPORE: "SGD", ZA: "ZAR", "SOUTH AFRICA": "ZAR", NG: "NGN", NIGERIA: "NGN",
  KE: "KES", KENYA: "KES", GH: "GHS", GHANA: "GHS", JM: "JMD", JAMAICA: "JMD",
  TT: "TTD", "TRINIDAD AND TOBAGO": "TTD", BS: "BSD", BAHAMAS: "BSD", BB: "BBD", BARBADOS: "BBD",
  BZ: "BZD", BELIZE: "BZD", CR: "CRC", "COSTA RICA": "CRC", PA: "PAB", PANAMA: "PAB",
  CO: "COP", COLOMBIA: "COP", AR: "ARS", ARGENTINA: "ARS", CL: "CLP", CHILE: "CLP",
  PE: "PEN", PERU: "PEN", UY: "UYU", URUGUAY: "UYU", PH: "PHP", PHILIPPINES: "PHP",
  MY: "MYR", MALAYSIA: "MYR", TH: "THB", THAILAND: "THB", ID: "IDR", INDONESIA: "IDR",
  VN: "VND", VIETNAM: "VND", PK: "PKR", PAKISTAN: "PKR", BD: "BDT", BANGLADESH: "BDT",
  SA: "SAR", "SAUDI ARABIA": "SAR", AE: "AED", "UNITED ARAB EMIRATES": "AED",
  IL: "ILS", ISRAEL: "ILS", TR: "TRY", TURKEY: "TRY", PL: "PLN", POLAND: "PLN",
  CZ: "CZK", "CZECH REPUBLIC": "CZK", CZECHIA: "CZK", HU: "HUF", HUNGARY: "HUF",
  RO: "RON", ROMANIA: "RON", BG: "BGN", BULGARIA: "BGN", SE: "SEK", SWEDEN: "SEK",
  NO: "NOK", NORWAY: "NOK", DK: "DKK", DENMARK: "DKK", IS: "ISK", ICELAND: "ISK",
  UA: "UAH", UKRAINE: "UAH", RU: "RUB", RUSSIA: "RUB", EG: "EGP", EGYPT: "EGP",
  MA: "MAD", MOROCCO: "MAD",
};

const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const SHOE_SIZES_US = ["US 5", "US 6", "US 7", "US 8", "US 9", "US 10", "US 11", "US 12", "US 13", "US 14"];
const SHOE_SIZES_EU = ["EU 36", "EU 37", "EU 38", "EU 39", "EU 40", "EU 41", "EU 42", "EU 43", "EU 44", "EU 45", "EU 46"];
const SHOE_SIZES_UK = ["UK 3", "UK 4", "UK 5", "UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11", "UK 12"];
const HAT_SIZES = ["One Size", "S", "M", "L", "XL", "S/M", "L/XL"];
const BELT_SIZES = ["28", "30", "32", "34", "36", "38", "40", "42", "44", "46"];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function isSelectableCategory(category: Category): boolean {
  const name = String(category?.name ?? "").trim().toLowerCase();
  if (!name || LEGACY_CATEGORY_NAMES.has(name)) return false;
  if (category.isActive === false || category.active === false) return false;
  if (typeof category.status === "string" &&
    !["active", "enabled", "published"].includes(category.status.toLowerCase())) return false;
  return true;
}

function normalizeCategoryRows(result: any): Category[] {
  const candidates = [result, result?.categories, result?.data, result?.data?.categories, result?.items, result?.results];
  const rows = candidates.find(Array.isArray) as any[] | undefined;
  if (!rows) return [];
  const seen = new Set<string>();
  return rows
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      ...item,
      _id: item._id ? String(item._id) : item.id ? String(item.id) : undefined,
      slug: item.slug ? String(item.slug) : undefined,
      name: String(item.name ?? item.title ?? item.label ?? "").trim(),
    }))
    .filter((item: Category) => isSelectableCategory(item))
    .filter((item: Category) => {
      const key = (item.slug || item._id || item.name).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function imageUrl(value: unknown): string {
  const path = String(value ?? "").trim();
  if (!path || path === "undefined" || path.includes("/uploads/undefined")) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/")) return `${FOCKIS_API_URL}${path}`;
  return `${FOCKIS_API_URL}/uploads/${path}`;
}

function normalizeId(value: any): string {
  if (value && typeof value === "object") return String(value._id ?? value.id ?? "");
  return String(value ?? "");
}

function getErrorMessage(error: any, fallback: string): string {
  const message = error?.response?.data?.message ?? error?.message ?? fallback;
  return Array.isArray(message) ? message.join("; ") : String(message);
}

function inferCurrency(store?: Store): string {
  const explicit = String(store?.currency ?? "").trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(explicit)) return explicit;
  const countryCode = String(store?.countryCode ?? "").trim().toUpperCase();
  if (COUNTRY_CURRENCY[countryCode]) return COUNTRY_CURRENCY[countryCode];
  const country = String(store?.country ?? "").trim().toUpperCase();
  return COUNTRY_CURRENCY[country] || "USD";
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0);
  } catch {
    return `${currency} ${(Number.isFinite(amount) ? amount : 0).toFixed(2)}`;
  }
}

function makeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function splitOptions(value: string): string[] {
  return Array.from(new Set(value.split(",").map((item) => item.trim()).filter(Boolean)));
}

function isPositive(value: string): boolean {
  return value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) > 0;
}

function sizesForText(text: string): string[] | null {
  if (/shoe|sneaker|boot|sandal|footwear|heel|slipper/.test(text)) return SHOE_SIZES_US;
  if (/hat|cap|beanie|headwear/.test(text)) return HAT_SIZES;
  if (/belt/.test(text)) return BELT_SIZES;
  if (/cloth|apparel|shirt|dress|pants|jean|jacket|hoodie|fashion|wear/.test(text)) return CLOTHING_SIZES;
  return null;
}

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

function Svg({ children, size = 18 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const Icons = {
  doc: <Svg><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></Svg>,
  cube: <Svg><path d="M21 16V8l-9-5-9 5v8l9 5z" /><path d="M3.3 7.5 12 12l8.7-4.5M12 22V12" /></Svg>,
  layers: <Svg><path d="m12 2 10 5-10 5L2 7z" /><path d="m2 17 10 5 10-5M2 12l10 5 10-5" /></Svg>,
  truck: <Svg><path d="M1 4h14v12H1zM15 9h4l3 3v4h-7" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></Svg>,
  image: <Svg><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></Svg>,
  flag: <Svg><path d="M4 22V4M4 4h13l-2 4 2 4H4" /></Svg>,
  eye: <Svg><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></Svg>,
  tag: <Svg><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" /><circle cx="7.5" cy="7.5" r="1.5" /></Svg>,
  coins: <Svg><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></Svg>,
  check: <Svg size={14}><path d="M20 6 9 17l-5-5" /></Svg>,
  chevron: <Svg size={14}><path d="m9 18 6-6-6-6" /></Svg>,
  plus: <Svg size={20}><path d="M12 5v14M5 12h14" /></Svg>,
  save: <Svg><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><path d="M17 21v-8H7v8M7 3v5h8" /></Svg>,
  send: <Svg><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></Svg>,
  close: <Svg><path d="M18 6 6 18M6 6l12 12" /></Svg>,
  imagePlus: (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
      <rect x="6" y="10" width="36" height="36" rx="6" stroke="currentColor" strokeWidth="3" />
      <circle cx="18" cy="22" r="4" stroke="currentColor" strokeWidth="3" />
      <path d="m8 42 12-12 8 8 6-6 8 8" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="44" cy="12" r="9" fill="currentColor" />
      <path d="M44 7.5v9M39.5 12h9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
};

/* ------------------------------------------------------------------ */
/* Small UI pieces                                                     */
/* ------------------------------------------------------------------ */

function Switch({ checked, onChange, label, disabled }: {
  checked: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`pe-switch${checked ? " is-on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

function ToggleRow({ title, description, checked, onChange }: {
  title: string; description: string; checked: boolean; onChange: (next: boolean) => void;
}) {
  return (
    <div className="pe-toggle-row">
      <span className="pe-toggle-chevron">{Icons.chevron}</span>
      <div className="pe-toggle-text">
        <strong>{title}</strong>
        <small>{description}</small>
      </div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

function CardHeader({ icon, title, hint, aside }: {
  icon: React.ReactNode; title: string; hint?: string; aside?: React.ReactNode;
}) {
  return (
    <div className="pe-card-header">
      <span className="pe-card-icon">{icon}</span>
      <h2>{title}</h2>
      {hint && <p className="pe-card-hint">{hint}</p>}
      {aside && <div className="pe-card-aside">{aside}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function AddProductForm({ mode = "create", productId, initialData }: AddProductFormProps) {
  const navigate = useNavigate();
  const formId = "product-editor-form";

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [discount, setDiscount] = useState(0);

  // Seller declarations about the brand and how the product is sourced.
  const [brandOwnership, setBrandOwnership] = useState<"" | "OWN_BRAND" | "THIRD_PARTY_BRAND" | "UNBRANDED">("");
  const [productSource, setProductSource] = useState<"" | "SELF_MANUFACTURED" | "SUPPLIER" | "DROPSHIPPING">("");
  const [supplierName, setSupplierName] = useState("");
  const [sourcingDetails, setSourcingDetails] = useState("");
  const [fulfillmentDetails, setFulfillmentDetails] = useState("");

  // Shipping package measurements sent to the backend and Shippo.
  const [shippingWeight, setShippingWeight] = useState("");
  const [shippingWeightUnit, setShippingWeightUnit] = useState<WeightUnit>("lb");
  const [shippingLength, setShippingLength] = useState("");
  const [shippingWidth, setShippingWidth] = useState("");
  const [shippingHeight, setShippingHeight] = useState("");
  const [shippingDimensionUnit, setShippingDimensionUnit] = useState<DimensionUnit>("in");

  // Visibility & selling.
  const [isActive, setIsActive] = useState(true);
  const [freeShipping, setFreeShipping] = useState(false);
  const [trackInventory, setTrackInventory] = useState(true);
  const [allowReturns, setAllowReturns] = useState(true);
  const [allowPreorder, setAllowPreorder] = useState(false);

  const [locations, setLocations] = useState<string[]>(["marketplace"]);
  const [feedDays, setFeedDays] = useState(3);
  const [storyDays, setStoryDays] = useState(1);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [originalFiles, setOriginalFiles] = useState<File[]>([]);
  const [cropQueue, setCropQueue] = useState<CropJob[]>([]);
  const [cropBatchTotal, setCropBatchTotal] = useState(0);
  const [previews, setPreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<StepId>("details");

  const [categorySuggestionOpen, setCategorySuggestionOpen] = useState(false);
  const [categorySuggestion, setCategorySuggestion] = useState("");
  const [categorySuggestionStatus, setCategorySuggestionStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [categorySuggestionError, setCategorySuggestionError] = useState("");

  // Variation editor.
  const [enableVariants, setEnableVariants] = useState(false);
  const [hasColors, setHasColors] = useState(true);
  const [hasSizes, setHasSizes] = useState(true);
  const [colorInput, setColorInput] = useState("Black, White");
  const [sizeInput, setSizeInput] = useState(CLOTHING_SIZES.join(", "));
  const [sizeSystem, setSizeSystem] = useState("US");
  const [material, setMaterial] = useState("");
  const [fit, setFit] = useState("");
  const [productType, setProductType] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [capacity, setCapacity] = useState("");
  const [weight, setWeight] = useState("");
  const [beltLength, setBeltLength] = useState("");
  const [beltWidth, setBeltWidth] = useState("");
  const [headCircumference, setHeadCircumference] = useState("");
  const [buckleColor, setBuckleColor] = useState("");
  const [widthFit, setWidthFit] = useState("");
  const [variants, setVariants] = useState<Variant[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const errorRef = useRef<HTMLDivElement>(null);

  /* Derived values ------------------------------------------------- */

  const activeStore = useMemo(() => stores.find((store) => normalizeId(store) === selectedStore), [stores, selectedStore]);
  const currency = useMemo(() => inferCurrency(activeStore), [activeStore]);
  const salePrice = useMemo(() => Math.max(0, form.price * (1 - discount / 100)), [form.price, discount]);
  const savings = useMemo(() => Math.max(0, form.price - salePrice), [form.price, salePrice]);
  const variantStock = useMemo(() => variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0), [variants]);
  const totalStock = enableVariants ? variantStock : form.stock;

  const categoryText = `${form.category} ${form.name} ${productType}`.toLowerCase();
  const productKind = useMemo(() => {
    if (/shoe|sneaker|boot|sandal|footwear|heel|slipper/.test(categoryText)) return "shoes";
    if (/hat|cap|beanie|headwear/.test(categoryText)) return "hats";
    if (/belt/.test(categoryText)) return "belts";
    if (/cloth|apparel|shirt|dress|pants|jean|jacket|hoodie|fashion|wear/.test(categoryText)) return "clothing";
    return "general";
  }, [categoryText]);

  const recommendedSizes = productKind === "shoes"
    ? (sizeSystem === "EU" ? SHOE_SIZES_EU : sizeSystem === "UK" ? SHOE_SIZES_UK : SHOE_SIZES_US)
    : productKind === "hats" ? HAT_SIZES
      : productKind === "belts" ? BELT_SIZES : CLOTHING_SIZES;

  const currentSizes = splitOptions(sizeInput);
  const currentColors = splitOptions(colorInput);
  const imageCount = existingImages.length + selectedFiles.length;
  const shippingComplete = isPositive(shippingWeight) && isPositive(shippingLength)
    && isPositive(shippingWidth) && isPositive(shippingHeight);
  const showInMarketplace = locations.includes("marketplace");

  const stockLabel = !trackInventory
    ? "In stock"
    : totalStock > 0
      ? `${totalStock} in stock`
      : allowPreorder ? "Available for pre-order" : "Out of stock";
  const inStock = !trackInventory || totalStock > 0 || allowPreorder;

  const checklist = [
    { label: "Store selected", done: Boolean(selectedStore) },
    { label: "Product name", done: Boolean(form.name.trim()) },
    { label: "Category", done: Boolean(form.category) },
    { label: "Price greater than 0", done: form.price > 0 },
    { label: "Shipping package weight and size", done: shippingComplete },
    { label: "At least one product image", done: imageCount > 0 },
    { label: "At least one placement", done: locations.length > 0 },
  ];

  const stepDone: Record<StepId, boolean> = {
    details: Boolean(selectedStore && form.name.trim() && form.category),
    variants: form.price > 0 && (!enableVariants || variants.length > 0),
    shipping: shippingComplete,
    media: imageCount > 0,
    review: checklist.every((item) => item.done),
  };

  /* Data loading --------------------------------------------------- */

  useEffect(() => {
    let active = true;
    async function loadCategories() {
      setCategoriesLoading(true);
      try {
        const result = await sellerApi.getCategories();
        const normalized = normalizeCategoryRows(result);
        if (!active) return;
        setCategories(normalized);
        setForm((current) => current.category && normalized.some((item) => item.name === current.category)
          ? current : current.category && mode !== "edit" ? { ...current, category: "" } : current);
        setPageError((current) => current.startsWith("We couldn't load product categories") ? "" : current);
        if (!normalized.length) console.warn("Fockis categories endpoint returned no selectable categories.", result);
      } catch (error) {
        console.error("CATEGORY LOAD ERROR:", error);
        if (active) {
          setCategories([]);
          setPageError("We couldn't load product categories. Check that the API is running and GET /marketplace/categories returns category records.");
        }
      } finally {
        if (active) setCategoriesLoading(false);
      }
    }
    void loadCategories();
    return () => { active = false; };
  }, [mode]);

  useEffect(() => {
    let active = true;
    async function loadStores() {
      try {
        const result = await sellerApi.getMyStores();
        const rows = Array.isArray(result) ? result
          : Array.isArray(result?.stores) ? result.stores
            : Array.isArray(result?.data) ? result.data
              : result && typeof result === "object" ? [result] : [];
        const validStores = rows.filter((store: any) => normalizeId(store));
        if (!active) return;
        setStores(validStores);
        const initialStoreId = normalizeId(initialData?.storeId);
        const preferred = mode === "edit" ? initialStoreId : "";
        const nextStore = validStores.find((store: Store) => normalizeId(store) === preferred)
          ? preferred : normalizeId(validStores[0]);
        setSelectedStore(nextStore);
      } catch (error) {
        console.error("STORE LOAD ERROR:", error);
        if (active) setPageError((current) => current || "We couldn't load your stores. Make sure your seller account has a store.");
      }
    }
    void loadStores();
    return () => { active = false; };
  }, [initialData, mode]);

  // Fill the form when editing an existing product.
  useEffect(() => {
    if (mode !== "edit" || !initialData) return;
    setForm({
      name: String(initialData.name ?? ""),
      brand: String(initialData.brand ?? ""),
      location: String(initialData.location ?? ""),
      description: String(initialData.description ?? ""),
      price: Number(initialData.price) || 0,
      stock: Number(initialData.stock) || 0,
      category: String(initialData.category ?? ""),
    });
    setDiscount(Number(initialData.discount) || 0);
    setBrandOwnership(["OWN_BRAND", "THIRD_PARTY_BRAND", "UNBRANDED"].includes(initialData.brandOwnership)
      ? initialData.brandOwnership : "");
    setProductSource(["SELF_MANUFACTURED", "SUPPLIER", "DROPSHIPPING"].includes(initialData.productSource)
      ? initialData.productSource : "");
    setSupplierName(String(initialData.supplierName ?? ""));
    setSourcingDetails(String(initialData.sourcingDetails ?? ""));
    setFulfillmentDetails(String(initialData.fulfillmentDetails ?? ""));

    setShippingWeight(initialData.shippingWeight != null ? String(initialData.shippingWeight) : "");
    setShippingWeightUnit(["lb", "oz", "kg", "g"].includes(initialData.shippingWeightUnit) ? initialData.shippingWeightUnit : "lb");
    setShippingLength(initialData.shippingLength != null ? String(initialData.shippingLength) : "");
    setShippingWidth(initialData.shippingWidth != null ? String(initialData.shippingWidth) : "");
    setShippingHeight(initialData.shippingHeight != null ? String(initialData.shippingHeight) : "");
    setShippingDimensionUnit(["in", "cm", "ft", "mm", "m"].includes(initialData.shippingDimensionUnit) ? initialData.shippingDimensionUnit : "in");

    setIsActive(initialData.isActive !== false && initialData.active !== false);
    setFreeShipping(Boolean(initialData.freeShipping));
    setTrackInventory(initialData.trackInventory !== false);
    setAllowReturns(initialData.allowReturns !== false);
    setAllowPreorder(Boolean(initialData.allowPreorder));

    const currentLocations = Array.isArray(initialData.displayLocations) ? initialData.displayLocations.map(String) : ["marketplace"];
    setLocations(currentLocations.length ? currentLocations : ["marketplace"]);
    setFeedDays(Math.max(1, Number(initialData.feedDays) || 3));
    setStoryDays(Math.max(1, Number(initialData.storyDays) || 1));

    const images = Array.isArray(initialData.images) ? initialData.images.map(imageUrl).filter(Boolean) : [];
    setExistingImages(images);
    setPreviews(images);

    const attributes = initialData.attributes ?? {};
    setMaterial(String(attributes.material ?? initialData.material ?? ""));
    setFit(String(attributes.fit ?? ""));
    setProductType(String(attributes.productType ?? ""));
    setDimensions(String(attributes.dimensions ?? ""));
    setCapacity(String(attributes.capacity ?? ""));
    setWeight(String(attributes.weight ?? ""));
    setBeltLength(String(attributes.beltLength ?? ""));
    setBeltWidth(String(attributes.beltWidth ?? ""));
    setHeadCircumference(String(attributes.headCircumference ?? ""));
    setBuckleColor(String(attributes.buckleColor ?? ""));
    setWidthFit(String(attributes.widthFit ?? ""));
    if (attributes.sizeSystem) setSizeSystem(String(attributes.sizeSystem));

    if (Array.isArray(initialData.variants) && initialData.variants.length) {
      setEnableVariants(true);
      setVariants(initialData.variants.map((v: any) => ({
        id: String(v.id ?? v._id ?? makeId()),
        color: String(v.color ?? ""),
        size: String(v.size ?? ""),
        sku: String(v.sku ?? ""),
        price: Number(v.price ?? initialData.price) || 0,
        stock: Math.max(0, Number(v.stock) || 0),
        imageUrl: String(v.imageUrl ?? v.image ?? ""),
      })));
      const colors = Array.from(new Set(initialData.variants.map((v: any) => String(v.color ?? "").trim()).filter(Boolean)));
      const sizes = Array.from(new Set(initialData.variants.map((v: any) => String(v.size ?? "").trim()).filter(Boolean)));
      setHasColors(colors.length > 0);
      setHasSizes(sizes.length > 0);
      setColorInput(colors.join(", "));
      setSizeInput(sizes.join(", "));
    }
  }, [initialData, mode]);

  // Restore a locally saved draft when creating a product.
  useEffect(() => {
    if (mode !== "create") return;
    let raw: string | null = null;
    try { raw = localStorage.getItem(DRAFT_KEY); } catch { raw = null; }
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      if (d.form) setForm({ ...EMPTY_FORM, ...d.form });
      if (typeof d.discount === "number") setDiscount(d.discount);
      if (["OWN_BRAND", "THIRD_PARTY_BRAND", "UNBRANDED"].includes(d.brandOwnership)) setBrandOwnership(d.brandOwnership);
      if (["SELF_MANUFACTURED", "SUPPLIER", "DROPSHIPPING"].includes(d.productSource)) setProductSource(d.productSource);
      setSupplierName(String(d.supplierName ?? ""));
      setSourcingDetails(String(d.sourcingDetails ?? ""));
      setFulfillmentDetails(String(d.fulfillmentDetails ?? ""));
      if (d.shipping) {
        setShippingWeight(String(d.shipping.weight ?? ""));
        setShippingWeightUnit(d.shipping.weightUnit ?? "lb");
        setShippingLength(String(d.shipping.length ?? ""));
        setShippingWidth(String(d.shipping.width ?? ""));
        setShippingHeight(String(d.shipping.height ?? ""));
        setShippingDimensionUnit(d.shipping.dimensionUnit ?? "in");
      }
      if (d.selling) {
        setIsActive(d.selling.isActive !== false);
        setFreeShipping(Boolean(d.selling.freeShipping));
        setTrackInventory(d.selling.trackInventory !== false);
        setAllowReturns(d.selling.allowReturns !== false);
        setAllowPreorder(Boolean(d.selling.allowPreorder));
      }
      if (Array.isArray(d.locations)) setLocations(d.locations);
      if (d.feedDays) setFeedDays(d.feedDays);
      if (d.storyDays) setStoryDays(d.storyDays);
      if (d.attributes) {
        setProductType(d.attributes.productType ?? "");
        setMaterial(d.attributes.material ?? "");
        setFit(d.attributes.fit ?? "");
        setDimensions(d.attributes.dimensions ?? "");
        setCapacity(d.attributes.capacity ?? "");
        setWeight(d.attributes.weight ?? "");
        setBeltLength(d.attributes.beltLength ?? "");
        setBeltWidth(d.attributes.beltWidth ?? "");
        setHeadCircumference(d.attributes.headCircumference ?? "");
        setBuckleColor(d.attributes.buckleColor ?? "");
        setWidthFit(d.attributes.widthFit ?? "");
        setSizeSystem(d.attributes.sizeSystem ?? "US");
      }
      if (d.variantsState) {
        setEnableVariants(Boolean(d.variantsState.enabled));
        setHasColors(d.variantsState.hasColors !== false);
        setHasSizes(d.variantsState.hasSizes !== false);
        setColorInput(d.variantsState.colorInput ?? "");
        setSizeInput(d.variantsState.sizeInput ?? "");
        if (Array.isArray(d.variantsState.variants)) setVariants(d.variantsState.variants);
      }
      setNotice(`Draft restored from ${d.savedAt ? new Date(d.savedAt).toLocaleString() : "an earlier session"}. Images aren't saved in drafts.`);
    } catch {
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    }
  }, [mode]);

  useEffect(() => () => {
    previews.forEach((preview) => { if (preview.startsWith("blob:")) URL.revokeObjectURL(preview); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Generate variant combinations from the color and size lists.
  useEffect(() => {
    if (!enableVariants) return;
    const colors = hasColors ? splitOptions(colorInput) : [""];
    const sizes = hasSizes ? splitOptions(sizeInput) : [""];
    if (!colors.length || !sizes.length) {
      setVariants([]);
      return;
    }
    setVariants((current) => {
      const existing = new Map(current.map((variant) => [`${variant.color.toLowerCase()}::${variant.size.toLowerCase()}`, variant]));
      return colors.flatMap((color) => sizes.map((size) => {
        const key = `${color.toLowerCase()}::${size.toLowerCase()}`;
        return existing.get(key) ?? {
          id: makeId(),
          color,
          size,
          sku: [form.name, color, size].filter(Boolean).join("-").replace(/\s+/g, "-").toUpperCase().slice(0, 64),
          price: form.price,
          stock: 0,
          imageUrl: "",
        };
      }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableVariants, hasColors, hasSizes, colorInput, sizeInput]);

  // Highlight the step whose section is currently in view.
  // Capture-phase listener also catches scrolling inside a layout container.
  useEffect(() => {
    const onScroll = () => {
      const threshold = window.innerHeight * 0.35;
      let current: StepId = "details";
      for (const step of STEPS) {
        const el = sectionRefs.current[step.id];
        if (el && el.getBoundingClientRect().top <= threshold) current = step.id;
      }
      setActiveStep(current);
    };
    onScroll();
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Close the preview dialog with Escape.
  useEffect(() => {
    if (!previewOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setPreviewOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewOpen]);

  /* Handlers ------------------------------------------------------- */

  function updateForm<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleLocation(value: string) {
    setLocations((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  function goToStep(id: StepId) {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const setSectionRef = useCallback((id: StepId) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  }, []);

  function showError(message: string) {
    setPageError(message);
    requestAnimationFrame(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  function readImageSize(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`${file.name}: the image could not be opened. Try a JPG, PNG or WebP photo.`)); };
      img.src = url;
    });
  }

  function addPreparedFile(file: File, original: File) {
    setSelectedFiles((current) => [...current, file]);
    setOriginalFiles((current) => [...current, original]);
    setPreviews((current) => [...current, URL.createObjectURL(file)]);
  }

  function openFilePicker() {
    if (saving || cropQueue.length > 0 || previews.length >= MAX_IMAGES) return;
    fileInputRef.current?.click();
  }

  async function handleImagesChange(event: React.ChangeEvent<HTMLInputElement>) {
    setPageError("");
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    const availableSlots = MAX_IMAGES - existingImages.length - selectedFiles.length;
    if (files.length > availableSlots) {
      showError(`You can add up to ${MAX_IMAGES} product images in total.`);
      return;
    }
    const errors: string[] = [];
    const needsAdjusting: CropJob[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) { errors.push(`${file.name}: choose an image file.`); continue; }
      if (file.size > MAX_SOURCE_IMAGE_BYTES) { errors.push(`${file.name}: photos must be 25 MB or smaller.`); continue; }
      try {
        const size = await readImageSize(file);
        const ready = size.width === REQUIRED_IMAGE_WIDTH && size.height === REQUIRED_IMAGE_HEIGHT && file.size <= MAX_IMAGE_BYTES;
        if (ready) addPreparedFile(file, file);
        else needsAdjusting.push({ file });
      } catch (error) { errors.push(getErrorMessage(error, `${file.name}: the image could not be opened.`)); }
    }
    if (errors.length) showError(errors.join(" "));
    if (needsAdjusting.length) {
      setCropQueue((current) => [...current, ...needsAdjusting]);
      setCropBatchTotal((current) => current + needsAdjusting.length);
    }
  }

  function finishCropJob() {
    setCropQueue((current) => {
      const next = current.slice(1);
      if (!next.length) setCropBatchTotal(0);
      return next;
    });
  }

  function handleCropDone(result: File) {
    const job = cropQueue[0];
    if (!job) return;
    if (job.replaceIndex === undefined) addPreparedFile(result, job.file);
    else {
      const fileIndex = job.replaceIndex;
      const previewIndex = existingImages.length + fileIndex;
      const old = previews[previewIndex];
      if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
      setSelectedFiles((current) => current.map((item, index) => index === fileIndex ? result : item));
      setPreviews((current) => current.map((item, index) => index === previewIndex ? URL.createObjectURL(result) : item));
    }
    finishCropJob();
  }

  function adjustImage(index: number) {
    const fileIndex = index - existingImages.length;
    const original = originalFiles[fileIndex];
    if (fileIndex < 0 || !original) return;
    setCropQueue((current) => [...current, { file: original, replaceIndex: fileIndex }]);
    setCropBatchTotal((current) => current + 1);
  }

  function removeImage(index: number) {
    const existingCount = existingImages.length;
    if (index < existingCount) {
      setExistingImages((current) => current.filter((_, i) => i !== index));
      setPreviews((current) => current.filter((_, i) => i !== index));
      return;
    }
    const fileIndex = index - existingCount;
    const preview = previews[index];
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setSelectedFiles((current) => current.filter((_, i) => i !== fileIndex));
    setOriginalFiles((current) => current.filter((_, i) => i !== fileIndex));
    setPreviews((current) => current.filter((_, i) => i !== index));
  }

  async function uploadImage(file: File): Promise<string> {
    const data = new FormData();
    data.append("file", file);
    const uploaded: any = await sellerApi.uploadImage(data);
    let path = typeof uploaded === "string" ? uploaded : uploaded?.url || uploaded?.path || uploaded?.file || "";
    path = String(path).trim();
    if (!path || path.includes("undefined")) throw new Error(`The server did not return a valid URL for ${file.name}.`);
    if (!path.startsWith("/") && !/^https?:\/\//i.test(path)) path = `/uploads/${path}`;
    return path;
  }

  async function submitCategorySuggestion() {
    const name = categorySuggestion.trim();
    if (!name) {
      setCategorySuggestionStatus("error");
      setCategorySuggestionError("Enter a category name first.");
      return;
    }
    const api = sellerApi as any;
    if (typeof api.suggestCategory !== "function") {
      setCategorySuggestionStatus("error");
      setCategorySuggestionError("Category suggestions are not connected to the backend yet.");
      return;
    }
    try {
      setCategorySuggestionStatus("submitting");
      setCategorySuggestionError("");
      await api.suggestCategory(name);
      setCategorySuggestionStatus("success");
      setCategorySuggestion("");
    } catch (error) {
      setCategorySuggestionStatus("error");
      setCategorySuggestionError(getErrorMessage(error, "Couldn't submit your suggestion. Try again."));
    }
  }

  function handleCategoryChange(category: string) {
    updateForm("category", category);
    const sizes = sizesForText(`${category} ${form.name} ${productType}`.toLowerCase());
    if (sizes) setSizeInput(sizes.join(", "));
  }

  function handleSizeSystemChange(system: string) {
    setSizeSystem(system);
    setSizeInput((system === "EU" ? SHOE_SIZES_EU : system === "UK" ? SHOE_SIZES_UK : SHOE_SIZES_US).join(", "));
  }

  function updateVariant(id: string, field: keyof Variant, value: string | number) {
    setVariants((current) => current.map((variant) => variant.id === id ? { ...variant, [field]: value } : variant));
  }

  function saveDraft() {
    const draft = {
      savedAt: new Date().toISOString(),
      form,
      discount,
      brandOwnership, productSource, supplierName, sourcingDetails, fulfillmentDetails,
      shipping: {
        weight: shippingWeight, weightUnit: shippingWeightUnit,
        length: shippingLength, width: shippingWidth, height: shippingHeight,
        dimensionUnit: shippingDimensionUnit,
      },
      selling: { isActive, freeShipping, trackInventory, allowReturns, allowPreorder },
      locations, feedDays, storyDays,
      attributes: {
        productType, material, fit, dimensions, capacity, weight,
        beltLength, beltWidth, headCircumference, buckleColor, widthFit, sizeSystem,
      },
      variantsState: { enabled: enableVariants, hasColors, hasSizes, colorInput, sizeInput, variants },
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setNotice(`Draft saved on this device at ${new Date().toLocaleTimeString()}. Images aren't saved in drafts.`);
    } catch {
      showError("Couldn't save the draft. Your browser storage may be full or disabled.");
    }
  }

  function discardDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setNotice("");
  }

  function validate(): string {
    if (!selectedStore) return "Please select a store.";
    if (!form.name.trim()) return "Product name is required.";
    if (form.name.trim().length > 160) return "Product name must be 160 characters or fewer.";
    if (!form.category) return "Please select a category.";
    if (!brandOwnership) return "Please select Brand Ownership.";
    if (brandOwnership === "OWN_BRAND" && !form.brand.trim()) return "Enter your brand name for My Own Brand.";
    if (brandOwnership === "THIRD_PARTY_BRAND" && !form.brand.trim()) return "Enter the product's brand for Another Company's Brand.";
    if (!productSource) return "Please select Product Source.";
    if (productSource === "DROPSHIPPING" && !supplierName.trim()) return "Enter the supplier name for dropshipping.";
    if (!categories.some((item) => item.name === form.category) && form.category !== initialData?.category) return "Please select a valid category.";
    if (!Number.isFinite(form.price) || form.price <= 0) return "Price must be greater than 0.";
    if (!Number.isInteger(form.stock) || form.stock < 0) return "Stock must be a whole number of 0 or greater.";
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) return "Discount must be between 0 and 100.";
    if (!isPositive(shippingWeight)) return "Enter a shipping package weight greater than 0.";
    if (!isPositive(shippingLength) || !isPositive(shippingWidth) || !isPositive(shippingHeight)) {
      return "Enter positive shipping package length, width, and height.";
    }
    if (!locations.length) return "Select at least one product placement.";
    if (locations.includes("feed") && (!Number.isInteger(feedDays) || feedDays < 1)) return "Feed promotion duration must be at least 1 day.";
    if (locations.includes("story") && (!Number.isInteger(storyDays) || storyDays < 1)) return "Story duration must be at least 1 day.";
    if (imageCount === 0) return "Upload at least one product image.";
    if (imageCount > MAX_IMAGES) return `You can use up to ${MAX_IMAGES} images.`;
    if (enableVariants && variants.length === 0) return "Add at least one valid size/color combination or turn variations off.";
    if (enableVariants && variants.some((v) => !Number.isFinite(v.price) || v.price <= 0 || !Number.isInteger(v.stock) || v.stock < 0)) {
      return "Every variation needs a price greater than 0 and a whole-number stock quantity of 0 or more.";
    }
    return "";
  }

  async function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    setPageError("");
    const validation = validate();
    if (validation) { showError(validation); return; }
    if (mode === "edit" && !productId) {
      showError("Product ID is missing. Open the product from your product list and try again.");
      return;
    }
    setSaving(true);
    try {
      const uploadedImages: string[] = [];
      for (const file of selectedFiles) uploadedImages.push(await uploadImage(file));
      const retainedImages = Array.isArray(initialData?.images) ? initialData.images.map((item: unknown) => String(item ?? "")).filter(Boolean) : [];
      const kept = retainedImages.filter((path: string) => existingImages.some((preview) => imageUrl(path) === preview));
      const images = [...kept, ...uploadedImages];
      const attributes = {
        productType: productType.trim(),
        material: material.trim(),
        fit: fit.trim(),
        sizeSystem: productKind === "shoes" ? sizeSystem : undefined,
        dimensions: dimensions.trim(),
        capacity: capacity.trim(),
        weight: weight.trim(),
        beltLength: beltLength.trim(),
        beltWidth: beltWidth.trim(),
        headCircumference: headCircumference.trim(),
        buckleColor: buckleColor.trim(),
        widthFit: widthFit.trim(),
      };
      const payload: any = {
        storeId: selectedStore,
        name: form.name.trim(),
        brand: brandOwnership === "UNBRANDED" ? "" : form.brand.trim(),
        brandOwnership,
        productSource,
        supplierName: supplierName.trim() || undefined,
        sourcingDetails: sourcingDetails.trim() || undefined,
        fulfillmentDetails: fulfillmentDetails.trim() || undefined,
        location: form.location.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        stock: enableVariants ? variantStock : Number(form.stock),
        category: form.category,
        discount: Number(discount),
        shippingWeight: Number(shippingWeight),
        shippingWeightUnit,
        shippingLength: Number(shippingLength),
        shippingWidth: Number(shippingWidth),
        shippingHeight: Number(shippingHeight),
        shippingDimensionUnit,
        isActive,
        freeShipping,
        trackInventory,
        allowReturns,
        allowPreorder,
        images,
        displayLocations: locations,
        currency,
        attributes,
        hasVariants: enableVariants,
        variants: enableVariants ? variants.map(({ id, ...variant }) => ({
          ...variant,
          color: variant.color || undefined,
          size: variant.size || undefined,
          price: Number(variant.price),
          stock: Number(variant.stock),
          imageUrl: variant.imageUrl || undefined,
        })) : [],
      };
      if (locations.includes("feed")) payload.feedDays = feedDays;
      if (locations.includes("story")) payload.storyDays = storyDays;
      if (mode === "edit") await sellerApi.updateProduct(productId as string, payload);
      else await sellerApi.createProduct(payload);
      if (mode === "create") discardDraft();
      window.alert(mode === "edit" ? "Product updated successfully." : "Product created successfully.");
      navigate("/seller/products");
    } catch (error: any) {
      console.error("PRODUCT SAVE ERROR:", error);
      showError(getErrorMessage(error, mode === "edit" ? "Failed to update product." : "Failed to create product."));
    } finally {
      setSaving(false);
    }
  }

  /* Render helpers ------------------------------------------------- */

  const thumbSlots = Array.from({ length: 4 }, (_, i) => previews[i + 1]);

  function renderListing(large = false) {
    return (
      <div className={`pe-listing${large ? " is-large" : ""}`}>
        {previews[0] ? (
          <img className="pe-listing-image" src={previews[0]} alt="Primary product" />
        ) : large ? (
          <div className="pe-listing-image pe-listing-empty">No image yet</div>
        ) : (
          <button type="button" className="pe-dropzone" onClick={openFilePicker} disabled={saving || cropQueue.length > 0}>
            <span className="pe-dropzone-icon">{Icons.imagePlus}</span>
            <strong>Add a product image</strong>
            <small>Your primary product image will appear here.</small>
          </button>
        )}

        {!large && (
          <div className="pe-thumbs">
            {thumbSlots.map((src, i) => src ? (
              <img key={`${src}-${i}`} className="pe-thumb" src={src} alt={`Product image ${i + 2}`} />
            ) : (
              <button key={`slot-${i}`} type="button" className="pe-thumb pe-thumb-add" onClick={openFilePicker}
                disabled={saving || cropQueue.length > 0 || previews.length >= MAX_IMAGES} aria-label="Add product image">
                {Icons.plus}
              </button>
            ))}
          </div>
        )}

        {large && previews.length > 1 && (
          <div className="pe-thumbs">
            {previews.slice(1).map((src, i) => <img key={`${src}-${i}`} className="pe-thumb" src={src} alt={`Product image ${i + 2}`} />)}
          </div>
        )}

        <span className="pe-chip">{form.category || "Product category"}</span>
        <h3 className="pe-listing-name">{form.name.trim() || "Your product name"}</h3>
        {form.brand.trim() && <p className="pe-listing-brand">by {form.brand.trim()}</p>}
        <div className="pe-listing-price">
          <strong>{formatMoney(salePrice, currency)}</strong>
          {discount > 0 && form.price > 0 && <del>{formatMoney(form.price, currency)}</del>}
          {discount > 0 && form.price > 0 && <span className="pe-badge-sale">-{discount}%</span>}
        </div>
        <p className={`pe-listing-stock${inStock ? " is-in" : " is-out"}`}><span />{stockLabel}</p>
        {enableVariants && (currentColors.length > 0 || currentSizes.length > 0) && (
          <p className="pe-listing-options">
            {hasColors && currentColors.length > 0 && <>Colors: {currentColors.join(", ")}</>}
            {hasColors && hasSizes && currentColors.length > 0 && currentSizes.length > 0 && " · "}
            {hasSizes && currentSizes.length > 0 && <>Sizes: {currentSizes.join(", ")}</>}
          </p>
        )}
        <p className="pe-listing-description">{form.description.trim() || "Your product description will appear here."}</p>
        <div className="pe-listing-tags">
          {locations.map((item) => <span key={item} className="pe-tag">{item[0].toUpperCase() + item.slice(1)}</span>)}
          {freeShipping && <span className="pe-tag is-green">Free shipping</span>}
          {allowReturns && large && <span className="pe-tag">Returns accepted</span>}
          {!isActive && <span className="pe-tag is-gray">Inactive</span>}
        </div>
        {form.location.trim() && large && <p className="pe-help">Ships from {form.location.trim()}</p>}
      </div>
    );
  }

  /* Render --------------------------------------------------------- */

  return (
    <div className="pe-page">
      <header className="pe-header">
        <h1>{mode === "edit" ? "Edit product" : "Create product"}</h1>
        <p>{mode === "edit"
          ? "Update your product details, variations, inventory, and marketplace placement."
          : "Add a product with category-specific details, sizes, colors, and stock for every variation."}</p>
      </header>

      <nav className="pe-stepper" aria-label="Form sections">
        {STEPS.map((step, index) => {
          const isActiveStep = activeStep === step.id;
          const done = stepDone[step.id] && !isActiveStep;
          return (
            <React.Fragment key={step.id}>
              {index > 0 && <span className="pe-step-line" aria-hidden="true" />}
              <button
                type="button"
                className={`pe-step${isActiveStep ? " is-active" : ""}${done ? " is-done" : ""}`}
                onClick={() => goToStep(step.id)}
                aria-current={isActiveStep ? "step" : undefined}
              >
                <span className="pe-step-num">{done ? Icons.check : index + 1}</span>
                <span className="pe-step-label">{step.label}</span>
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {pageError && <div ref={errorRef} className="pe-alert" role="alert">{pageError}</div>}
      {notice && (
        <div className="pe-notice" role="status">
          <span>{notice}</span>
          <button type="button" onClick={discardDraft}>Discard draft</button>
        </div>
      )}

      <form id={formId} className="pe-layout" onSubmit={handleSubmit} noValidate>
        <div className="pe-main">

          {/* 1 · Product details */}
          <section ref={setSectionRef("details")} className="pe-card" id="step-details">
            <CardHeader icon={Icons.doc} title="Product details" />

            <div className="pe-grid-2">
              <div className="pe-field">
                <label htmlFor="product-store">Store <span className="pe-req">*</span></label>
                <select id="product-store" value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)} required>
                  <option value="">Choose a store</option>
                  {stores.map((store) => <option key={normalizeId(store)} value={normalizeId(store)}>{store.name || "Unnamed store"}</option>)}
                </select>
                {stores.length === 0 && <p className="pe-help">No stores were found. Create a store before adding products.</p>}
                {activeStore && <p className="pe-help">Store location: {String(activeStore.country || activeStore.countryCode || "Not specified")} · Product prices shown in {currency}.</p>}
              </div>

              <div className="pe-field">
                <label htmlFor="product-category">Category <span className="pe-req">*</span></label>
                <select id="product-category" value={form.category} onChange={(e) => handleCategoryChange(e.target.value)} disabled={categoriesLoading} required>
                  <option value="">{categoriesLoading ? "Loading categories…" : categories.length ? "Select a category" : "No categories available"}</option>
                  {categories.map((category) => <option key={String(category._id || category.slug || category.name)} value={category.name}>{category.name}</option>)}
                  {mode === "edit" && form.category && !categories.some((item) => item.name === form.category) && <option value={form.category}>{form.category} (current)</option>}
                </select>
                {!categorySuggestionOpen ? (
                  <button type="button" className="pe-link" onClick={() => { setCategorySuggestionOpen(true); setCategorySuggestionStatus("idle"); setCategorySuggestionError(""); }}>
                    Can't find your category? Suggest one
                  </button>
                ) : (
                  <div className="pe-suggest">
                    <label htmlFor="category-suggestion">Suggest a category</label>
                    <div className="pe-suggest-row">
                      <input id="category-suggestion" value={categorySuggestion} onChange={(e) => setCategorySuggestion(e.target.value)} placeholder="e.g. Belts or Hats" disabled={categorySuggestionStatus === "submitting"} />
                      <button type="button" className="pe-btn pe-btn-primary pe-btn-sm" disabled={categorySuggestionStatus === "submitting"} onClick={submitCategorySuggestion}>
                        {categorySuggestionStatus === "submitting" ? "Submitting…" : "Submit"}
                      </button>
                      <button type="button" className="pe-btn pe-btn-ghost pe-btn-sm" onClick={() => { setCategorySuggestionOpen(false); setCategorySuggestion(""); setCategorySuggestionStatus("idle"); setCategorySuggestionError(""); }}>
                        Cancel
                      </button>
                    </div>
                    {categorySuggestionError && <p className="pe-help is-error">{categorySuggestionError}</p>}
                    {categorySuggestionStatus === "success" && <p className="pe-help is-success">Thanks — your suggestion was submitted for review.</p>}
                  </div>
                )}
              </div>
            </div>

            <div className="pe-field">
              <label htmlFor="product-name">Product name <span className="pe-req">*</span></label>
              <input id="product-name" type="text" maxLength={160} placeholder="e.g. Classic Cotton T-Shirt" value={form.name} onChange={(e) => updateForm("name", e.target.value)} required />
              <p className="pe-counter">{form.name.length}/160 characters</p>
            </div>

            <div className="pe-grid-2">
              <div className="pe-field">
                <label htmlFor="brand-ownership">Brand Ownership <span className="pe-req">*</span></label>
                <select id="brand-ownership" value={brandOwnership} onChange={(e) => {
                  const value = e.target.value as typeof brandOwnership;
                  setBrandOwnership(value);
                  if (value === "UNBRANDED") updateForm("brand", "");
                }} required>
                  <option value="">Select brand ownership</option>
                  <option value="OWN_BRAND">My Own Brand</option>
                  <option value="THIRD_PARTY_BRAND">Another Company's Brand</option>
                  <option value="UNBRANDED">Unbranded</option>
                </select>
                <p className="pe-help">Choose who owns the brand represented by this product. Reselling a product does not make its brand your own.</p>
              </div>
              <div className="pe-field">
                <label htmlFor="product-brand">{brandOwnership === "OWN_BRAND" ? "Your brand name" : brandOwnership === "THIRD_PARTY_BRAND" ? "Product brand" : "Brand"}{brandOwnership !== "UNBRANDED" && <span className="pe-req"> *</span>}</label>
                <input id="product-brand" type="text" maxLength={100}
                  placeholder={brandOwnership === "OWN_BRAND" ? "Enter your brand name" : brandOwnership === "THIRD_PARTY_BRAND" ? "e.g. HP, Nike, Samsung" : "No brand required"}
                  value={form.brand} onChange={(e) => updateForm("brand", e.target.value)}
                  required={brandOwnership === "OWN_BRAND" || brandOwnership === "THIRD_PARTY_BRAND"} disabled={brandOwnership === "UNBRANDED"} />
              </div>
            </div>

            <div className="pe-grid-2">
              <div className="pe-field">
                <label htmlFor="product-source">Product Source <span className="pe-req">*</span></label>
                <select id="product-source" value={productSource} onChange={(e) => setProductSource(e.target.value as typeof productSource)} required>
                  <option value="">Select product source</option>
                  <option value="SELF_MANUFACTURED">Manufactured by Me</option>
                  <option value="SUPPLIER">Purchased from a Supplier</option>
                  <option value="DROPSHIPPING">Dropshipping</option>
                </select>
                <p className="pe-help">Tell customers and Fockis how you obtain or fulfill this product.</p>
              </div>
              <div className="pe-field">
                <label htmlFor="product-location">Ships from / location</label>
                <input id="product-location" type="text" maxLength={120} placeholder="City, state or region" value={form.location} onChange={(e) => updateForm("location", e.target.value)} />
              </div>
            </div>

            {(productSource === "SUPPLIER" || productSource === "DROPSHIPPING") && (
              <div className="pe-grid-2">
                <div className="pe-field">
                  <label htmlFor="supplier-name">{productSource === "DROPSHIPPING" ? "Dropshipping supplier name" : "Supplier name (optional)"}{productSource === "DROPSHIPPING" && <span className="pe-req"> *</span>}</label>
                  <input id="supplier-name" type="text" maxLength={160} value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Supplier or distributor name" required={productSource === "DROPSHIPPING"} />
                </div>
                <div className="pe-field">
                  <label htmlFor="sourcing-details">Sourcing details (optional)</label>
                  <input id="sourcing-details" type="text" maxLength={500} value={sourcingDetails} onChange={(e) => setSourcingDetails(e.target.value)} placeholder="e.g. wholesale distributor, authorized supplier" />
                </div>
              </div>
            )}
            {productSource === "DROPSHIPPING" && (
              <div className="pe-field">
                <label htmlFor="fulfillment-details">Fulfillment details</label>
                <textarea id="fulfillment-details" rows={2} maxLength={1000} value={fulfillmentDetails} onChange={(e) => setFulfillmentDetails(e.target.value)} placeholder="Explain who ships the item and expected handling time." />
              </div>
            )}

            <div className="pe-field">
              <label htmlFor="product-type">Product type / style</label>
              <input id="product-type" value={productType} onChange={(e) => setProductType(e.target.value)} placeholder="e.g. T-shirt, running shoe, baseball cap, leather belt" />
            </div>

            <div className="pe-field">
              <label htmlFor="product-description">Description</label>
              <textarea id="product-description" rows={4} maxLength={5000} placeholder="Describe features, materials, sizing, care instructions, and what customers should know…" value={form.description} onChange={(e) => updateForm("description", e.target.value)} />
              <p className="pe-counter">{form.description.length}/5000 characters</p>
            </div>
          </section>

          <section className="pe-card">
            <CardHeader icon={Icons.cube} title="Category-specific details"
              hint="These optional details change depending on the product category. You can also fill in any field that applies to your item." />

            {productKind === "shoes" && (
              <div className="pe-grid-2">
                <div className="pe-field">
                  <label htmlFor="shoe-size-system">Shoe size system</label>
                  <select id="shoe-size-system" value={sizeSystem} onChange={(e) => handleSizeSystemChange(e.target.value)}>
                    <option value="US">US</option><option value="UK">UK</option><option value="EU">EU</option>
                  </select>
                </div>
                <div className="pe-field">
                  <label htmlFor="shoe-width">Shoe width / fit</label>
                  <input id="shoe-width" value={widthFit} onChange={(e) => setWidthFit(e.target.value)} placeholder="e.g. Standard, Wide, Extra Wide" />
                </div>
              </div>
            )}
            {productKind === "hats" && (
              <div className="pe-field">
                <label htmlFor="head-circumference">Head circumference</label>
                <input id="head-circumference" value={headCircumference} onChange={(e) => setHeadCircumference(e.target.value)} placeholder="e.g. 56–58 cm" />
              </div>
            )}
            {productKind === "belts" && (
              <div className="pe-grid-3">
                <div className="pe-field">
                  <label htmlFor="belt-length">Belt length / waist range</label>
                  <input id="belt-length" value={beltLength} onChange={(e) => setBeltLength(e.target.value)} placeholder="e.g. 32–36 inches" />
                </div>
                <div className="pe-field">
                  <label htmlFor="belt-width">Belt width</label>
                  <input id="belt-width" value={beltWidth} onChange={(e) => setBeltWidth(e.target.value)} placeholder="e.g. 1.5 in / 38 mm" />
                </div>
                <div className="pe-field">
                  <label htmlFor="buckle-color">Buckle color</label>
                  <input id="buckle-color" value={buckleColor} onChange={(e) => setBuckleColor(e.target.value)} placeholder="e.g. Silver, gold" />
                </div>
              </div>
            )}

            <div className="pe-grid-2">
              <div className="pe-field">
                <label htmlFor="material">Material</label>
                <input id="material" value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="e.g. Cotton, leather, wool, polyester" />
              </div>
              <div className="pe-field">
                <label htmlFor="fit">Fit / style details</label>
                <input id="fit" value={fit} onChange={(e) => setFit(e.target.value)} placeholder="e.g. Slim fit, relaxed fit, adjustable, fitted" />
              </div>
              <div className="pe-field">
                <label htmlFor="dimensions">Dimensions</label>
                <input id="dimensions" value={dimensions} onChange={(e) => setDimensions(e.target.value)} placeholder="e.g. 12 × 8 × 3 inches" />
              </div>
              <div className="pe-field">
                <label htmlFor="capacity">Capacity (if applicable)</label>
                <input id="capacity" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="e.g. 20L" />
              </div>
              <div className="pe-field">
                <label htmlFor="weight">Item weight</label>
                <input id="weight" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 450 g / 1 lb" />
              </div>
            </div>
          </section>

          {/* 2 · Variants & inventory */}
          <section ref={setSectionRef("variants")} className="pe-card" id="step-variants">
            <CardHeader
              icon={Icons.layers}
              title="Variants & inventory"
              hint="Each size/color combination can have its own SKU, price, and stock."
              aside={<Switch checked={enableVariants} onChange={setEnableVariants} label="This product has variations" />}
            />

            {!enableVariants ? (
              <p className="pe-help">Turn on variations if this product comes in different sizes or colors. Price and stock for a single-option product are set in <strong>Price and inventory</strong>.</p>
            ) : (
              <>
                <div className="pe-grid-2">
                  <div className="pe-option-box">
                    <label className="pe-check">
                      <input type="checkbox" checked={hasColors} onChange={(e) => setHasColors(e.target.checked)} /> Product has colors
                    </label>
                    {hasColors && (
                      <div className="pe-field">
                        <label htmlFor="variant-colors">Colors (comma-separated)</label>
                        <input id="variant-colors" value={colorInput} onChange={(e) => setColorInput(e.target.value)} placeholder="Black, White, Blue, Red" />
                      </div>
                    )}
                  </div>
                  <div className="pe-option-box">
                    <label className="pe-check">
                      <input type="checkbox" checked={hasSizes} onChange={(e) => setHasSizes(e.target.checked)} /> Product has sizes
                    </label>
                    {hasSizes && (
                      <div className="pe-field">
                        <label htmlFor="variant-sizes">Sizes (comma-separated)</label>
                        <input id="variant-sizes" value={sizeInput} onChange={(e) => setSizeInput(e.target.value)} placeholder={recommendedSizes.join(", ")} />
                        <div className="pe-pills">
                          {recommendedSizes.map((size) => (
                            <button type="button" key={size} className={`pe-pill${currentSizes.includes(size) ? " is-on" : ""}`}
                              onClick={() => setSizeInput((current) => {
                                const list = splitOptions(current);
                                return (list.includes(size) ? list.filter((s) => s !== size) : [...list, size]).join(", ");
                              })}>
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <p className="pe-help">{variants.length} combination{variants.length === 1 ? "" : "s"} · {variantStock} total units</p>

                <div className="pe-table-wrap">
                  <table className="pe-table">
                    <thead>
                      <tr>
                        {["Color", "Size", "SKU", `Price (${currency})`, "Stock", "Status"].map((h) => <th key={h}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((variant) => (
                        <tr key={variant.id}>
                          <td>{variant.color || "Any"}</td>
                          <td>{variant.size || "One size"}</td>
                          <td><input aria-label={`SKU for ${variant.color} ${variant.size}`} value={variant.sku} onChange={(e) => updateVariant(variant.id, "sku", e.target.value)} /></td>
                          <td><input aria-label={`Price for ${variant.color} ${variant.size}`} type="number" min="0.01" step="0.01" value={variant.price} onChange={(e) => updateVariant(variant.id, "price", e.target.value === "" ? 0 : Number(e.target.value))} /></td>
                          <td><input aria-label={`Stock for ${variant.color} ${variant.size}`} type="number" min="0" step="1" value={variant.stock} onChange={(e) => updateVariant(variant.id, "stock", e.target.value === "" ? 0 : Number(e.target.value))} /></td>
                          <td><span className={`pe-status${variant.stock > 0 ? " is-in" : " is-out"}`}>{variant.stock > 0 ? "In stock" : "Out of stock"}</span></td>
                        </tr>
                      ))}
                      {variants.length === 0 && <tr><td colSpan={6} className="pe-empty-row">Enter at least one color or size to create variations.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          {/* 3 · Shipping */}
          <section ref={setSectionRef("shipping")} className="pe-card" id="step-shipping">
            <CardHeader icon={Icons.truck} title="Shipping package"
              hint="Enter the packed parcel measurements, including the packaging. These values are used to request live shipping rates." />

            <div className="pe-grid-2">
              <div className="pe-field">
                <label htmlFor="shipping-weight">Package weight <span className="pe-req">*</span></label>
                <input id="shipping-weight" type="number" min="0.000001" step="any" value={shippingWeight} onChange={(e) => setShippingWeight(e.target.value)} placeholder="e.g. 0.5" required />
              </div>
              <div className="pe-field">
                <label htmlFor="shipping-weight-unit">Weight unit</label>
                <select id="shipping-weight-unit" value={shippingWeightUnit} onChange={(e) => setShippingWeightUnit(e.target.value as WeightUnit)}>
                  <option value="lb">Pounds (lb)</option>
                  <option value="oz">Ounces (oz)</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="g">Grams (g)</option>
                </select>
              </div>
            </div>

            <div className="pe-grid-3">
              <div className="pe-field">
                <label htmlFor="shipping-length">Package length <span className="pe-req">*</span></label>
                <input id="shipping-length" type="number" min="0.000001" step="any" value={shippingLength} onChange={(e) => setShippingLength(e.target.value)} placeholder="Length" required />
              </div>
              <div className="pe-field">
                <label htmlFor="shipping-width">Package width <span className="pe-req">*</span></label>
                <input id="shipping-width" type="number" min="0.000001" step="any" value={shippingWidth} onChange={(e) => setShippingWidth(e.target.value)} placeholder="Width" required />
              </div>
              <div className="pe-field">
                <label htmlFor="shipping-height">Package height <span className="pe-req">*</span></label>
                <input id="shipping-height" type="number" min="0.000001" step="any" value={shippingHeight} onChange={(e) => setShippingHeight(e.target.value)} placeholder="Height" required />
              </div>
            </div>

            <div className="pe-inline-field">
              <div className="pe-field">
                <label htmlFor="shipping-dimension-unit">Dimension unit</label>
                <select id="shipping-dimension-unit" value={shippingDimensionUnit} onChange={(e) => setShippingDimensionUnit(e.target.value as DimensionUnit)}>
                  <option value="in">Inches (in)</option>
                  <option value="cm">Centimeters (cm)</option>
                  <option value="ft">Feet (ft)</option>
                  <option value="mm">Millimeters (mm)</option>
                  <option value="m">Meters (m)</option>
                </select>
              </div>
              <p className="pe-help">Use the actual packed parcel measurements, not the product's general description dimensions. These fields are required for shipping-rate calculation.</p>
            </div>
          </section>

          {/* 4 · Media */}
          <section ref={setSectionRef("media")} className="pe-card" id="step-media">
            <CardHeader icon={Icons.image} title="Media"
              hint={`Up to ${MAX_IMAGES} photos. Photos that aren't 600 × 600 open an editor to crop or fit them. The first image is the primary image.`} />

            <input ref={fileInputRef} id="product-images" className="pe-visually-hidden" type="file" accept="image/*" multiple onChange={handleImagesChange}
              disabled={previews.length >= MAX_IMAGES || saving || cropQueue.length > 0} />

            <div className="pe-media-grid">
              {previews.map((src, index) => (
                <figure className="pe-media-item" key={`${src}-${index}`}>
                  <img src={src} alt={`Product image ${index + 1}`} />
                  {index === 0 && <span className="pe-media-primary">Primary</span>}
                  <div className="pe-media-actions">
                    {index >= existingImages.length && originalFiles[index - existingImages.length] && (
                      <button type="button" onClick={() => adjustImage(index)} disabled={saving} aria-label={`Adjust image ${index + 1}`}>Adjust</button>
                    )}
                    <button type="button" onClick={() => removeImage(index)} disabled={saving} aria-label={`Remove image ${index + 1}`}>Remove</button>
                  </div>
                </figure>
              ))}
              {previews.length < MAX_IMAGES && (
                <button type="button" className="pe-media-add" onClick={openFilePicker} disabled={saving || cropQueue.length > 0}>
                  {Icons.plus}
                  <span>Add images</span>
                </button>
              )}
            </div>
            <p className="pe-help">{previews.length} of {MAX_IMAGES} images selected.</p>
          </section>

          {/* 5 · Review */}
          <section ref={setSectionRef("review")} className="pe-card" id="step-review">
            <CardHeader icon={Icons.flag} title="Placement & review" hint="Choose where else the product appears, then check that everything required is filled in." />

            <div className="pe-placements">
              {[
                { value: "feed", title: "Feed", description: "Promote the product in the Fockis feed." },
                { value: "story", title: "Story", description: "Show the product in story placement." },
              ].map((option) => (
                <div key={option.value} className={`pe-placement${locations.includes(option.value) ? " is-on" : ""}`}>
                  <label className="pe-check">
                    <input type="checkbox" checked={locations.includes(option.value)} onChange={() => toggleLocation(option.value)} />
                    <span><strong>{option.title}</strong><small>{option.description}</small></span>
                  </label>
                  {option.value === "feed" && locations.includes("feed") && (
                    <div className="pe-field">
                      <label htmlFor="feed-days">Duration (days)</label>
                      <input id="feed-days" type="number" min="1" step="1" value={feedDays} onChange={(e) => setFeedDays(e.target.value === "" ? 1 : Number(e.target.value))} />
                    </div>
                  )}
                  {option.value === "story" && locations.includes("story") && (
                    <div className="pe-field">
                      <label htmlFor="story-days">Duration (days)</label>
                      <input id="story-days" type="number" min="1" step="1" value={storyDays} onChange={(e) => setStoryDays(e.target.value === "" ? 1 : Number(e.target.value))} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="pe-help">Marketplace listing is controlled by <strong>Show in marketplace</strong> under Visibility &amp; selling.</p>

            <ul className="pe-checklist">
              {checklist.map((item) => (
                <li key={item.label} className={item.done ? "is-done" : ""}>
                  <span className="pe-checklist-mark">{item.done ? Icons.check : null}</span>
                  {item.label}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Right column */}
        <aside className="pe-side">
          <section className="pe-card">
            <CardHeader icon={Icons.eye} title="Customer preview" />
            {renderListing()}
          </section>

          <section className="pe-card">
            <CardHeader icon={Icons.tag} title="Visibility & selling" />
            <div className="pe-toggles">
              <ToggleRow title="Product active" description="Make this product available for purchase" checked={isActive} onChange={setIsActive} />
              <ToggleRow title="Show in marketplace" description="Display in Fockis marketplace" checked={showInMarketplace} onChange={() => toggleLocation("marketplace")} />
              <ToggleRow title="Free shipping" description="Offer free shipping for this product" checked={freeShipping} onChange={setFreeShipping} />
              <ToggleRow title="Track inventory" description="Track stock quantity" checked={trackInventory} onChange={setTrackInventory} />
              <ToggleRow title="Allow returns" description="Let customers return this product" checked={allowReturns} onChange={setAllowReturns} />
              <ToggleRow title="Pre-order" description="Allow pre-orders when out of stock" checked={allowPreorder} onChange={setAllowPreorder} />
            </div>
          </section>

          <section className="pe-card">
            <CardHeader icon={Icons.coins} title="Price and inventory" />
            <div className="pe-grid-price">
              <div className="pe-field">
                <label htmlFor="product-price">Base price ({currency}) <span className="pe-req">*</span></label>
                <input id="product-price" type="number" min="0.01" step="0.01" placeholder="0.00" value={form.price || ""} onChange={(e) => updateForm("price", e.target.value === "" ? 0 : Number(e.target.value))} required />
              </div>
              <div className="pe-field">
                <label htmlFor="product-stock">{enableVariants ? "Total stock" : "Available stock"} <span className="pe-req">*</span></label>
                <input id="product-stock" type="number" min="0" step="1" placeholder="0" value={enableVariants ? variantStock : form.stock || ""}
                  onChange={(e) => updateForm("stock", e.target.value === "" ? 0 : Number(e.target.value))} disabled={enableVariants || !trackInventory} required />
              </div>
              <div className="pe-field">
                <label htmlFor="product-discount">Discount (%)</label>
                <input id="product-discount" type="number" min="0" max="100" step="1" placeholder="0" value={discount || ""} onChange={(e) => setDiscount(e.target.value === "" ? 0 : Number(e.target.value))} />
              </div>
            </div>
            {enableVariants && <p className="pe-help">Stock is the sum of all variations.</p>}
            {!trackInventory && <p className="pe-help">Inventory tracking is off, so stock isn't enforced.</p>}
            {trackInventory && totalStock === 0 && !enableVariants && <p className="pe-help is-warn">This product has zero available stock.</p>}
            {discount > 0 && form.price > 0 && (
              <div className="pe-discount">
                <span>Sale price <strong>{formatMoney(salePrice, currency)}</strong></span>
                <span>Customers save {formatMoney(savings, currency)} ({discount}%)</span>
              </div>
            )}
          </section>
        </aside>
      </form>

      {/* Fixed action bar */}
      <div className="pe-actionbar">
        <div className="pe-actionbar-inner">
          <button type="button" className="pe-btn pe-btn-outline" onClick={saveDraft} disabled={saving}>
            {Icons.save}<span>Save draft</span>
          </button>
          <div className="pe-actionbar-right">
            <button type="button" className="pe-btn pe-btn-ghost" onClick={() => navigate("/seller/products")} disabled={saving}>Cancel</button>
            <button type="button" className="pe-btn pe-btn-outline-primary" onClick={() => setPreviewOpen(true)}>
              {Icons.eye}<span>Preview listing</span>
            </button>
            <button type="submit" form={formId} className="pe-btn pe-btn-primary" disabled={saving || categoriesLoading || stores.length === 0}>
              {Icons.send}<span>{saving ? "Saving…" : mode === "edit" ? "Save changes" : "Publish product"}</span>
            </button>
          </div>
        </div>
      </div>

      {previewOpen && (
        <div className="pe-modal-backdrop" onClick={() => setPreviewOpen(false)}>
          <div className="pe-modal" role="dialog" aria-modal="true" aria-label="Listing preview" onClick={(e) => e.stopPropagation()}>
            <div className="pe-modal-header">
              <h2>Listing preview</h2>
              <button type="button" className="pe-icon-btn" onClick={() => setPreviewOpen(false)} aria-label="Close preview">{Icons.close}</button>
            </div>
            {renderListing(true)}
            <p className="pe-help">Approximate preview. The live marketplace card may show more store and seller information.</p>
          </div>
        </div>
      )}

      {cropQueue[0] && (
        <ProductImageCropper
          key={`${cropQueue[0].file.name}-${cropQueue[0].file.lastModified}-${cropBatchTotal - cropQueue.length}`}
          file={cropQueue[0].file}
          position={{ current: cropBatchTotal - cropQueue.length + 1, total: cropBatchTotal }}
          onDone={handleCropDone}
          onSkip={finishCropJob}
          skipLabel={cropQueue[0].replaceIndex === undefined ? "Skip this photo" : "Cancel"}
        />
      )}
    </div>
  );
}
