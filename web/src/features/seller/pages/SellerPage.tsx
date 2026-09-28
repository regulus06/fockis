import { useEffect, useState } from "react";

import { sellerApi } from "../services/sellerApi";

import styles from "../styles/SellerPage.module.scss";

/* =========================================================
   TYPES
========================================================= */

export type SellerProduct = {
  _id: string;
  name?: string;
  title?: string;
  description?: string;
  price?: number;
  salePrice?: number;
  stock?: number;
  images?: string[];
  imageUrl?: string;
  thumbnail?: string;
  category?: string;
  status?: string;
};

type Seller = {
  _id: string;
  name?: string;
  username?: string;
  avatarUrl?: string;
  profilePicture?: string;
  location?: string;
  verified?: boolean;
  followerCount?: number;
  responseTime?: string;
};

export interface SellerPageProps {
  sellerId: string;

  onSelectProduct?: (
    product: SellerProduct
  ) => void;
}

/* =========================================================
   SELLER PRODUCT CARD
========================================================= */

function SellerProductCard({
  product,
}: {
  product: SellerProduct;
}) {
  const productName =
    product.name ||
    product.title ||
    "Product";

  const productImage =
    product.images?.[0] ||
    product.imageUrl ||
    product.thumbnail ||
    "/placeholder-product.png";

  const price =
    Number(
      product.salePrice ??
      product.price ??
      0
    );

  return (
    <div className={styles.productCard}>
      <div className={styles.productImageWrap}>
        <img
          src={productImage}
          alt={productName}
          className={styles.productImage}
          onError={(event) => {
            event.currentTarget.src =
              "/placeholder-product.png";
          }}
        />
      </div>

      <div className={styles.productInfo}>
        <h3 className={styles.productName}>
          {productName}
        </h3>

        {product.category && (
          <span className={styles.productCategory}>
            {product.category}
          </span>
        )}

        <div className={styles.productBottom}>
          <strong className={styles.productPrice}>
            $
            {price.toLocaleString(
              "en-US",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}
          </strong>

          {product.stock !== undefined && (
            <span className={styles.productStock}>
              {product.stock > 0
                ? `${product.stock} in stock`
                : "Out of stock"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

const SellerPage = ({
  sellerId,
  onSelectProduct,
}: SellerPageProps) => {
  const [
    seller,
    setSeller,
  ] = useState<Seller | null>(null);

  const [
    products,
    setProducts,
  ] = useState<SellerProduct[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    messageSent,
    setMessageSent,
  ] = useState(false);

  const [
    contactMessage,
    setContactMessage,
  ] = useState("");

  const [
    isSending,
    setIsSending,
  ] = useState(false);

  const [
    contactError,
    setContactError,
  ] = useState<string | null>(null);

  /* =======================================================
     LOAD SELLER
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    const loadSeller = async () => {
      try {
        setIsLoading(true);

        const [
          sellerData,
          productData,
        ] = await Promise.all([
          sellerApi.getSellerProfile(
            sellerId
          ),

          sellerApi.getSellerProducts(
            sellerId
          ),
        ]);

        if (!mounted) {
          return;
        }

        setSeller(
          sellerData ?? null
        );

        setProducts(
          Array.isArray(productData)
            ? productData
            : []
        );
      } catch (error) {
        console.error(
          "Failed to load seller:",
          error
        );

        if (mounted) {
          setSeller(null);
          setProducts([]);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadSeller();

    return () => {
      mounted = false;
    };
  }, [sellerId]);

  /* =======================================================
     CONTACT SELLER
  ======================================================= */

  const handleContact = async () => {
    const trimmedMessage =
      contactMessage.trim();

    if (!trimmedMessage) {
      setContactError(
        "Please enter a message before contacting the seller."
      );

      return;
    }

    setContactError(null);
    setMessageSent(false);
    setIsSending(true);

    try {
      await sellerApi.contactSeller(
        sellerId,
        trimmedMessage
      );

      setMessageSent(true);
      setContactMessage("");
    } catch (error) {
      console.error(
        "Contact seller error:",
        error
      );

      setContactError(
        "Something went wrong sending your message. Please try again."
      );
    } finally {
      setIsSending(false);
    }
  };

  /* =======================================================
     LOADING
  ======================================================= */

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          Loading shop…
        </div>
      </div>
    );
  }

  /* =======================================================
     SELLER NOT FOUND
  ======================================================= */

  if (!seller) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          This seller could not be found.
        </div>
      </div>
    );
  }

  /* =======================================================
     SELLER INFO
  ======================================================= */

  const sellerName =
    seller.name ??
    seller.username ??
    "Seller";

  const sellerImage =
    seller.avatarUrl ??
    seller.profilePicture ??
    "/default-avatar.png";

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className={styles.page}>
      {/* ===================================================
          SELLER BANNER
      =================================================== */}

      <div className={styles.banner}>
        <div className={styles.bannerContent}>
          <img
            src={sellerImage}
            alt={sellerName}
            className={styles.bannerAvatar}
            onError={(event) => {
              event.currentTarget.src =
                "/default-avatar.png";
            }}
          />

          <div>
            <h1
              className={
                styles.bannerName
              }
            >
              {sellerName}

              {seller.verified && (
                <span
                  className={
                    styles.verifiedBadge
                  }
                >
                  ✓ Verified
                </span>
              )}
            </h1>

            <p
              className={
                styles.bannerMeta
              }
            >
              {seller.location ??
                "Location unavailable"}

              {" · "}

              {seller.followerCount !==
              undefined
                ? `${seller.followerCount.toLocaleString()} followers`
                : "Followers unavailable"}

              {" · "}

              {products.length} listings
            </p>

            {/* ============================================
                CONTACT SELLER
            ============================================ */}

            <div
              className={
                styles.contactBox
              }
            >
              <textarea
                className={
                  styles.contactInput
                }
                placeholder={`Message ${sellerName}...`}
                value={contactMessage}
                onChange={(event) =>
                  setContactMessage(
                    event.target.value
                  )
                }
                rows={2}
                disabled={isSending}
              />

              <button
                type="button"
                className={
                  styles.contactButton
                }
                onClick={
                  handleContact
                }
                disabled={isSending}
              >
                {isSending
                  ? "Sending…"
                  : "Contact Seller"}
              </button>
            </div>

            {contactError && (
              <p
                className={
                  styles.errorNote
                }
              >
                {contactError}
              </p>
            )}

            {messageSent && (
              <p
                className={
                  styles.sentNote
                }
              >
                Message sent
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ===================================================
          PRODUCTS
      =================================================== */}

      <div
        className={
          styles.productsPanel
        }
      >
        <h2
          className={
            styles.productsTitle
          }
        >
          Products from this seller
        </h2>

        {products.length === 0 ? (
          <p
            className={
              styles.emptyNote
            }
          >
            This seller doesn't have any
            active listings right now.
          </p>
        ) : (
          <div className={styles.grid}>
            {products.map(
              (product) => (
                <div
                  key={product._id}
                  onClick={() =>
                    onSelectProduct?.(
                      product
                    )
                  }
                  style={{
                    cursor:
                      onSelectProduct
                        ? "pointer"
                        : "default",
                  }}
                >
                  <SellerProductCard
                    product={product}
                  />
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerPage;