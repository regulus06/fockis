import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import { sellerApi } from "../services/sellerApi";
import { useActiveStore } from "../store/activeStore";

import "../styles/SellerCreateStorePage.scss";

interface CountryOption {
  name: string;
  code: string;
  currency: string;
}

interface StoreForm {
  name: string;
  domainName: string;
  description: string;
  businessEmail: string;
  phone: string;
  country: string;
  countryCode: string;
  city: string;
  state: string;
  zipCode: string;
  address: string;
  currency: string;
  profilePhoto: string;
  coverPhoto: string;
}

interface ImageUploadProps {
  title: string;
  description: string;
  imageSource: string;
  placeholderType: "profile" | "cover";
  onRemove: () => void;
  onChange: (
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  inputId: string;
  disabled?: boolean;
}

const COUNTRY_OPTIONS: CountryOption[] = [
  {
    name: "United States",
    code: "US",
    currency: "USD",
  },
  {
    name: "Canada",
    code: "CA",
    currency: "CAD",
  },
  {
    name: "Haiti",
    code: "HT",
    currency: "HTG",
  },
  {
    name: "Dominican Republic",
    code: "DO",
    currency: "DOP",
  },
  {
    name: "Mexico",
    code: "MX",
    currency: "MXN",
  },
  {
    name: "Brazil",
    code: "BR",
    currency: "BRL",
  },
  {
    name: "United Kingdom",
    code: "GB",
    currency: "GBP",
  },
  {
    name: "France",
    code: "FR",
    currency: "EUR",
  },
  {
    name: "Germany",
    code: "DE",
    currency: "EUR",
  },
  {
    name: "Spain",
    code: "ES",
    currency: "EUR",
  },
  {
    name: "Italy",
    code: "IT",
    currency: "EUR",
  },
  {
    name: "Switzerland",
    code: "CH",
    currency: "CHF",
  },
  {
    name: "Australia",
    code: "AU",
    currency: "AUD",
  },
  {
    name: "New Zealand",
    code: "NZ",
    currency: "NZD",
  },
  {
    name: "Japan",
    code: "JP",
    currency: "JPY",
  },
  {
    name: "China",
    code: "CN",
    currency: "CNY",
  },
  {
    name: "India",
    code: "IN",
    currency: "INR",
  },
  {
    name: "South Korea",
    code: "KR",
    currency: "KRW",
  },
  {
    name: "Nigeria",
    code: "NG",
    currency: "NGN",
  },
  {
    name: "Kenya",
    code: "KE",
    currency: "KES",
  },
  {
    name: "South Africa",
    code: "ZA",
    currency: "ZAR",
  },
  {
    name: "United Arab Emirates",
    code: "AE",
    currency: "AED",
  },
  {
    name: "Saudi Arabia",
    code: "SA",
    currency: "SAR",
  },
  {
    name: "Turkey",
    code: "TR",
    currency: "TRY",
  },
  {
    name: "Poland",
    code: "PL",
    currency: "PLN",
  },
  {
    name: "Sweden",
    code: "SE",
    currency: "SEK",
  },
  {
    name: "Norway",
    code: "NO",
    currency: "NOK",
  },
  {
    name: "Denmark",
    code: "DK",
    currency: "DKK",
  },
];

const CURRENCY_OPTIONS = [
  "USD",
  "CAD",
  "EUR",
  "GBP",
  "CHF",
  "AUD",
  "NZD",
  "JPY",
  "CNY",
  "HKD",
  "SGD",
  "INR",
  "KRW",
  "BRL",
  "MXN",
  "ARS",
  "CLP",
  "COP",
  "DOP",
  "HTG",
  "XOF",
  "ZAR",
  "NGN",
  "KES",
  "AED",
  "SAR",
  "TRY",
  "PLN",
  "SEK",
  "NOK",
  "DKK",
];

function ImageUpload({
  title,
  description,
  imageSource,
  placeholderType,
  onRemove,
  onChange,
  inputId,
  disabled = false,
}: ImageUploadProps) {
  const inputRef =
    useRef<HTMLInputElement>(null);

  function openFilePicker() {
    if (disabled) {
      return;
    }

    inputRef.current?.click();
  }

  return (
    <div
      className={`seller-image-upload seller-image-upload--${placeholderType}`}
    >
      <div className="seller-image-upload__header">
        <h3>{title}</h3>

        <p>{description}</p>
      </div>

      <div className="seller-image-upload__preview">
        {imageSource ? (
          <>
            <img
              src={imageSource}
              alt={title}
              className="seller-image-upload__image"
            />

            <button
              type="button"
              className="seller-image-upload__remove"
              onClick={onRemove}
              disabled={disabled}
            >
              Remove
            </button>
          </>
        ) : placeholderType === "profile" ? (
          <div className="seller-image-upload__placeholder">
            <div className="seller-image-upload__profile-icon">
              F
            </div>
          </div>
        ) : (
          <div className="seller-image-upload__placeholder">
            <div className="seller-image-upload__cover-icon">
              <span>＋</span>

              <small>
                Add a cover photo
              </small>
            </div>
          </div>
        )}
      </div>

      <div className="seller-image-upload__controls">
        <button
          type="button"
          className="seller-image-upload__button"
          onClick={openFilePicker}
          disabled={disabled}
        >
          {imageSource
            ? "Change Photo"
            : "Upload Photo"}
        </button>

        <span className="seller-image-upload__hint">
          JPG, PNG, WEBP or GIF · Max 10 MB
        </span>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={onChange}
        disabled={disabled}
        className="seller-image-upload__input"
      />
    </div>
  );
}

async function uploadStoreImage(
  file: File,
): Promise<string> {
  const formData = new FormData();

  formData.append("file", file);

  const uploaded =
    await sellerApi.uploadImage(
      formData,
    );

  if (!uploaded?.url) {
    throw new Error(
      "The image upload did not return a valid URL.",
    );
  }

  return uploaded.url;
}

function normalizeDomain(
  value: string,
): string {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\.fockis\.com$/i, "")
    .replace(/\.fockis$/i, "")
    .split("/")[0]
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function isValidDomainName(
  value: string,
): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(
    value,
  );
}

