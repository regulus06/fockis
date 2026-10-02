import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ImagePlus,
  X,
  Home as HomeIcon,
  KeyRound,
  Building2,
  Warehouse,
  Trees,
  Landmark,
} from "lucide-react";
import { propertyApi } from "../services/propertyApi";
import "../styles/CreatePropertyPage.scss";
import "../styles/_input-reset.scss";

const steps = [
  "Purpose", "Property", "Location", "Details",
  "Pricing", "Features", "Description", "Photos", "Preview",
];

const FEATURE_OPTIONS = [
  "Garage", "Parking", "Pool", "Garden", "Balcony", "Basement",
  "Fireplace", "Air conditioning", "Heating", "Laundry",
  "Pet friendly", "Furnished",
];

const PROPERTY_TYPES = [
  { value: "house", label: "House", icon: HomeIcon },
  { value: "apartment", label: "Apartment", icon: Building2 },
  { value: "condo", label: "Condo", icon: Warehouse },
  { value: "townhouse", label: "Townhouse", icon: HomeIcon },
  { value: "land", label: "Land", icon: Trees },
  { value: "commercial", label: "Commercial", icon: Landmark },
];

const CreatePropertyPage: React.FC = () => {
  const [step, setStep] = useState(0);
  const [purpose, setPurpose] = useState<"sale" | "rent">("sale");
  const [propertyType, setPropertyType] = useState("house");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [address, setAddress] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [sqft, setSqft] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [parking, setParking] = useState("");
  const [heating, setHeating] = useState("");
  const [cooling, setCooling] = useState("");
  const [stories, setStories] = useState("");
  const [hoa, setHoa] = useState("");
  const [propertyTax, setPropertyTax] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);

  const next = () => setStep((c) => Math.min(c + 1, steps.length - 1));
  const previous = () => setStep((c) => Math.max(c - 1, 0));
  const goToStep = (index: number) => setStep(index);

  const toggleFeature = (feature: string) => {
    setFeatures((current) =>
      current.includes(feature)
        ? current.filter((f) => f !== feature)
        : [...current, feature],
    );
  };

  const addPhotos = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setPhotoFiles((current) => [...current, ...files]);
    setPhotoPreviews((current) => [
      ...current,
      ...files.map((file) => URL.createObjectURL(file)),
    ]);
  };

  const removePhoto = (index: number) => {
    setPhotoFiles((current) => current.filter((_, i) => i !== index));
    setPhotoPreviews((current) => current.filter((_, i) => i !== index));
  };

  const publish = async () => {
    if (!title.trim()) {
      setPublishError("Please add a listing title before publishing.");
      goToStep(6);
      return;
    }

    if (!description.trim()) {
      setPublishError("Please add a description before publishing.");
      goToStep(6);
      return;
    }

    if (!price || Number(price) <= 0) {
      setPublishError("Please set a price before publishing.");
      goToStep(4);
      return;
    }

    setSubmitting(true);
    setPublishError(null);

    try {
      let images: string[] = [];

      if (photoFiles.length > 0) {
        images = await propertyApi.uploadImages(photoFiles);
      }

      await propertyApi.createProperty({
        title,
        description,
        price: Number(price) || 0,
        type: propertyType,
        listingStatus: purpose,
        bedrooms: bedrooms ? Number(bedrooms) : undefined,
        bathrooms: bathrooms ? Number(bathrooms) : undefined,
        squareFeet: sqft ? Number(sqft) : undefined,
        yearBuilt: yearBuilt ? Number(yearBuilt) : undefined,
        parking: parking || undefined,
        heating: heating || undefined,
        cooling: cooling || undefined,
        stories: stories ? Number(stories) : undefined,
        hoa: hoa || undefined,
        propertyTax: propertyTax || undefined,
        location: address,
        city,
        state,
        images,
      });

      setPublished(true);
    } catch (err) {
      setPublishError(
        err instanceof Error
          ? err.message
          : "Failed to publish property. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const progressPercent = ((step + 1) / steps.length) * 100;

  if (published) {
    return (
      <div className="cp-page">
        <div className="cp-success">
          <div className="cp-success-icon">
            <Check size={32} />
          </div>
          <h1>Property published</h1>
          <p>Your listing is now live and searchable on Fockis Real Estate.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cp-page">
      <div className="cp-shell">
        <div className="cp-heading">
          <p className="cp-eyebrow">Fockis Real Estate</p>
          <h1>List your property</h1>
          <p>Reach buyers and renters looking for their next property.</p>
        </div>

        <div className="cp-progress-track">
          <div className="cp-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="cp-stepper">
          {steps.map((label, index) => (
            <div
              key={label}
              className={`cp-step ${
                index === step ? "is-active" : index < step ? "is-complete" : ""
              }`}
            >
              <span className="cp-step-dot">
                {index < step ? <Check size={13} /> : index + 1}
              </span>
              <small>{label}</small>
            </div>
          ))}
        </div>

        <div className="cp-card">
          {step === 0 && (
            <section>
              <h2>What are you listing?</h2>
              <p>Choose how this property will be listed.</p>
              <div className="cp-choice-grid">
                {(["sale", "rent"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`cp-choice-card ${purpose === value ? "is-selected" : ""}`}
                    onClick={() => setPurpose(value)}
                  >
                    <span className="cp-choice-icon">
                      {value === "sale" ? <HomeIcon size={18} /> : <KeyRound size={18} />}
                    </span>
                    {value === "sale" ? "Sell" : "Rent"}
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 1 && (
            <section>
              <h2>Property type</h2>
              <p>What kind of property is this?</p>
              <div className="cp-choice-grid">
                {PROPERTY_TYPES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    className={`cp-choice-card ${propertyType === value ? "is-selected" : ""}`}
                    onClick={() => setPropertyType(value)}
                  >
                    <span className="cp-choice-icon">
                      <Icon size={18} />
                    </span>
                    {label}
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 2 && (
            <section>
              <h2>Property location</h2>
              <p>Where is this property located?</p>
              <div className="cp-form-grid">
                <label className="cp-field cp-field-wide">
                  <span>Street address</span>
                  <input value={address} onChange={(e) => setAddress(e.target.value)} />
                </label>
                <label className="cp-field">
                  <span>City</span>
                  <input value={city} onChange={(e) => setCity(e.target.value)} />
                </label>
                <label className="cp-field">
                  <span>State</span>
                  <input value={state} onChange={(e) => setState(e.target.value)} />
                </label>
              </div>
            </section>
          )}

          {step === 3 && (
            <section>
              <h2>Property details</h2>
              <p>Add specs and amenities buyers will want to know.</p>
              <div className="cp-form-grid">
                <label className="cp-field">
                  <span>Bedrooms</span>
                  <input type="number" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
                </label>
                <label className="cp-field">
                  <span>Bathrooms</span>
                  <input type="number" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
                </label>
                <label className="cp-field">
                  <span>Square feet</span>
                  <input type="number" value={sqft} onChange={(e) => setSqft(e.target.value)} />
                </label>
                <label className="cp-field">
                  <span>Year built</span>
                  <input type="number" placeholder="e.g. 2016" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} />
                </label>
                <label className="cp-field">
                  <span>Parking</span>
                  <input placeholder="e.g. 2-car garage" value={parking} onChange={(e) => setParking(e.target.value)} />
                </label>
                <label className="cp-field">
                  <span>Heating</span>
                  <input placeholder="e.g. Forced air, gas" value={heating} onChange={(e) => setHeating(e.target.value)} />
                </label>
                <label className="cp-field">
                  <span>Cooling</span>
                  <input placeholder="e.g. Central A/C" value={cooling} onChange={(e) => setCooling(e.target.value)} />
                </label>
                <label className="cp-field">
                  <span>Stories</span>
                  <input type="number" placeholder="e.g. 2" value={stories} onChange={(e) => setStories(e.target.value)} />
                </label>
                <label className="cp-field">
                  <span>HOA</span>
                  <input placeholder="e.g. $95/mo or None" value={hoa} onChange={(e) => setHoa(e.target.value)} />
                </label>
                <label className="cp-field">
                  <span>Property tax</span>
                  <input placeholder="e.g. $3,640/yr" value={propertyTax} onChange={(e) => setPropertyTax(e.target.value)} />
                </label>
              </div>
            </section>
          )}

          {step === 4 && (
            <section>
              <h2>Set your price</h2>
              <p>What's the {purpose === "rent" ? "monthly rent" : "asking price"}?</p>
              <label className="cp-field cp-price-field">
                <span>{purpose === "rent" ? "Monthly rent" : "Property price"}</span>
                <input
                  type="number"
                  placeholder="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </label>
            </section>
          )}

          {step === 5 && (
            <section>
              <h2>Property features</h2>
              <p>Select everything this property offers.</p>
              <div className="cp-feature-grid">
                {FEATURE_OPTIONS.map((feature) => (
                  <label key={feature} className="cp-feature-chip">
                    <input
                      type="checkbox"
                      checked={features.includes(feature)}
                      onChange={() => toggleFeature(feature)}
                    />
                    <span>{feature}</span>
                  </label>
                ))}
              </div>
            </section>
          )}

          {step === 6 && (
            <section>
              <h2>Describe your property</h2>
              <p>Give it a title and description that stands out.</p>
              <label className="cp-field cp-field-large">
                <span>Listing title</span>
                <input
                  placeholder="Example: Modern 4 Bedroom Family Home"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label className="cp-field cp-field-large">
                <span>Description</span>
                <textarea
                  rows={8}
                  placeholder="Tell buyers or renters what makes this property special."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
            </section>
          )}

          {step === 7 && (
            <section>
              <h2>Property photos</h2>
              <p>Great photos get more inquiries.</p>

              <label className="cp-upload">
                <ImagePlus size={36} />
                <h3>Add property photos</h3>
                <p>Upload your best photos to attract more buyers and renters.</p>
                <input type="file" accept="image/*" multiple onChange={addPhotos} />
                <span className="cp-upload-cta">Choose Photos</span>
              </label>

              {photoPreviews.length > 0 && (
                <div className="cp-photo-grid">
                  {photoPreviews.map((src, index) => (
                    <div key={src} className="cp-photo-item">
                      <img src={src} alt="" />
                      <button type="button" className="cp-photo-remove" onClick={() => removePhoto(index)}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {step === 8 && (
            <section>
              <h2>Preview your listing</h2>
              <p>Here's how it'll look once published.</p>

              <div className="cp-preview-card">
                <div className="cp-preview-photo">
                  {photoPreviews[0] ? (
                    <img
                      src={photoPreviews[0]}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <ImagePlus size={32} />
                  )}
                </div>

                <div className="cp-preview-body">
                  <span className="cp-preview-badge">
                    {purpose === "sale" ? "For Sale" : "For Rent"}
                  </span>
                  <h3>{title || "Your property title"}</h3>
                  <strong>{price ? `$${Number(price).toLocaleString()}` : "$0"}</strong>
                  <p>{address || "Property address"}, {city || "City"}, {state || "State"}</p>
                  <p>{description || "Your property description will appear here."}</p>
                </div>
              </div>

              {publishError && (
                <div className="cp-error-banner">{publishError}</div>
              )}
            </section>
          )}
        </div>

        <div className="cp-actions">
          <button
            type="button"
            className="cp-btn cp-btn-secondary"
            disabled={step === 0}
            onClick={previous}
          >
            <ArrowLeft size={16} />
            Previous
          </button>

          {step < steps.length - 1 ? (
            <button type="button" className="cp-btn cp-btn-primary" onClick={next}>
              Next
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="cp-btn cp-btn-primary"
              disabled={submitting}
              onClick={publish}
            >
              {submitting ? "Publishing..." : "Publish Property"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatePropertyPage;