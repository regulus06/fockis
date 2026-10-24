







import { useCallback, useEffect, useState } from "react";







import { useLocation, useNavigate } from "react-router-dom";







import { sellerApi } from "../services/sellerApi";







import "../styles/SellerSettingsPage.scss";















type IconProps = { size?: number };















type StoreSettingsForm = {







  storeName: string;







  description: string;







  businessEmail: string;







  phone: string;







  address: string;







  city: string;







  state: string;







  zipCode: string;







  country: string;







  countryCode: string;







  logo: string;







};















const EMPTY_FORM: StoreSettingsForm = {







  storeName: "",







  description: "",







  businessEmail: "",







  phone: "",







  address: "",







  city: "",







  state: "",







  zipCode: "",







  country: "United States",







  countryCode: "US",







  logo: "",







};















const IconHome = ({ size = 16 }: IconProps) => (







  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">







    <path d="M3 11.5 12 4l9 7.5" />







    <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />







  </svg>







);















const IconBox = ({ size = 16 }: IconProps) => (







  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">







    <path d="M21 8 12 3 3 8v8l9 5 9-5Z" />







    <path d="M3 8l9 5 9-5M12 13v8" />







  </svg>







);















const IconBag = ({ size = 16 }: IconProps) => (







  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">







    <path d="M6 8h12l-1 12H7L6 8Z" />







    <path d="M9 8V6a3 3 0 0 1 6 0v2" />







  </svg>







);















const IconTruck = ({ size = 16 }: IconProps) => (







  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">







    <path d="M2 8h11v9H2zM13 11h5l3 3v3h-8z" />







    <circle cx="6.5" cy="18" r="1.6" />







    <circle cx="16.5" cy="18" r="1.6" />







  </svg>







);















const IconChart = ({ size = 16 }: IconProps) => (







  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">







    <path d="M4 20V10M12 20V4M20 20v-7" />







  </svg>







);















const IconGear = ({ size = 16 }: IconProps) => (







  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">







    <circle cx="12" cy="12" r="3" />







    <path d="M19.4 13a7.9 7.9 0 0 0 0-2l2-1.5-2-3.4-2.3.9a7.7 7.7 0 0 0-1.8-1L15 3H9l-.3 2a7.7 7.7 0 0 0-1.8 1l-2.3-.9-2 3.4L4.6 11a7.9 7.9 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9c.55.43 1.16.77 1.8 1L9 21h6l.3-2c.64-.23 1.25-.57 1.8-1l2.3.9 2-3.4Z" />







  </svg>







);















const IconStore = ({ size = 20 }: IconProps) => (







  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">







    <path d="M3 9 4.5 4h15L21 9" />







    <path d="M3 9v11h18V9M3 9a3 3 0 0 0 6 0m0 0a3 3 0 0 0 6 0m0 0a3 3 0 0 0 6 0" />







  </svg>







);















const IconSearch = ({ size = 16 }: IconProps) => (







  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">







    <circle cx="11" cy="11" r="7" />







    <path d="m21 21-4.3-4.3" />







  </svg>







);















const IconUser = ({ size = 18 }: IconProps) => (







  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">







    <circle cx="12" cy="8" r="3.5" />







    <path d="M4.5 20c1.7-3.4 5-5 7.5-5s5.8 1.6 7.5 5" />







  </svg>







);















const IconMail = ({ size = 15 }: IconProps) => (







  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">







    <rect x="3" y="5" width="18" height="14" rx="2" />







    <path d="m3 7 9 6 9-6" />







  </svg>







);















const IconPhone = ({ size = 15 }: IconProps) => (







  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">







    <path d="M4 4h4l2 5-2.5 1.5a12 12 0 0 0 6 6L15 14l5 2v4a2 2 0 0 1-2 2C9.7 22 2 14.3 2 6a2 2 0 0 1 2-2Z" />







  </svg>







);















const IconPin = ({ size = 15 }: IconProps) => (







  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">







    <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />







    <circle cx="12" cy="9.5" r="2.5" />







  </svg>







);