function isValidCountryCode(
  value: string,
): boolean {
  return /^[A-Z]{2}$/.test(
    value.trim().toUpperCase(),
  );
}

export default function SellerCreateStorePage() {
  const navigate = useNavigate();

  const { setActiveStore } =
    useActiveStore();

  const [
    customCountry,
    setCustomCountry,
  ] = useState(false);

  const [form, setForm] =
    useState<StoreForm>({
      name: "",
      domainName: "",
      description: "",
      businessEmail: "",
      phone: "",
      country: "",
      countryCode: "",
      city: "",
      state: "",
      zipCode: "",
      address: "",
      currency: "USD",
      profilePhoto: "",
      coverPhoto: "",
    });

  const [
    profilePreview,
    setProfilePreview,
  ] = useState("");

  const [
    coverPreview,
    setCoverPreview,
  ] = useState("");

  const [
    profileFile,
    setProfileFile,
  ] = useState<File | null>(null);

  const [
    coverFile,
    setCoverFile,
  ] = useState<File | null>(null);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const isHaiti =
    form.countryCode
      .trim()
      .toUpperCase() === "HT";

  /*
   * Clean up temporary browser preview URLs.
   */

  useEffect(() => {
    return () => {
      if (profilePreview) {
        URL.revokeObjectURL(
          profilePreview,
        );
      }

      if (coverPreview) {
        URL.revokeObjectURL(
          coverPreview,
        );
      }
    };
  }, [
    profilePreview,
    coverPreview,
  ]);

  function updateField(
    field: keyof StoreForm,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleDomainChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const value =
      normalizeDomain(
        event.target.value,
      );

    updateField(
      "domainName",
      value,
    );

    if (error) {
      setError("");
    }
  }

  function handleCountryChange(
    event: ChangeEvent<HTMLSelectElement>,
  ) {
    const value =
      event.target.value;

    if (value === "__custom__") {
      setCustomCountry(true);

      setForm((current) => ({
        ...current,
        country: "",
        countryCode: "",
        currency: "USD",
        zipCode: "",
      }));

      return;
    }

    const selected =
      COUNTRY_OPTIONS.find(
        (country) =>
          country.code === value,
      );

    if (!selected) {
      return;
    }

    setCustomCountry(false);

    setForm((current) => ({
      ...current,
      country: selected.name,
      countryCode: selected.code,
      currency: selected.currency,
      zipCode:
        selected.code === "HT"
          ? current.zipCode
          : current.zipCode,
    }));

    if (error) {
      setError("");
    }
  }

  function handleCustomCountryNameChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    updateField(
      "country",
      event.target.value,
    );
  }

  function handleCustomCountryCodeChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const value =
      event.target.value
        .toUpperCase()
        .replace(/[^A-Z]/g, "")
        .slice(0, 2);

    updateField(
      "countryCode",
      value,
    );

    if (value === "HT") {
      if (error) {
        setError("");
      }
    }
  }

  function validateImage(
    file: File,
  ): string | null {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (
      !allowedTypes.includes(
        file.type,
      )
    ) {
      return "Please select a JPG, PNG, WEBP, or GIF image.";
    }

    if (
      file.size >
      10 * 1024 * 1024
    ) {
      return "Each image must be 10 MB or smaller.";
    }

    return null;
  }

  function handleProfileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const validationError =
      validateImage(file);

    if (validationError) {
      setError(validationError);
      event.target.value = "";
      return;
    }

    setError("");

    if (profilePreview) {
      URL.revokeObjectURL(
        profilePreview,
      );
    }

    const previewUrl =
      URL.createObjectURL(file);

    setProfileFile(file);
    setProfilePreview(
      previewUrl,
    );

    setForm((current) => ({
      ...current,
      profilePhoto: "",
    }));

    event.target.value = "";
  }

  function handleCoverChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const validationError =
      validateImage(file);

    if (validationError) {
      setError(validationError);
      event.target.value = "";
      return;
    }

    setError("");

    if (coverPreview) {
      URL.revokeObjectURL(
        coverPreview,
      );
    }

    const previewUrl =
      URL.createObjectURL(file);

    setCoverFile(file);
    setCoverPreview(
      previewUrl,
    );

    setForm((current) => ({
      ...current,
      coverPhoto: "",
    }));

    event.target.value = "";
  }

  function removeProfilePhoto() {
    if (profilePreview) {
      URL.revokeObjectURL(
        profilePreview,
      );
    }

    setProfilePreview("");
    setProfileFile(null);

    setForm((current) => ({
      ...current,
      profilePhoto: "",
    }));
  }

  function removeCoverPhoto() {
    if (coverPreview) {
      URL.revokeObjectURL(
        coverPreview,
      );
    }

    setCoverPreview("");
    setCoverFile(null);

    setForm((current) => ({
      ...current,
      coverPhoto: "",
    }));
  }

  function resetCustomCountry() {
    setCustomCountry(false);

    setForm((current) => ({
      ...current,
      country: "",
      countryCode: "",
      currency: "USD",
      zipCode: "",
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    const storeName =
      form.name.trim();

    const domainName =
      normalizeDomain(
        form.domainName,
      );

    const country =
      form.country.trim();

    const countryCode =
      form.countryCode
        .trim()
        .toUpperCase();

    const city =
      form.city.trim();

    const address =
      form.address.trim();

    const zipCode =
      form.zipCode.trim();

    if (!storeName) {
      setError(
        "Please enter a store name.",
      );
      return;
    }

    if (!domainName) {
      setError(
        "Please choose a Fockis domain name.",
      );
      return;
    }

    if (
      !isValidDomainName(
        domainName,
      )
    ) {
      setError(
        "Your Fockis domain must contain only lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen.",
      );
      return;
    }

    if (!country) {
      setError(
        "Please select your country.",
      );
      return;
    }

    if (
      !isValidCountryCode(
        countryCode,
      )
    ) {
      setError(
        "Please enter a valid two-letter country code.",
      );
      return;
    }

    if (!city) {
      setError(
        "Please enter your city.",
      );
      return;
    }

    if (!address) {
      setError(
        "Please enter your business address.",
      );
      return;
    }

    /*
     * Haiti is the only country where ZIP/postal code
     * may be left empty.
     */

    if (
      countryCode !== "HT" &&
      !zipCode
    ) {
      setError(
        "ZIP/postal code is required for your selected country.",
      );
      return;
    }

    if (!form.currency) {
      setError(
        "Please select your store currency.",
      );
      return;
    }

    try {
      setSaving(true);

      let profilePhoto =
        form.profilePhoto.trim();

      let coverPhoto =
        form.coverPhoto.trim();

      if (profileFile) {
        profilePhoto =
          await uploadStoreImage(
            profileFile,
          );
      }

      if (coverFile) {
        coverPhoto =
          await uploadStoreImage(
            coverFile,
          );
      }

      /*
       * Backend receives the domain prefix.
       *
       * Example:
       *
       * yourstore
       *
       * becomes:
       *
       * yourstore.fockis.com
       *
       * Backend also generates the permanent
       * Store Fockis ID.
       */

      const store =
        await sellerApi.createStore({
          name: storeName,

          domainName,

          description:
            form.description.trim(),

          email:
            form.businessEmail.trim(),

          phone:
            form.phone.trim(),

          country,

          countryCode,

          city,

          state:
            form.state.trim(),

          zipCode,

          address,

          currency:
            form.currency,

          logo:
            profilePhoto,

          banner:
            coverPhoto,
        });

      if (!store?._id) {
        throw new Error(
          "The store was created, but no store ID was returned.",
        );
      }

      if (!store?.fockisStoreId) {
        throw new Error(
          "The store was created, but Fockis did not return the Store Fockis ID.",
        );
      }

      setActiveStore(store);

      localStorage.setItem(
        "activeStoreId",
        String(store._id),
      );

      localStorage.setItem(
        "activeStore",
        JSON.stringify(store),
      );

      navigate("/seller", {
        replace: true,
      });
    } catch (err: any) {
      console.error(
        "Create store failed:",
        err,
      );

      const message =
        err?.response?.data
          ?.message ||
        err?.message ||
        "Unable to create your store. Please try again.";

      setError(
        Array.isArray(message)
          ? message.join(", ")
          : String(message),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="seller-create-store-page">
      <div className="seller-create-store-card">
        <div className="seller-create-store-header">
          <span className="seller-create-store-eyebrow">
            Fockis Seller Center
          </span>

          <h1>
            Create your store
          </h1>

          <p>
            Create your Fockis store
            identity and set up your
            public storefront.
          </p>
        </div>

        {error && (
          <div
            className="seller-create-store-error"
            role="alert"
          >
            {error}
          </div>
        )}

        <form
          className="seller-create-store-form"
          onSubmit={handleSubmit}
        >
          <section className="seller-create-store-section">
            <div className="seller-create-store-section-heading">
              <span className="seller-section-number">
                01 / FOCKIS IDENTITY
              </span>

              <h2>
                Choose your Fockis
                domain
              </h2>

              <p>
                Choose the unique Fockis
                name customers will use
                to find your store.
              </p>
            </div>

            <div className="seller-field seller-domain-field">
              <label htmlFor="store-domain">
                Fockis Domain Name

                <span className="seller-required">
                  Required
                </span>
              </label>

              <div className="seller-domain-box">
                <input
                  id="store-domain"
                  name="domainName"
                  type="text"
                  value={
                    form.domainName
                  }
                  onChange={
                    handleDomainChange
                  }
                  placeholder="yourstore"
                  maxLength={63}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={saving}
                  required
                />

                <span className="seller-domain-suffix">
                  .fockis.com
                </span>
              </div>

              <div className="seller-domain-url">
                <span>
                  Your Fockis domain:
                </span>

                <strong>
                  {form.domainName ||
                    "yourstore"}
                  .fockis.com
                </strong>
              </div>

              <small className="seller-field-help">
                Use lowercase letters,
                numbers, or hyphens.
                Your domain must be
                unique.
              </small>
            </div>

            <div className="seller-create-store-note">
              <strong>
                Store Fockis ID
              </strong>

              <span>
                Fockis automatically
                generates your permanent
                Store Fockis ID from your
                registered country. You
                cannot choose or change
                this ID.
              </span>
            </div>
          </section>

          <section className="seller-create-store-section">
            <div className="seller-create-store-section-heading">
              <span className="seller-section-number">
                02 / LOCATION
              </span>

              <h2>
                Store location
              </h2>

              <p>
                Your country determines
                the country identifier
                included in your Store
                Fockis ID.
              </p>
            </div>

            <div className="seller-field">
              <label htmlFor="store-country">
                Country

                <span className="seller-required">
                  Required
                </span>
              </label>

              {!customCountry ? (
                <select
                  id="store-country"
                  value={
                    form.countryCode
                  }
                  onChange={
                    handleCountryChange
                  }
                  disabled={saving}
                  required
                >
                  <option value="">
                    Select your country
                  </option>

                  {COUNTRY_OPTIONS.map(
                    (country) => (
                      <option
                        key={
                          country.code
                        }
                        value={
                          country.code
                        }
                      >
                        {country.name} (
                        {
                          country.code
                        }
                        )
                      </option>
                    ),
                  )}

                  <option value="__custom__">
                    My country is not
                    listed
                  </option>
                </select>
              ) : (
                <div className="seller-custom-country">
                  <input
                    type="text"
                    value={
                      form.country
                    }
                    onChange={
                      handleCustomCountryNameChange
                    }
                    placeholder="Enter your country name"
                    disabled={saving}
                    required
                  />

                  <input
                    type="text"
                    value={
                      form.countryCode
                    }
                    onChange={
                      handleCustomCountryCodeChange
                    }
                    placeholder="Country code, e.g. JM"
                    maxLength={2}
                    autoComplete="off"
                    spellCheck={false}
                    disabled={saving}
                    required
                  />

                  <button
                    type="button"
                    className="seller-create-store-cancel"
                    onClick={
                      resetCustomCountry
                    }
                    disabled={saving}
                  >
                    Choose from list
                  </button>
                </div>
              )}

              <small className="seller-field-help">
                If your country is not
                listed, you can still
                create your store. Fockis
                will use the country code
                to generate your Store
                Fockis ID.
              </small>
            </div>

            {customCountry && (
              <div className="seller-create-store-note">
                <strong>
                  Country not listed?
                </strong>

                <span>
                  Enter your country's
                  name and its official
                  two-letter country code.
                  The backend will validate
                  the code and create the
                  store using it.
                </span>
              </div>
            )}

            <div className="seller-create-store-grid">
              <div className="seller-field">
                <label htmlFor="store-city">
                  City

                  <span className="seller-required">
                    Required
                  </span>
                </label>

                <input
                  id="store-city"
                  type="text"
                  value={form.city}
                  onChange={(event) =>
                    updateField(
                      "city",
                      event.target.value,
                    )
                  }
                  placeholder="Enter your city"
                  disabled={saving}
                  required
                />
              </div>

              <div className="seller-field">
                <label htmlFor="store-state">
                  State / Province
                </label>

                <input
                  id="store-state"
                  type="text"
                  value={form.state}
                  onChange={(event) =>
                    updateField(
                      "state",
                      event.target.value,
                    )
                  }
                  placeholder="State or province"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="seller-create-store-grid">
              <div className="seller-field">
                <label htmlFor="store-zip">
                  ZIP / Postal Code

                  {isHaiti ? (
                    <span className="seller-optional">
                      Optional for Haiti
                    </span>
                  ) : (
                    <span className="seller-required">
                      Required
                    </span>
                  )}
                </label>

                <input
                  id="store-zip"
                  type="text"
                  value={form.zipCode}
                  onChange={(event) =>
                    updateField(
                      "zipCode",
                      event.target.value,
                    )
                  }
                  placeholder={
                    isHaiti
                      ? "Optional for Haiti"
                      : "ZIP or postal code"
                  }
                  disabled={saving}
                  required={!isHaiti}
                  aria-required={!isHaiti}
                />

                <small className="seller-field-help">
                  {isHaiti
                    ? "You may leave this field blank for a Haiti store."
                    : "A ZIP or postal code is required for this country."}
                </small>
              </div>

              <div className="seller-field">
                <label htmlFor="store-currency">
                  Store Currency

                  <span className="seller-required">
                    Required
                  </span>
                </label>

                <select
                  id="store-currency"
                  value={
                    form.currency
                  }
                  onChange={(event) =>
                    updateField(
                      "currency",
                      event.target.value,
                    )
                  }
                  disabled={saving}
                  required
                >
                  {CURRENCY_OPTIONS.map(
                    (currency) => (
                      <option
                        key={currency}
                        value={currency}
                      >
                        {currency}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>

            <div className="seller-field">
              <label htmlFor="business-address">
                Business Address

                <span className="seller-required">
                  Required
                </span>
              </label>

              <input
                id="business-address"
                type="text"
                value={form.address}
                onChange={(event) =>
                  updateField(
                    "address",
                    event.target.value,
                  )
                }
                placeholder="Enter your business address"
                disabled={saving}
                required
              />
            </div>
          </section>

          <section className="seller-create-store-section">
            <div className="seller-create-store-section-heading">
              <span className="seller-section-number">
                03 / APPEARANCE
              </span>

              <h2>
                Store appearance
              </h2>

              <p>
                Add the photos customers
                will see on your public
                store.
              </p>
            </div>

            <div className="seller-store-cover-wrapper">
              <ImageUpload
                inputId="store-cover-photo"
                title="Cover Photo"
                description="A wide image displayed across the top of your store."
                imageSource={
                  coverPreview ||
                  form.coverPhoto
                }
                placeholderType="cover"
                onRemove={
                  removeCoverPhoto
                }
                onChange={
                  handleCoverChange
                }
                disabled={saving}
              />

              <div className="seller-profile-photo-overlap">
                <ImageUpload
                  inputId="store-profile-photo"
                  title="Shop Profile Photo"
                  description="Your store logo or profile image."
                  imageSource={
                    profilePreview ||
                    form.profilePhoto
                  }
                  placeholderType="profile"
                  onRemove={
                    removeProfilePhoto
                  }
                  onChange={
                    handleProfileChange
                  }
                  disabled={saving}
                />
              </div>
            </div>
          </section>

          <section className="seller-create-store-section">
            <div className="seller-create-store-section-heading">
              <span className="seller-section-number">
                04 / STORE INFORMATION
              </span>

              <h2>
                Store information
              </h2>

              <p>
                Tell customers what your
                store is about.
              </p>
            </div>

            <div className="seller-field">
              <label htmlFor="store-name">
                Store Name

                <span className="seller-required">
                  Required
                </span>
              </label>

              <input
                id="store-name"
                type="text"
                value={form.name}
                onChange={(event) =>
                  updateField(
                    "name",
                    event.target.value,
                  )
                }
                placeholder="Enter your store name"
                maxLength={100}
                disabled={saving}
                required
              />
            </div>

            <div className="seller-field">
              <label htmlFor="store-description">
                Store Description
              </label>

              <textarea
                id="store-description"
                value={
                  form.description
                }
                onChange={(event) =>
                  updateField(
                    "description",
                    event.target.value,
                  )
                }
                placeholder="Describe your store, products, or services"
                maxLength={2000}
                disabled={saving}
              />
            </div>
          </section>

          <section className="seller-create-store-section">
            <div className="seller-create-store-section-heading">
              <span className="seller-section-number">
                05 / CONTACT
              </span>

              <h2>
                Business contact
              </h2>

              <p>
                Provide contact information
                customers can use to reach
                your business.
              </p>
            </div>

            <div className="seller-create-store-grid">
              <div className="seller-field">
                <label htmlFor="business-email">
                  Business Email
                </label>

                <input
                  id="business-email"
                  type="email"
                  value={
                    form.businessEmail
                  }
                  onChange={(event) =>
                    updateField(
                      "businessEmail",
                      event.target.value,
                    )
                  }
                  placeholder="business@example.com"
                  disabled={saving}
                />
              </div>

              <div className="seller-field">
                <label htmlFor="business-phone">
                  Phone
                </label>

                <input
                  id="business-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    updateField(
                      "phone",
                      event.target.value,
                    )
                  }
                  placeholder="+1 (555) 555-5555"
                  disabled={saving}
                />
              </div>
            </div>
          </section>

          <div className="seller-create-store-note">
            <strong>
              Your Store Fockis ID is
              permanent.
            </strong>

            <span>
              Fockis generates it
              automatically from your
              registered country. For
              example, a United States
              store receives an ID beginning
              with FKUSST, while a Haiti
              store receives an ID beginning
              with FKHTST. Keep your Store
              Fockis ID available for Fockis
              Support and store ownership
              verification.
            </span>
          </div>

          <div className="seller-create-store-actions">
            <button
              type="button"
              className="seller-create-store-cancel"
              onClick={() =>
                navigate("/shop")
              }
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="seller-create-store-submit"
              disabled={saving}
            >
              {saving
                ? "Creating Store..."
                : "Create Store"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}