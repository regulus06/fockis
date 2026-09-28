import {
  useEffect,
  useRef,
  useState,
} from "react";

import { storyApi } from "../../../api/storyApi";
import { sellerApi } from "../services/sellerApi";

import "../styles/SellerStoriesPage.scss";

const API =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000";

/* =========================================================
   TYPES
========================================================= */

interface SellerProduct {
  _id?: string;
  id?: string;

  name?: string;
  description?: string;

  price?: number;
  discountPrice?: number;

  images?: string[];

  seller?:
    | string
    | {
        _id?: string;
        id?: string;
      };

  sellerId?: string;

  storeId?: string;
}

/* =========================================================
   ICONS
========================================================= */

type IconProps = {
  size?: number;
};

const IconImage = ({
  size = 15,
}: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect
      x="3"
      y="4"
      width="18"
      height="16"
      rx="2"
    />

    <circle
      cx="9"
      cy="10"
      r="1.8"
    />

    <path d="m21 16-5.5-5.5L4 21" />
  </svg>
);

const IconUpload = ({
  size = 26,
}: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 16V4m0 0-4 4m4-4 4 4" />
    <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </svg>
);

const IconEye = ({
  size = 18,
}: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />

    <circle
      cx="12"
      cy="12"
      r="3"
    />
  </svg>
);

const IconSpark = ({
  size = 13,
}: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
  >
    <path d="M12 2l1.8 5.9L20 10l-6.2 2.1L12 18l-1.8-5.9L4 10l6.2-2.1L12 2Z" />
  </svg>
);

const IconStore = ({
  size = 18,
}: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 10v10h16V10" />

    <path d="M3 10 5 4h14l2 6" />

    <path d="M3 10c0 1.2 1 2 2.2 2 1 0 1.8-.5 2.3-1.3C8 11.5 9 12 10 12s2-.5 2.5-1.3C13 11.5 14 12 15 12s2-.5 2.5-1.3c.5.8 1.3 1.3 2.3 1.3 1.2 0 2.2-.8 2.2-2" />
  </svg>
);

const IconCheck = ({
  size = 18,
}: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m5 12 4 4L19 6" />
  </svg>
);

/* =========================================================
   HELPERS
========================================================= */

function getProductId(
  product: SellerProduct,
): string | null {
  return (
    product._id ||
    product.id ||
    null
  );
}

function getSellerId(
  product: SellerProduct,
): string | null {
  if (
    typeof product.seller ===
    "string"
  ) {
    return product.seller;
  }

  if (
    product.seller &&
    typeof product.seller ===
      "object"
  ) {
    return (
      product.seller._id ||
      product.seller.id ||
      null
    );
  }

  return (
    product.sellerId ||
    localStorage.getItem("userId") ||
    null
  );
}

function getProductImage(
  product: SellerProduct,
): string {
  const image =
    product.images?.[0];

  if (!image) {
    return "/hero.png";
  }

  if (
    image.startsWith("http")
  ) {
    return image;
  }

  return (
    API +
    (
      image.startsWith("/")
        ? image
        : `/${image}`
    )
  );
}

function getProductPrice(
  product: SellerProduct,
): number {
  return Number(
    product.discountPrice ??
      product.price ??
      0,
  );
}

function getStoryMediaUrl(
  media?: string,
): string {
  if (!media) {
    return "/hero.png";
  }

  if (
    media.startsWith("http")
  ) {
    return media;
  }

  return (
    API +
    (
      media.startsWith("/")
        ? media
        : `/${media}`
    )
  );
}

/* =========================================================
   NORMALIZE PRODUCTS
========================================================= */

function normalizeProducts(
  data: any,
): SellerProduct[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (
    data &&
    Array.isArray(data.products)
  ) {
    return data.products;
  }

  if (
    data &&
    Array.isArray(data.data)
  ) {
    return data.data;
  }

  if (
    data &&
    data.data &&
    Array.isArray(data.data.products)
  ) {
    return data.data.products;
  }

  return [];
}

/* =========================================================
   PAGE
========================================================= */

