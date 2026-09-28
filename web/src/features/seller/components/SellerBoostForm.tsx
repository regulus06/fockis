import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  sellerApi,
} from "../services/sellerApi";

import {
  sellerPromotionApi,
  BOOST_PLANS,
  type BoostPlan,
} from "../services/sellerPromotionApi";

import "../styles/AddProductForm.scss";
import "../styles/SellerBoostForm.scss";


export default function SellerBoostForm() {
  const navigate = useNavigate();


  // =====================================================
  // STORES
  // =====================================================

  const [
    stores,
    setStores,
  ] = useState<any[]>([]);

  const [
    selectedStore,
    setSelectedStore,
  ] = useState("");


  // =====================================================
  // FORM
  // =====================================================

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    ctaLabel,
    setCtaLabel,
  ] = useState("Visit Store");

  const [
    categoryName,
    setCategoryName,
  ] = useState("");


  // =====================================================
  // IMAGE
  // =====================================================

  const [
    image,
    setImage,
  ] = useState<File | null>(null);

  const [
    preview,
    setPreview,
  ] = useState("");


  // =====================================================
  // PLAN
  // =====================================================

  const [
    planId,
    setPlanId,
  ] = useState<string>(
    BOOST_PLANS[1]?.id || "",
  );


  // =====================================================
  // SUBMIT STATE
  // =====================================================

  const [
    submitting,
    setSubmitting,
  ] = useState(false);


  // =====================================================
  // LOAD STORES
  // =====================================================

  useEffect(() => {
    void loadStores();
  }, []);


  async function loadStores(): Promise<void> {
    try {
      const data =
        await sellerApi.getMyStores();

      const storeList: any[] =
        Array.isArray(data)
          ? data
          : [];

      setStores(storeList);

      if (storeList.length > 0) {
        setSelectedStore(
          String(
            storeList[0]?._id || "",
          ),
        );
      }
    } catch (error) {
      console.error(
        "STORE LOAD ERROR:",
        error,
      );

      setStores([]);
    }
  }


  // =====================================================
  // IMAGE SELECT
  // =====================================================

  function handleImage(
    e: React.ChangeEvent<HTMLInputElement>,
  ): void {
    const file =
      e.target.files?.[0];

    if (!file) {
      return;
    }

    setImage(file);

    const objectUrl =
      URL.createObjectURL(file);

    setPreview(objectUrl);
  }


  // =====================================================
  // UPLOAD IMAGE
  // =====================================================

  async function uploadBannerImage(): Promise<string> {
    if (!image) {
      return "";
    }

    const formData =
      new FormData();

    formData.append(
      "file",
      image,
    );

    const uploaded: unknown =
      await sellerApi.uploadImage(
        formData,
      );

    let imageUrl = "";

    if (
      typeof uploaded === "string"
    ) {
      imageUrl = uploaded;
    } else if (
      uploaded &&
      typeof uploaded === "object"
    ) {
      const data =
        uploaded as Record<
          string,
          unknown
        >;

      imageUrl =
        typeof data.url === "string"
          ? data.url
          : typeof data.path === "string"
            ? data.path
            : typeof data.file === "string"
              ? data.file
              : "";
    }

    if (
      !imageUrl ||
      imageUrl.includes("undefined") ||
      imageUrl.includes("null")
    ) {
      throw new Error(
        "Invalid banner image URL returned by upload.",
      );
    }

    if (
      !imageUrl.startsWith("/") &&
      !imageUrl.startsWith("http")
    ) {
      imageUrl =
        "/uploads/" + imageUrl;
    }

    return imageUrl;
  }


  // =====================================================
  // VALIDATION
  // =====================================================

  function validate(): string {
    if (!selectedStore) {
      return "Please select a store";
    }

    if (!title.trim()) {
      return "Please write a headline for your banner";
    }

    if (!description.trim()) {
      return "Please enter a short description";
    }

    if (!categoryName.trim()) {
      return "Please enter a category";
    }

    if (!image) {
      return "Please upload a banner image";
    }

    const validPlan =
      BOOST_PLANS.some(
        (plan: BoostPlan) =>
          plan.id === planId,
      );

    if (!validPlan) {
      return "Please choose a promotion duration";
    }

    return "";
  }


  // =====================================================
  // SUBMIT
  // =====================================================

  async function handleSubmit(
    e?: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    e?.preventDefault();

    const validationError =
      validate();

    if (validationError) {
      alert(validationError);
      return;
    }

    try {
      setSubmitting(true);

      const imageUrl =
        await uploadBannerImage();

      const response =
        await sellerPromotionApi.createPromotion({
          storeId: selectedStore,
          title: title.trim(),
          description: description.trim(),
          ctaLabel:
            ctaLabel.trim() ||
            "Visit Store",
          categoryName:
            categoryName.trim(),
          image: imageUrl,
          planId,
        });

      if (!response.checkoutUrl) {
        throw new Error(
          "The server did not return a checkout URL.",
        );
      }

      window.location.href =
        response.checkoutUrl;
    } catch (error: unknown) {
      console.error(
        "PROMOTION CREATE ERROR:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Failed to start checkout. Please try again.";

      alert(message);

      setSubmitting(false);
    }
  }


  // =====================================================
  // SELECTED PLAN
  // =====================================================

  const selectedPlan:
    | BoostPlan
    | undefined =
    BOOST_PLANS.find(
      (plan: BoostPlan) =>
        plan.id === planId,
    );


  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="seller-page">

      {/* =================================================
          SELLER NAVIGATION
      ================================================= */}

      <div className="seller-header-nav">

        <div
          className="seller-logo"
          onClick={() =>
            navigate("/seller")
          }
        >
          🛒 Seller Center
        </div>

        <div className="seller-nav-links">

          <button
            type="button"
            onClick={() =>
              navigate("/seller")
            }
          >
            Dashboard
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/seller/products")
            }
          >
            Products
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/seller/orders")
            }
          >
            Orders
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/seller/promotions")
            }
          >
            Promotions
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/seller/settings")
            }
          >
            Settings
          </button>

        </div>

      </div>


      {/* =================================================
          TITLE
      ================================================= */}

      <div className="seller-header">

        <h1>
          Boost Your Store
        </h1>

        <p>
          Promote your store with a featured banner.
        </p>

      </div>


      {/* =================================================
          FORM
      ================================================= */}

      <div className="seller-grid">

        <div className="seller-card">

          <h2>
            Create a Boosted Banner
          </h2>


          {/* =================================================
              STORE
          ================================================= */}

          <label>
            Select Store
          </label>

          <select
            value={selectedStore}
            onChange={(e) =>
              setSelectedStore(
                e.target.value,
              )
            }
            required
          >

            <option value="">
              Choose store
            </option>

            {stores.map(
              (store: any) => (

                <option
                  key={String(store._id)}
                  value={String(store._id)}
                >
                  {String(
                    store.name ?? "",
                  )}
                </option>

              ),
            )}

          </select>


          {/* =================================================
              HEADLINE
          ================================================= */}

          <label>
            Banner Headline
          </label>

          <input
            type="text"
            placeholder="e.g. 20% off this week"
            value={title}
            maxLength={70}
            onChange={(e) =>
              setTitle(
                e.target.value,
              )
            }
            required
          />


          {/* =================================================
              DESCRIPTION
          ================================================= */}

          <label>
            Short Description
          </label>

          <textarea
            placeholder="One short line shown under the headline"
            value={description}
            maxLength={120}
            onChange={(e) =>
              setDescription(
                e.target.value,
              )
            }
            required
          />


          {/* =================================================
              CTA
          ================================================= */}

          <label>
            Button Text
          </label>

          <input
            type="text"
            placeholder="Visit Store"
            value={ctaLabel}
            maxLength={24}
            onChange={(e) =>
              setCtaLabel(
                e.target.value,
              )
            }
          />


          {/* =================================================
              CATEGORY
              No Marketplace import.
          ================================================= */}

          <label>
            Promotion Category
          </label>

          <input
            type="text"
            placeholder="e.g. Clothing, Electronics, Beauty"
            value={categoryName}
            maxLength={80}
            onChange={(e) =>
              setCategoryName(
                e.target.value,
              )
            }
            required
          />

          <p className="boost-image-hint">
            Enter the category your promotion belongs to.
          </p>


          {/* =================================================
              IMAGE
          ================================================= */}

          <label>
            Banner Image
          </label>

          <p className="boost-image-hint">
            Recommend a wide photo
            (at least 1200×500px).
          </p>

          <input
            type="file"
            accept="image/*"
            onChange={handleImage}
          />


          {preview && (
            <div
              style={{
                marginTop: "15px",
              }}
            >

              <img
                src={preview}
                alt="Banner preview"
                style={{
                  width: "100%",
                  maxWidth: "420px",
                  aspectRatio: "12 / 5",
                  objectFit: "cover",
                  borderRadius: "10px",
                  display: "block",
                }}
              />

            </div>
          )}


          {/* =================================================
              DURATION
          ================================================= */}

          <div className="section-title">
            Duration
          </div>

          <div className="boost-plan-grid">

            {BOOST_PLANS.map(
              (
                plan: BoostPlan,
              ) => (

                <button
                  type="button"
                  key={plan.id}
                  className={
                    plan.id === planId
                      ? "boost-plan-card boost-plan-card-active"
                      : "boost-plan-card"
                  }
                  onClick={() =>
                    setPlanId(
                      plan.id,
                    )
                  }
                >

                  <strong>
                    {plan.days} days
                  </strong>

                  <span>
                    ${plan.price}
                  </span>

                </button>

              ),
            )}

          </div>


          {/* =================================================
              PLAN SUMMARY
          ================================================= */}

          {selectedPlan && (
            <p className="boost-plan-summary">

              Your banner will run for{" "}
              {selectedPlan.days} days
              for $
              {selectedPlan.price}
              {" "}once payment is confirmed.

            </p>
          )}


          {/* =================================================
              SUBMIT
          ================================================= */}

          <button
            type="button"
            disabled={submitting}
            onClick={() =>
              void handleSubmit()
            }
          >

            {submitting
              ? "Starting checkout..."
              : selectedPlan
                ? `Continue to payment · $${selectedPlan.price}`
                : "Continue to payment"}

          </button>

        </div>

      </div>

    </div>
  );
}