const IconImage = ({ size = 15 }: IconProps) => (







  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">







    <rect x="3" y="4" width="18" height="16" rx="2" />







    <circle cx="9" cy="10" r="1.8" />







    <path d="m21 16-5.5-5.5L4 21" />







  </svg>







);















const NAV_ITEMS = [







  { label: "Dashboard", path: "/seller", icon: IconHome },







  { label: "Products", path: "/seller/products", icon: IconBox },







  { label: "Orders", path: "/seller/orders", icon: IconBag },







  { label: "Shipping", path: "/seller/shipping", icon: IconTruck },







  { label: "Analytics", path: "/seller/analytics", icon: IconChart },







  { label: "Settings", path: "/seller/settings", icon: IconGear },







];















function pickString(







  source: Record<string, unknown>,







  ...keys: string[]







): string {







  for (const key of keys) {







    const value = source[key];







    if (typeof value === "string" && value.trim()) {







      return value;







    }







  }







  return "";







}















export default function SellerSettingsPage() {







  const navigate = useNavigate();







  const location = useLocation();















  const [form, setForm] = useState<StoreSettingsForm>(EMPTY_FORM);







  const [saving, setSaving] = useState(false);







  const [loading, setLoading] = useState(true);







  const [loadError, setLoadError] = useState("");















  const loadStore = useCallback(async () => {



    setLoading(true);



    setLoadError("");







    try {



      // Load the actual Store document used by the shipping service.



      const response = await sellerApi.getMyStore();



      const store = Array.isArray(response)



        ? response.find((item: any) => item?._id)



        : response?.store ?? response;







      if (!store || typeof store !== "object" || !store._id) {



        throw new Error("No active store was returned by /stores/me.");



      }







      localStorage.setItem("activeStoreId", String(store._id));







      setForm({



        storeName: pickString(store, "name", "storeName", "businessName"),



        description: pickString(store, "description", "bio"),



        businessEmail: pickString(store, "email", "businessEmail"),



        phone: pickString(store, "phone", "businessPhone"),



        address: pickString(store, "address", "street", "streetAddress", "businessAddress"),



        city: pickString(store, "city"),



        state: pickString(store, "state", "province", "stateProvince"),



        zipCode: pickString(store, "zipCode", "postalCode", "zip"),



        country: pickString(store, "country") || "United States",



        countryCode: (pickString(store, "countryCode") || "US").toUpperCase(),



        logo: pickString(store, "logo", "logoUrl"),



      });



    } catch (error) {



      console.error("Store settings load failed", error);



      setLoadError(



        "We couldn't load your store settings. Refresh the page and try again.",



      );



    } finally {



      setLoading(false);



    }



  }, []);







  useEffect(() => {







    void loadStore();







  }, [loadStore]);















  function change<K extends keyof StoreSettingsForm>(







    field: K,







    value: StoreSettingsForm[K],







  ) {







    setForm((current) => ({ ...current, [field]: value }));







  }















  async function save() {



    const storeId = localStorage.getItem("activeStoreId");







    if (!storeId || storeId === "undefined" || storeId === "null") {



      window.alert("No active store found. Please select your store first.");



      return;



    }







    const required: Array<[keyof StoreSettingsForm, string]> = [



      ["storeName", "Store name"],



      ["businessEmail", "Business email"],



      ["address", "Street address"],



      ["city", "City"],



      ["state", "State"],



      ["zipCode", "ZIP/postal code"],



      ["country", "Country"],



      ["countryCode", "Country code"],



    ];







    const missing = required.find(([key]) => !form[key].trim());



    if (missing) {



      window.alert(`${missing[1]} is required for shipping labels.`);



      return;



    }







    const countryCode = form.countryCode.trim().toUpperCase();

    const businessEmail = form.businessEmail.trim().toLowerCase();



    if (!/^[A-Z]{2}$/.test(countryCode)) {



      window.alert("Country code must be two letters, for example US.");



      return;



    }







    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail)) {



      window.alert("Enter a valid business email address.");



      return;



    }







    setSaving(true);



    try {



      // Update the Store document that ShippingService reads, not /seller/profile.



      await sellerApi.updateStore(storeId, {



        name: form.storeName.trim(),



        description: form.description.trim(),






        phone: form.phone.trim(),



        address: form.address.trim(),



        city: form.city.trim(),



        state: form.state.trim(),



        zipCode: form.zipCode.trim(),



        country: form.country.trim(),



        countryCode,



        email: businessEmail,

        logo: form.logo.trim(),



      });







      await loadStore();



      window.alert("Store settings saved successfully.");



    } catch (error) {



      console.error("Store settings save failed", error);



      window.alert(



        error instanceof Error



          ? `Could not save store settings: ${error.message}`



          : "Could not save store settings. Please try again.",



      );



    } finally {



      setSaving(false);



    }



  }







  function go(path: string) {







    navigate(path);







  }















  return (







    <div className="seller-settings-page">







      <div className="console-header">







        <button







          type="button"







          className="console-logo"







          onClick={() => go("/seller")}







          aria-label="Go to Seller Center"







        >







          <IconStore />







          <span>Seller Center</span>







        </button>















        <div className="console-search">







          <input







            aria-label="Search Seller Center"







            placeholder="Search products, orders, reports"







          />







          <button type="button" aria-label="Search">







            <IconSearch />







          </button>







        </div>















        <div className="console-account">







          <IconUser />







          <div className="console-account-text">







            <span className="console-account-label">Hello, Seller</span>







            <span className="console-account-sub">Account</span>







          </div>







        </div>







      </div>















      <nav className="console-tabbar" aria-label="Seller navigation">







        {NAV_ITEMS.map(({ label, path, icon: Icon }) => (







          <button







            type="button"







            key={path}







            className={location.pathname === path ? "is-active" : ""}







            onClick={() => go(path)}







          >







            <Icon size={16} />







            <span>{label}</span>







          </button>







        ))}







      </nav>















      <nav







        className="seller-mobile-bottom-nav"







        aria-label="Seller mobile navigation"







      >







        {NAV_ITEMS.slice(0, 5).map(({ label, path, icon: Icon }) => (







          <button







            type="button"







            key={path}







            className={location.pathname === path ? "active" : ""}







            onClick={() => go(path)}







          >







            <Icon size={20} />







            <span>{label}</span>







          </button>







        ))}







      </nav>















      <main className="settings-body">







        <div className="settings-page-head">







          <span className="eyebrow">Store setup</span>







          <h1>Store settings</h1>







          <p>







            Manage your store profile and the sender address used to create







            shipping labels.







          </p>







        </div>















        {loadError && (







          <div className="settings-error" role="alert">







            {loadError}{" "}







            <button type="button" onClick={() => void loadStore()}>







              Try again







            </button>







          </div>







        )}















        {loading ? (







          <div className="settings-card" aria-live="polite">







            Loading store settings…







          </div>







        ) : (







          <div className="settings-card">







            <section className="form-section" aria-labelledby="store-info-heading">







              <h2 id="store-info-heading">Store information</h2>















              <div className="input-group">







                <label htmlFor="storeName">Store name *</label>







                <input







                  id="storeName"







                  autoComplete="organization"







                  value={form.storeName}







                  placeholder="Enter store name"







                  onChange={(e) => change("storeName", e.target.value)}







                />







              </div>















              <div className="input-group">







                <label htmlFor="storeDescription">Description</label>







                <textarea







                  id="storeDescription"







                  value={form.description}







                  placeholder="Tell customers about your store"







                  onChange={(e) => change("description", e.target.value)}







                />







              </div>















              <div className="input-row">







                <div className="input-group">







                  <label htmlFor="businessEmail">







                    <IconMail /> Business email *







                  </label>







                  <input







                    id="businessEmail"







                    type="email"







                    autoComplete="email"







                    value={form.businessEmail}







                    placeholder="shipping@example.com"







                    onChange={(e) =>







                      change("businessEmail", e.target.value)







                    }







                  />







                </div>















                <div className="input-group">







                  <label htmlFor="storePhone">







                    <IconPhone /> Phone







                  </label>







                  <input







                    id="storePhone"







                    type="tel"







                    autoComplete="tel"







                    value={form.phone}







                    placeholder="Business phone"







                    onChange={(e) => change("phone", e.target.value)}







                  />







                </div>







              </div>















              <section className="form-section shipping-address-section">







                <h2>Shipping sender address</h2>







                <p>







                  Use the address where you ship packages from. Shippo uses







                  this as the sender address on shipping labels.







                </p>















                <div className="input-group">







                  <label htmlFor="storeAddress">







                    <IconPin /> Street address *







                  </label>







                  <input







                    id="storeAddress"







                    autoComplete="street-address"







                    value={form.address}







                    placeholder="Street address"







                    onChange={(e) => change("address", e.target.value)}







                  />







                </div>















                <div className="input-row">







                  <div className="input-group">







                    <label htmlFor="storeCity">City *</label>







                    <input







                      id="storeCity"







                      autoComplete="address-level2"







                      value={form.city}







                      placeholder="City"







                      onChange={(e) => change("city", e.target.value)}







                    />







                  </div>















                  <div className="input-group">







                    <label htmlFor="storeState">State / Province *</label>







                    <input







                      id="storeState"







                      autoComplete="address-level1"







                      value={form.state}







                      placeholder="State or province"







                      onChange={(e) => change("state", e.target.value)}







                    />







                  </div>







                </div>















                <div className="input-row">







                  <div className="input-group">







                    <label htmlFor="storeZip">ZIP / Postal code *</label>







                    <input







                      id="storeZip"







                      autoComplete="postal-code"







                      value={form.zipCode}







                      placeholder="ZIP or postal code"







                      onChange={(e) => change("zipCode", e.target.value)}







                    />







                  </div>















                  <div className="input-group">







                    <label htmlFor="storeCountry">Country *</label>







                    <input







                      id="storeCountry"







                      autoComplete="country-name"







                      value={form.country}







                      placeholder="United States"







                      onChange={(e) => change("country", e.target.value)}







                    />







                  </div>







                </div>















                <div className="input-group">







                  <label htmlFor="storeCountryCode">







                    Two-letter country code *







                  </label>







                  <input







                    id="storeCountryCode"







                    autoComplete="country"







                    maxLength={2}







                    value={form.countryCode}







                    placeholder="US"







                    onChange={(e) =>







                      change(







                        "countryCode",







                        e.target.value.toUpperCase().replace(/[^A-Z]/g, ""),







                      )







                    }







                  />







                  <small>







                    Examples: US for United States, CA for Canada, GB for







                    United Kingdom.







                  </small>







                </div>







              </section>















              <div className="input-group">







                <label htmlFor="storeLogo">







                  <IconImage /> Logo URL







                </label>







                <input







                  id="storeLogo"







                  type="url"







                  value={form.logo}







                  placeholder="https\\\\://…"







                  onChange={(e) => change("logo", e.target.value)}







                />







              </div>















              <button







                type="button"







                className="btn btn-primary"







                disabled={saving}







                onClick={() => void save()}







              >







                {saving ? "Saving…" : "Save store profile"}







              </button>







            </section>















            <aside className="store-preview" aria-label="Store preview">







              <h2>Live preview</h2>















              <div className="preview-card">







                <div className="preview-banner" />















                <div className="preview-logo-wrap">







                  {form.logo ? (







                    <img







                      src={form.logo}







                      alt="Store logo"







                      onError={(e) => {







                        e.currentTarget.style.display = "none";







                      }}







                    />







                  ) : (







                    <div className="preview-logo-fallback">







                      <IconStore size={22} />







                    </div>







                  )}







                </div>















                <h3>{form.storeName || "Your store name"}</h3>







                <p>{form.description || "Your store description"}</p>















                <div className="preview-meta">







                  <div>







                    <IconMail /> {form.businessEmail || "email@example.com"}







                  </div>







                  <div>







                    <IconPhone /> {form.phone || "Phone number"}







                  </div>







                  <div>







                    <IconPin />{" "}







                    {[







                      form.address,







                      form.city,







                      form.state,







                      form.zipCode,







                      form.countryCode,







                    ]







                      .filter(Boolean)







                      .join(", ") || "Shipping sender address"}







                  </div>







                </div>







              </div>







            </aside>







          </div>







        )}







      </main>







    </div>







  );







}
