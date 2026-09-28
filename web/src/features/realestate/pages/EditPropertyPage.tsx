import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, ImagePlus, X } from "lucide-react";

import { propertyApi } from "../services/propertyApi";
import type { Property } from "../types/Property";

import "../styles/RealEstatePage.scss";
import "../styles/_input-reset.scss";

const FEATURE_OPTIONS = [
  "Garage", "Parking", "Pool", "Garden", "Balcony", "Basement",
  "Fireplace", "Air conditioning", "Heating", "Laundry",
  "Pet friendly", "Furnished",
];

const EditPropertyPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [purpose, setPurpose] = useState<"sale" | "rent">("sale");
  const [propertyType, setPropertyType] = useState("house");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
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

  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);

  /* ==========================================================================
     LOAD EXISTING PROPERTY
  ========================================================================== */

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    propertyApi
      .getProperty(id)
      .then((property: Property) => {
        setPurpose(property.status);
        setPropertyType(property.type);
        setTitle(property.title);
        setDescription(property.description);
        setPrice(String(property.price ?? ""));
        setAddress(property.address ?? "");
        setCity(property.city ?? "");
        setState(property.state ?? "");
        setBedrooms(property.beds !== undefined ? String(property.beds) : "");
        setBathrooms(property.baths !== undefined ? String(property.baths) : "");
        setSqft(property.sqft !== undefined ? String(property.sqft) : "");
        setYearBuilt(
          property.details?.yearBuilt !== undefined
            ? String(property.details.yearBuilt)
            : "",
        );
        setParking(property.details?.parking ?? "");
        setHeating(property.details?.heating ?? "");
        setCooling(property.details?.cooling ?? "");
        setStories(
          property.details?.stories !== undefined
            ? String(property.details.stories)
            : "",
        );
        setHoa(property.details?.hoa ?? "");
        setPropertyTax(property.details?.tax ?? "");
        setFeatures(property.features ?? []);
        setExistingImages(property.images ?? []);
      })
      .catch((err) => {
        console.error("Failed to load property for editing:", err);
        setLoadError(
          err instanceof Error ? err.message : "Failed to load property",
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  /* ==========================================================================
     FEATURES
  ========================================================================== */

  const toggleFeature = (feature: string) => {
    setFeatures((current) =>
      current.includes(feature)
        ? current.filter((f) => f !== feature)
        : [...current, feature],
    );
  };

  /* ==========================================================================
     IMAGES
  ========================================================================== */

  const addPhotos = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setNewFiles((current) => [...current, ...files]);
    setNewPreviews((current) => [
      ...current,
      ...files.map((file) => URL.createObjectURL(file)),
    ]);
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((current) => current.filter((_, i) => i !== index));
  };

  const removeNewPhoto = (index: number) => {
    setNewFiles((current) => current.filter((_, i) => i !== index));
    setNewPreviews((current) => current.filter((_, i) => i !== index));
  };

  /* ==========================================================================
     SAVE
  ========================================================================== */

  const handleCancel = () => {
    navigate(id ? `/realestate/property/${id}` : "/realestate");
  };

  const handleSave = async () => {
    if (!id) {
      return;
    }

    if (!title.trim()) {
      setSaveError("Please add a listing title.");
      return;
    }

    if (!description.trim()) {
      setSaveError("Please add a description.");
      return;
    }

    if (!price || Number(price) <= 0) {
      setSaveError("Please set a valid price.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      let uploadedUrls: string[] = [];

      if (newFiles.length > 0) {
        uploadedUrls = await propertyApi.uploadImages(newFiles);
      }

      await propertyApi.updateProperty(id, {
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
        images: [...existingImages, ...uploadedUrls],
      });

      setSaved(true);
    } catch (err) {
      console.error("Failed to update property:", err);
      setSaveError(
        err instanceof Error
          ? err.message
          : "Failed to save changes. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  /* ==========================================================================
     LOADING / ERROR / SUCCESS STATES
  ========================================================================== */

  if (loading) {
    return (
      <div className="re-page">
        <div className="re-loading">Loading property...</div>
      </div>
    );
  }

  if (loadError || !id) {
    return (
      <div className="re-page">
        <div className="re-empty">
          <h3>Couldn't load this property</h3>
          {loadError && <p style={{ opacity: 0.7 }}>{loadError}</p>}
          <button
            type="button"
            className="re-primary"
            style={{ marginTop: "16px" }}
            onClick={() => navigate("/realestate")}
          >
            Back to properties
          </button>
        </div>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="re-page">
        <div className="re-create-success">
          <div>
            <Check size={32} />
          </div>
          <h1>Changes saved</h1>
          <p>Your property listing has been updated.</p>
          <button
            type="button"
            className="re-primary"
            style={{ marginTop: "20px" }}
            onClick={() => navigate(`/realestate/property/${id}`)}
          >
            View listing
          </button>
        </div>
      </div>
    );
  }

  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <div className="re-page">
      <div className="re-create">
        <button
          type="button"
          className="re-back"
          onClick={handleCancel}
        >
          <ArrowLeft size={17} />
          Back to listing
        </button>

        <div className="re-page-heading">
          <p className="re-eyebrow">Fockis Real Estate</p>
          <h1>Edit property</h1>
          <p>Update this listing's details, pricing, and photos.</p>
        </div>

        <div className="re-create-card">
          <section>
            <h2>Listing type</h2>
            <div className="re-choice-grid">
              {(["sale", "rent"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={purpose === value ? "is-selected" : ""}
                  onClick={() => setPurpose(value)}
                >
                  {value === "sale" ? "Sell" : "Rent"}
                </button>
              ))}
            </div>
          </section>

          <section style={{ marginTop: "32px" }}>
            <h2>Property type</h2>
            <div className="re-choice-grid">
              {[
                ["house", "House"], ["apartment", "Apartment"],
                ["condo", "Condo"], ["townhouse", "Townhouse"],
                ["land", "Land"], ["commercial", "Commercial"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={propertyType === value ? "is-selected" : ""}
                  onClick={() => setPropertyType(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section style={{ marginTop: "32px" }}>
            <h2>Basic information</h2>
            <label className="re-large-field">
              <span>Listing title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="re-large-field">
              <span>Description</span>
              <textarea
                rows={7}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <label className="re-large-field" style={{ maxWidth: "280px" }}>
              <span>{purpose === "rent" ? "Monthly rent" : "Property price"}</span>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </label>
          </section>

          <section style={{ marginTop: "32px" }}>
            <h2>Location</h2>
            <div className="re-form-grid">
              <label>
                <span>Street address</span>
                <input value={address} onChange={(e) => setAddress(e.target.value)} />
              </label>
              <label>
                <span>City</span>
                <input value={city} onChange={(e) => setCity(e.target.value)} />
              </label>
              <label>
                <span>State</span>
                <input value={state} onChange={(e) => setState(e.target.value)} />
              </label>
            </div>
          </section>

          <section style={{ marginTop: "32px" }}>
            <h2>Property details</h2>
            <div className="re-form-grid">
              <label>
                <span>Bedrooms</span>
                <input type="number" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
              </label>
              <label>
                <span>Bathrooms</span>
                <input type="number" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
              </label>
              <label>
                <span>Square feet</span>
                <input type="number" value={sqft} onChange={(e) => setSqft(e.target.value)} />
              </label>
              <label>
                <span>Year built</span>
                <input type="number" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} />
              </label>
              <label>
                <span>Parking</span>
                <input value={parking} onChange={(e) => setParking(e.target.value)} />
              </label>
              <label>
                <span>Heating</span>
                <input value={heating} onChange={(e) => setHeating(e.target.value)} />
              </label>
              <label>
                <span>Cooling</span>
                <input value={cooling} onChange={(e) => setCooling(e.target.value)} />
              </label>
              <label>
                <span>Stories</span>
                <input type="number" value={stories} onChange={(e) => setStories(e.target.value)} />
              </label>
              <label>
                <span>HOA</span>
                <input value={hoa} onChange={(e) => setHoa(e.target.value)} />
              </label>
              <label>
                <span>Property tax</span>
                <input value={propertyTax} onChange={(e) => setPropertyTax(e.target.value)} />
              </label>
            </div>
          </section>

          <section style={{ marginTop: "32px" }}>
            <h2>Features</h2>
            <div className="re-feature-selection">
              {FEATURE_OPTIONS.map((feature) => (
                <label key={feature}>
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

          <section style={{ marginTop: "32px" }}>
            <h2>Photos</h2>

            {existingImages.length > 0 && (
              <div className="re-upload-grid">
                {existingImages.map((image, index) => (
                  <div key={image} className="re-upload-image">
                    <img src={image} alt="" />
                    <button type="button" onClick={() => removeExistingImage(index)}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="re-upload" style={{ marginTop: existingImages.length ? "16px" : "0" }}>
              <ImagePlus size={32} />
              <h3>Add more photos</h3>
              <p>New photos are added alongside your existing ones.</p>
              <input type="file" accept="image/*" multiple onChange={addPhotos} />
              <span className="re-secondary">Choose Photos</span>
            </label>

            {newPreviews.length > 0 && (
              <div className="re-upload-grid" style={{ marginTop: "16px" }}>
                {newPreviews.map((src, index) => (
                  <div key={src} className="re-upload-image">
                    <img src={src} alt="" />
                    <button type="button" onClick={() => removeNewPhoto(index)}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {saveError && (
            <div
              style={{
                marginTop: "24px",
                padding: "12px 16px",
                borderRadius: "10px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                fontSize: "13px",
              }}
            >
              {saveError}
            </div>
          )}
        </div>

        <div className="re-create-actions">
          <button
            type="button"
            className="re-secondary"
            onClick={handleCancel}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="button"
            className="re-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditPropertyPage;