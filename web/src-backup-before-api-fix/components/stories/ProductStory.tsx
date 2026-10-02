import "./ProductStory.scss";

import { useNavigate } from "react-router-dom";

interface ProductStoryData {
  _id?: string;

  userId?: string;

  username?: string;

  avatar?: string | null;

  media?: string;

  type?: "image" | "video";

  isProductStory?: boolean;

  productId?: string | null;

  productName?: string | null;

  productImage?: string | null;

  price?: number | null;

  shopLink?: string | null;

  sellerId?: string | null;
}

interface ProductStoryProps {
  story: ProductStoryData;
}

const API_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000";


export default function ProductStory({
  story,
}: ProductStoryProps) {

  const navigate =
    useNavigate();


  /* ============================================================
     MEDIA URL
  ============================================================ */

  const mediaUrl = (
    url?: string | null,
  ): string => {

    if (!url) {
      return "";
    }


    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("blob:")
    ) {
      return url;
    }


    if (url.startsWith("/")) {
      return `${API_URL}${url}`;
    }


    return `${API_URL}/${url}`;
  };


  /* ============================================================
     OPEN PRODUCT
  ============================================================ */

  const handleProductClick = () => {

    if (!story.productId) {
      return;
    }


    navigate(
      `/marketplace/product/${story.productId}`,
    );

  };


  /* ============================================================
     SHOP NOW
  ============================================================ */

  const handleShopNow = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {

    event.stopPropagation();


    if (!story.shopLink) {
      return;
    }


    if (
      story.shopLink.startsWith(
        "http://",
      ) ||
      story.shopLink.startsWith(
        "https://",
      )
    ) {

      window.location.href =
        story.shopLink;

      return;

    }


    navigate(
      story.shopLink,
    );

  };


  const media =
    mediaUrl(
      story.media,
    );


  const avatar =
    mediaUrl(
      story.avatar,
    );


  const productImage =
    mediaUrl(
      story.productImage,
    );


  return (

    <div
      className="product-story"
      data-story-id={story._id}
    >

      {/* ========================================================
          STORY MEDIA
      ======================================================== */}

      {story.type === "video" ? (

        <video
          src={media}
          className="product-story-video"
          autoPlay
          muted
          loop
          playsInline
        />

      ) : (

        <img
          src={media}
          className="product-story-image"
          alt={
            story.productName ||
            "Story"
          }
        />

      )}


      {/* ========================================================
          STORY INFORMATION
      ======================================================== */}

      <div className="product-story-info">

        {/* ======================================================
            SELLER / USER
        ====================================================== */}

        <div className="product-story-user">

          {avatar ? (

            <img
              src={avatar}
              alt={
                story.username ||
                "User"
              }
            />

          ) : (

            <div className="product-story-user-placeholder">
              {(
                story.username ||
                "U"
              )
                .charAt(0)
                .toUpperCase()}
            </div>

          )}


          <span>
            {story.username ||
              "User"}
          </span>

        </div>


        {/* ======================================================
            PRODUCT
        ====================================================== */}

        {story.productId && (

          <div className="product-scroll">

            <div
              className="product-item"
              onClick={
                handleProductClick
              }
              role="button"
              tabIndex={0}
              onKeyDown={(
                event,
              ) => {

                if (
                  event.key ===
                    "Enter" ||
                  event.key ===
                    " "
                ) {

                  event.preventDefault();

                  handleProductClick();

                }

              }}
            >

              {productImage && (

                <img
                  src={productImage}
                  alt={
                    story.productName ||
                    "Product"
                  }
                />

              )}


              <div className="product-item-info">

                <h4>
                  {story.productName ||
                    "View Product"}
                </h4>


                {story.price !==
                  null &&
                  story.price !==
                    undefined && (

                  <p>
                    $
                    {Number(
                      story.price,
                    ).toFixed(2)}
                  </p>

                )}

              </div>

            </div>

          </div>

        )}


        {/* ======================================================
            SHOP NOW
        ====================================================== */}

        {story.shopLink && (

          <button
            type="button"
            className="shop-now"
            onClick={
              handleShopNow
            }
          >
            Shop Now
          </button>

        )}

      </div>

    </div>

  );
}