import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { businessesApi } from "../services/businessesApi";

import type {
  Business,
  BusinessCategory,
  BusinessSocialLinks,
} from "../types/business.types";

import "../styles/BusinessForm.scss";

interface BusinessFormProps {
  business?: Business | null;

  onSubmit?: (
    values: Partial<Business>,
  ) => Promise<void> | void;

  onSuccess?: (
    business: Business,
  ) => void;

  onCancel?: () => void;

  className?: string;
}

interface BusinessFormState {
  name: string;
  description: string;
  category: BusinessCategory | "";

  logoUrl: string;
  coverImageUrl: string;

  websiteUrl: string;
  phone: string;
  email: string;

  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;

  latitude: string;
  longitude: string;

  facebook: string;
  instagram: string;
  linkedin: string;
  youtube: string;

  feedEnabled: boolean;
  spotlightEnabled: boolean;
  spotlightPriority: string;
}

const BUSINESS_CATEGORIES: Array<{
  value: BusinessCategory;
  label: string;
}> = [
  {
    value: "AUTOMOTIVE",
    label: "Automotive",
  },
  {
    value: "RESTAURANT",
    label: "Restaurant",
  },
  {
    value: "REAL_ESTATE",
    label: "Real Estate",
  },
  {
    value: "RETAIL",
    label: "Retail",
  },
  {
    value: "BEAUTY",
    label: "Beauty",
  },
  {
    value: "HEALTH",
    label: "Health",
  },
  {
    value: "FITNESS",
    label: "Fitness",
  },
  {
    value: "TECHNOLOGY",
    label: "Technology",
  },
  {
    value: "PROFESSIONAL_SERVICES",
    label: "Professional Services",
  },
  {
    value: "HOME_SERVICES",
    label: "Home Services",
  },
  {
    value: "ENTERTAINMENT",
    label: "Entertainment",
  },
  {
    value: "TRAVEL",
    label: "Travel",
  },
  {
    value: "EDUCATION",
    label: "Education",
  },
  {
    value: "FINANCE",
    label: "Finance",
  },
  {
    value: "OTHER",
    label: "Other / Company",
  },
];

function createInitialState(
  business?: Business | null,
): BusinessFormState {
  return {
    name: business?.name ?? "",
    description: business?.description ?? "",
    category: business?.category ?? "",

    logoUrl: business?.logoUrl ?? "",
    coverImageUrl:
      business?.coverImageUrl ?? "",

    websiteUrl:
      business?.websiteUrl ?? "",
    phone: business?.phone ?? "",
    email: business?.email ?? "",

    address: business?.address ?? "",
    city: business?.city ?? "",
    state: business?.state ?? "",
    zipCode: business?.zipCode ?? "",
    country: business?.country ?? "",

    latitude:
      business?.latitude !== undefined &&
      business?.latitude !== null
        ? String(business.latitude)
        : "",

    longitude:
      business?.longitude !== undefined &&
      business?.longitude !== null
        ? String(business.longitude)
        : "",

    facebook:
      business?.socialLinks?.facebook ?? "",

    instagram:
      business?.socialLinks?.instagram ?? "",

    linkedin:
      business?.socialLinks?.linkedin ?? "",

    youtube:
      business?.socialLinks?.youtube ?? "",

    feedEnabled:
      business?.feedEnabled ?? false,

    spotlightEnabled:
      business?.spotlightEnabled ?? false,

    spotlightPriority:
      business?.spotlightPriority !== undefined &&
      business?.spotlightPriority !== null
        ? String(
            business.spotlightPriority,
          )
        : "0",
  };
}