export default function SellerStoriesPage() {
  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const [
    stories,
    setStories,
  ] = useState<any[]>([]);

  const [
    products,
    setProducts,
  ] = useState<SellerProduct[]>([]);

  const [
    selectedProduct,
    setSelectedProduct,
  ] =
    useState<SellerProduct | null>(
      null,
    );

  const [
    image,
    setImage,
  ] = useState<File | null>(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    productsLoading,
    setProductsLoading,
  ] = useState(true);

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    dragActive,
    setDragActive,
  ] = useState(false);

  /* =========================================================
     LOAD
  ========================================================= */

  useEffect(() => {
    loadStories();
    loadProducts();
  }, []);

  async function loadStories() {
    try {
      const data =
        await storyApi.getStories();

      setStories(
        Array.isArray(data)
          ? data
          : [],
      );
    } catch (error) {
      console.error(
        "Stories error:",
        error,
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts() {
    try {
      setProductsLoading(true);

      const data =
        await sellerApi.getMyProducts();

      setProducts(
        normalizeProducts(data),
      );
    } catch (error) {
      console.error(
        "Seller products error:",
        error,
      );

      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }

  /* =========================================================
     SELECT PRODUCT
  ========================================================= */

  function chooseProduct(
    product: SellerProduct,
  ) {
    setSelectedProduct(product);
  }

  /* =========================================================
     OPEN PC GALLERY
     
     ONLY THIS FUNCTION OPENS THE FILE PICKER.
  ========================================================= */

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  /* =========================================================
     CREATE STORY
  ========================================================= */

  async function createStory() {
    if (!selectedProduct) {
      alert(
        "Choose a product for this story.",
      );
      return;
    }

    if (!image) {
      alert(
        "Choose a story image.",
      );
      return;
    }

    const userId =
      localStorage.getItem(
        "userId",
      );

    if (!userId) {
      alert(
        "You must be logged in to create a story.",
      );
      return;
    }

    const productId =
      getProductId(
        selectedProduct,
      );

    if (!productId) {
      alert(
        "This product does not have a valid product ID.",
      );
      return;
    }

    const sellerId =
      getSellerId(
        selectedProduct,
      );

    if (!sellerId) {
      alert(
        "Unable to determine the seller.",
      );
      return;
    }

    try {
      setCreating(true);

      const uploaded =
        await storyApi.uploadStoryMedia(
          image,
        );

      const shopLink =
        `/marketplace/product/${encodeURIComponent(
          productId,
        )}`;

      await storyApi.createStory({
        userId,

        sellerId,

        media:
          uploaded.media,

        type:
          uploaded.type,

        isProductStory: true,

        productId,

        productName:
          selectedProduct.name ||
          "Product",

        productImage:
          selectedProduct.images?.[0] ||
          null,

        price:
          getProductPrice(
            selectedProduct,
          ),

        shopLink,
      });

      setImage(null);

      setSelectedProduct(null);

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }

      alert(
        "Story created successfully.",
      );

      await loadStories();
    } catch (error) {
      console.error(
        "Failed creating story:",
        error,
      );

      alert(
        "Failed creating story.",
      );
    } finally {
      setCreating(false);
    }
  }

  /* =========================================================
     DROP
  ========================================================= */

  function handleDrop(
    e: React.DragEvent<HTMLDivElement>,
  ) {
    e.preventDefault();

    setDragActive(false);

    const file =
      e.dataTransfer.files?.[0];

    if (file) {
      setImage(file);
    }
  }

  /* =========================================================
     FILE SELECT
  ========================================================= */

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      e.target.files?.[0] ||
      null;

    setImage(file);
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="ali-stories">
      <main className="ali-main">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="ali-page-head">

          <span className="eyebrow">
            <IconSpark />
            Marketing
          </span>

          <h1>
            Seller stories
          </h1>

          <p>
            Share visual updates
            that promote your
            products.
          </p>

        </div>

        {/* =====================================================
            CREATE STORY
        ===================================================== */}

        <div className="ali-card ali-upload-card">

          <h2>
            Create story
          </h2>

          <p>
            Choose one of your
            products and upload a
            story image.
          </p>

          {/* ===================================================
              PRODUCT SELECTOR
          =================================================== */}

          <div className="seller-story-products">

            <div className="seller-story-products-head">

              <div>

                <h3>
                  Choose product
                </h3>

                <span>
                  Select the product
                  shoppers should see.
                </span>

              </div>

              <IconStore />

            </div>

            {productsLoading && (
              <div className="seller-story-products-loading">
                Loading your products...
              </div>
            )}

            {!productsLoading &&
              products.length === 0 && (
                <div className="ali-empty">

                  <div className="ali-empty-icon">
                    <IconStore
                      size={28}
                    />
                  </div>

                  <p>
                    No products found
                  </p>

                  <span>
                    Create a product in
                    your Seller Center
                    before creating a
                    product story.
                  </span>

                </div>
              )}

            {!productsLoading &&
              products.length > 0 && (
                <div className="seller-story-product-grid">

                  {products.map(
                    (
                      product,
                      index,
                    ) => {

                      const id =
                        getProductId(
                          product,
                        );

                      const isSelected =
                        selectedProduct
                          ? getProductId(
                              selectedProduct,
                            ) === id
                          : false;

                      return (
                        <button
                          key={
                            id ||
                            `product-${index}`
                          }
                          type="button"
                          className={
                            "seller-story-product" +
                            (isSelected
                              ? " is-selected"
                              : "")
                          }
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();

                            chooseProduct(
                              product,
                            );
                          }}
                        >

                          <div className="seller-story-product-image">

                            <img
                              src={getProductImage(
                                product,
                              )}
                              alt={
                                product.name ||
                                "Product"
                              }
                            />

                            {isSelected && (
                              <span className="seller-story-product-check">
                                <IconCheck />
                              </span>
                            )}

                          </div>

                          <div className="seller-story-product-info">

                            <strong>
                              {product.name ||
                                "Untitled product"}
                            </strong>

                            <span>
                              $
                              {getProductPrice(
                                product,
                              ).toFixed(2)}
                            </span>

                          </div>

                        </button>
                      );
                    },
                  )}

                </div>
              )}

          </div>

          {/* ===================================================
              SELECTED PRODUCT
          =================================================== */}

          {selectedProduct && (
            <div className="seller-story-selected">

              <div className="seller-story-selected-image">

                <img
                  src={getProductImage(
                    selectedProduct,
                  )}
                  alt={
                    selectedProduct.name ||
                    "Selected product"
                  }
                />

              </div>

              <div className="seller-story-selected-info">

                <span>
                  Selected product
                </span>

                <strong>
                  {selectedProduct.name ||
                    "Product"}
                </strong>

                <b>
                  $
                  {getProductPrice(
                    selectedProduct,
                  ).toFixed(2)}
                </b>

              </div>

              <button
                type="button"
                className="seller-story-change"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();

                  setSelectedProduct(
                    null,
                  );
                }}
              >
                Change
              </button>

            </div>
          )}

          {/* ===================================================
              STORY IMAGE UPLOAD
              
              THIS IS THE ONLY AREA THAT OPENS
              THE COMPUTER FILE/GALLERY.
          =================================================== */}

          <div className="seller-story-upload-section">

            <h3>
              Story image
            </h3>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              hidden
              onChange={
                handleFileChange
              }
            />

            <div
              className={
                "dropzone" +
                (dragActive
                  ? " is-active"
                  : "") +
                (image
                  ? " has-file"
                  : "")
              }
              onClick={
                openFilePicker
              }
              onDragOver={(event) => {
                event.preventDefault();
                event.stopPropagation();

                setDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                event.stopPropagation();

                setDragActive(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();

                handleDrop(event);
              }}
            >

              {image ? (
                <>

                  <img
                    src={URL.createObjectURL(
                      image,
                    )}
                    alt="Selected story"
                    className="dropzone-preview"
                  />

                  <span className="dropzone-filename">
                    {image.name}
                  </span>

                  <span className="dropzone-change">
                    Click to change image
                  </span>

                </>
              ) : (
                <>

                  <IconUpload />

                  <p>
                    Drag an image here,
                    or click to browse
                  </p>

                  <span>
                    PNG, JPG, or supported
                    story media
                  </span>

                </>
              )}

            </div>

          </div>

          {/* ===================================================
              CREATE
          =================================================== */}

          <button
            type="button"
            className="btn btn-primary"
            onClick={createStory}
            disabled={
              creating ||
              !selectedProduct ||
              !image
            }
          >
            {creating
              ? "Creating story..."
              : "+ Create story"}
          </button>

        </div>

        {/* =====================================================
            STORIES
        ===================================================== */}

        <div className="ali-section-head">

          <h2>
            Your stories
          </h2>

        </div>

        <div className="ali-grid">

          {loading &&
            Array.from({
              length: 4,
            }).map((_, i) => (
              <div
                className="skeleton skeleton-tile"
                key={i}
              />
            ))}

          {!loading &&
            stories.length === 0 && (
              <div className="ali-empty">

                <div className="ali-empty-icon">
                  <IconImage
                    size={28}
                  />
                </div>

                <p>
                  No stories yet
                </p>

                <span>
                  Choose a product and
                  upload your first
                  story above.
                </span>

              </div>
            )}

          {!loading &&
            stories.map(
              (story) => (
                <div
                  className="ali-tile"
                  key={story._id}
                >

                  <img
                    src={getStoryMediaUrl(
                      story.media,
                    )}
                    alt={
                      story.productName ||
                      "Seller story"
                    }
                  />

                  <div className="ali-tile-overlay">

                    <button
                      type="button"
                      className="ali-tile-view"
                      aria-label="View story"
                    >
                      <IconEye
                        size={16}
                      />
                    </button>

                  </div>

                  <span className="ali-tile-tag">
                    {story.isProductStory
                      ? "Product story"
                      : "Seller story"}
                  </span>

                  {story.isProductStory &&
                    story.productName && (
                      <div className="seller-story-tile-product">

                        <strong>
                          {
                            story.productName
                          }
                        </strong>

                        {typeof story.price ===
                          "number" && (
                          <span>
                            $
                            {story.price.toFixed(
                              2,
                            )}
                          </span>
                        )}

                      </div>
                    )}

                </div>
              ),
            )}

        </div>

      </main>
    </div>
  );
}