export default function BusinessForm({
  business,
  onSubmit,
  onSuccess,
  onCancel,
  className = "",
}: BusinessFormProps) {
  const [
    form,
    setForm,
  ] = useState<BusinessFormState>(
    () => createInitialState(business),
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const isEditing = Boolean(
    business?.id,
  );

  useEffect(() => {
    setForm(
      createInitialState(business),
    );
  }, [business]);

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement |
      HTMLTextAreaElement |
      HTMLSelectElement
    >,
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const {
      name,
      checked,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: checked,
    }));
  };

  const buildPayload =
    (): Partial<Business> => {
      const socialLinks: BusinessSocialLinks =
        {};

      if (form.facebook.trim()) {
        socialLinks.facebook =
          form.facebook.trim();
      }

      if (form.instagram.trim()) {
        socialLinks.instagram =
          form.instagram.trim();
      }

      if (form.linkedin.trim()) {
        socialLinks.linkedin =
          form.linkedin.trim();
      }

      if (form.youtube.trim()) {
        socialLinks.youtube =
          form.youtube.trim();
      }

      const payload: Partial<Business> = {
        name: form.name.trim(),

        description:
          form.description.trim(),

        category:
          form.category as BusinessCategory,

        logoUrl:
          form.logoUrl.trim() || undefined,

        coverImageUrl:
          form.coverImageUrl.trim() ||
          undefined,

        websiteUrl:
          form.websiteUrl.trim() ||
          undefined,

        phone:
          form.phone.trim() || undefined,

        email:
          form.email.trim() || undefined,

        address:
          form.address.trim() || undefined,

        city:
          form.city.trim() || undefined,

        state:
          form.state.trim() || undefined,

        zipCode:
          form.zipCode.trim() ||
          undefined,

        country:
          form.country.trim() ||
          undefined,

        feedEnabled:
          form.feedEnabled,

        spotlightEnabled:
          form.spotlightEnabled,

        spotlightPriority:
          Number(form.spotlightPriority) || 0,

        socialLinks:
          Object.keys(socialLinks).length > 0
            ? socialLinks
            : undefined,
      };

      if (form.latitude.trim()) {
        const latitude = Number(
          form.latitude,
        );

        if (!Number.isNaN(latitude)) {
          payload.latitude = latitude;
        }
      }

      if (form.longitude.trim()) {
        const longitude = Number(
          form.longitude,
        );

        if (!Number.isNaN(longitude)) {
          payload.longitude = longitude;
        }
      }

      return payload;
    };

  const validate = (): boolean => {
    if (!form.name.trim()) {
      setError(
        "Business name is required.",
      );
      return false;
    }

    if (!form.description.trim()) {
      setError(
        "Business description is required.",
      );
      return false;
    }

    if (!form.category) {
      setError(
        "Please select a business category.",
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");

    if (!validate()) {
      return;
    }

    const payload =
      buildPayload();

    setLoading(true);

    try {
      /*
       * When the parent provides onSubmit,
       * let the parent handle the API call.
       *
       * This is used by pages such as
       * BusinessManagerPage.
       */
      if (onSubmit) {
        await onSubmit(payload);
        return;
      }

      /*
       * Otherwise BusinessForm can work
       * independently.
       */
      let result: Business;

      if (business?.id) {
        result =
          await businessesApi.update(
            business.id,
            payload,
          );
      } else {
        result =
          await businessesApi.create(
            payload,
          );
      }

      onSuccess?.(result);
    } catch (submitError) {
      console.error(
        "Business form submission failed",
        submitError,
      );

      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save business. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className={`fk-business-form ${className}`}
      onSubmit={handleSubmit}
    >
      <div className="fk-business-form__header">
        <div>
          <h2>
            {isEditing
              ? "Edit Business"
              : "Create Business"}
          </h2>

          <p>
            Add your business information
            to Fockis.
          </p>
        </div>
      </div>

      {error && (
        <div className="fk-business-form__error">
          {error}
        </div>
      )}

      <section className="fk-business-form__section">
        <div className="fk-business-form__section-title">
          <h3>Basic Information</h3>

          <p>
            Tell customers about your
            business.
          </p>
        </div>

        <div className="fk-business-form__grid">
          <div className="fk-business-form__field fk-business-form__field--full">
            <label htmlFor="business-name">
              Business Name *
            </label>

            <input
              id="business-name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your business name"
              required
            />
          </div>

          <div className="fk-business-form__field fk-business-form__field--full">
            <label htmlFor="business-description">
              Description *
            </label>

            <textarea
              id="business-description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe your business"
              rows={5}
              required
            />
          </div>

          <div className="fk-business-form__field">
            <label htmlFor="business-category">
              Category *
            </label>

            <select
              id="business-category"
              name="category"
              value={form.category}
              onChange={handleChange}
              required
            >
              <option value="">
                Select a category
              </option>

              {BUSINESS_CATEGORIES.map(
                (category) => (
                  <option
                    key={category.value}
                    value={category.value}
                  >
                    {category.label}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>
      </section>

      <section className="fk-business-form__section">
        <div className="fk-business-form__section-title">
          <h3>Images</h3>

          <p>
            Add your logo and cover image.
          </p>
        </div>

        <div className="fk-business-form__grid">
          <div className="fk-business-form__field">
            <label htmlFor="business-logo">
              Logo URL
            </label>

            <input
              id="business-logo"
              name="logoUrl"
              type="url"
              value={form.logoUrl}
              onChange={handleChange}
              placeholder="https://example.com/logo.jpg"
            />
          </div>

          <div className="fk-business-form__field">
            <label htmlFor="business-cover">
              Cover Image URL
            </label>

            <input
              id="business-cover"
              name="coverImageUrl"
              type="url"
              value={form.coverImageUrl}
              onChange={handleChange}
              placeholder="https://example.com/cover.jpg"
            />
          </div>
        </div>
      </section>

      <section className="fk-business-form__section">
        <div className="fk-business-form__section-title">
          <h3>Contact Information</h3>

          <p>
            Give customers ways to reach you.
          </p>
        </div>

        <div className="fk-business-form__grid">
          <div className="fk-business-form__field">
            <label htmlFor="business-website">
              Website
            </label>

            <input
              id="business-website"
              name="websiteUrl"
              type="url"
              value={form.websiteUrl}
              onChange={handleChange}
              placeholder="https://example.com"
            />
          </div>

          <div className="fk-business-form__field">
            <label htmlFor="business-phone">
              Phone
            </label>

            <input
              id="business-phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="(555) 555-5555"
            />
          </div>

          <div className="fk-business-form__field">
            <label htmlFor="business-email">
              Email
            </label>

            <input
              id="business-email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="business@example.com"
            />
          </div>
        </div>
      </section>

      <section className="fk-business-form__section">
        <div className="fk-business-form__section-title">
          <h3>Business Address</h3>

          <p>
            Help customers find your
            business.
          </p>
        </div>

        <div className="fk-business-form__grid">
          <div className="fk-business-form__field fk-business-form__field--full">
            <label htmlFor="business-address">
              Address
            </label>

            <input
              id="business-address"
              name="address"
              type="text"
              value={form.address}
              onChange={handleChange}
              placeholder="Street address"
            />
          </div>

          <div className="fk-business-form__field">
            <label htmlFor="business-city">
              City
            </label>

            <input
              id="business-city"
              name="city"
              type="text"
              value={form.city}
              onChange={handleChange}
              placeholder="City"
            />
          </div>

          <div className="fk-business-form__field">
            <label htmlFor="business-state">
              State
            </label>

            <input
              id="business-state"
              name="state"
              type="text"
              value={form.state}
              onChange={handleChange}
              placeholder="State"
            />
          </div>

          <div className="fk-business-form__field">
            <label htmlFor="business-zip">
              ZIP Code
            </label>

            <input
              id="business-zip"
              name="zipCode"
              type="text"
              value={form.zipCode}
              onChange={handleChange}
              placeholder="ZIP code"
            />
          </div>

          <div className="fk-business-form__field">
            <label htmlFor="business-country">
              Country
            </label>

            <input
              id="business-country"
              name="country"
              type="text"
              value={form.country}
              onChange={handleChange}
              placeholder="Country"
            />
          </div>
        </div>
      </section>

      <section className="fk-business-form__section">
        <div className="fk-business-form__section-title">
          <h3>Map Location</h3>

          <p>
            Optional coordinates for your
            business location.
          </p>
        </div>

        <div className="fk-business-form__grid">
          <div className="fk-business-form__field">
            <label htmlFor="business-latitude">
              Latitude
            </label>

            <input
              id="business-latitude"
              name="latitude"
              type="number"
              step="any"
              value={form.latitude}
              onChange={handleChange}
              placeholder="39.9612"
            />
          </div>

          <div className="fk-business-form__field">
            <label htmlFor="business-longitude">
              Longitude
            </label>

            <input
              id="business-longitude"
              name="longitude"
              type="number"
              step="any"
              value={form.longitude}
              onChange={handleChange}
              placeholder="-82.9988"
            />
          </div>
        </div>
      </section>

      <section className="fk-business-form__section">
        <div className="fk-business-form__section-title">
          <h3>Social Media</h3>

          <p>
            Connect your business social
            accounts.
          </p>
        </div>

        <div className="fk-business-form__grid">
          <div className="fk-business-form__field">
            <label htmlFor="business-facebook">
              Facebook
            </label>

            <input
              id="business-facebook"
              name="facebook"
              type="url"
              value={form.facebook}
              onChange={handleChange}
              placeholder="https://facebook.com/..."
            />
          </div>

          <div className="fk-business-form__field">
            <label htmlFor="business-instagram">
              Instagram
            </label>

            <input
              id="business-instagram"
              name="instagram"
              type="url"
              value={form.instagram}
              onChange={handleChange}
              placeholder="https://instagram.com/..."
            />
          </div>

          <div className="fk-business-form__field">
            <label htmlFor="business-linkedin">
              LinkedIn
            </label>

            <input
              id="business-linkedin"
              name="linkedin"
              type="url"
              value={form.linkedin}
              onChange={handleChange}
              placeholder="https://linkedin.com/..."
            />
          </div>

          <div className="fk-business-form__field">
            <label htmlFor="business-youtube">
              YouTube
            </label>

            <input
              id="business-youtube"
              name="youtube"
              type="url"
              value={form.youtube}
              onChange={handleChange}
              placeholder="https://youtube.com/..."
            />
          </div>
        </div>
      </section>

      <section className="fk-business-form__section">
        <div className="fk-business-form__section-title">
          <h3>Fockis Visibility</h3>

          <p>
            Control how your business
            appears on Fockis.
          </p>
        </div>

        <div className="fk-business-form__options">
          <label className="fk-business-form__checkbox">
            <input
              type="checkbox"
              name="feedEnabled"
              checked={form.feedEnabled}
              onChange={
                handleCheckboxChange
              }
            />

            <span>
              <strong>
                Publish to Feed
              </strong>

              <small>
                Allow this business to
                appear in the Fockis
                business feed.
              </small>
            </span>
          </label>

          <label className="fk-business-form__checkbox">
            <input
              type="checkbox"
              name="spotlightEnabled"
              checked={
                form.spotlightEnabled
              }
              onChange={
                handleCheckboxChange
              }
            />

            <span>
              <strong>
                Add to Spotlight
              </strong>

              <small>
                Feature this business in
                the Spotlight section.
              </small>
            </span>
          </label>

          <div className="fk-business-form__field">
            <label htmlFor="business-spotlight-priority">
              Spotlight Priority
            </label>

            <input
              id="business-spotlight-priority"
              name="spotlightPriority"
              type="number"
              min="0"
              step="1"
              value={
                form.spotlightPriority
              }
              onChange={handleChange}
            />
          </div>
        </div>
      </section>

      <div className="fk-business-form__actions">
        {onCancel && (
          <button
            type="button"
            className="fk-business-form__button fk-business-form__button--secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          className="fk-business-form__button fk-business-form__button--primary"
          disabled={loading}
        >
          {loading
            ? "Saving..."
            : isEditing
              ? "Save Changes"
              : "Create Business"}
        </button>
      </div>
    </form>
  );
}