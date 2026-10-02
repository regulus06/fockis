import { useState } from "react";

interface Props {
  images: string[];
}

export default function PropertyGallery({
  images = [],
}: Props) {

  const [activeImage, setActiveImage] = useState(
    images[0] || ""
  );


  if (!images.length) {
    return (
      <div className="property-gallery empty">
        <p>No images available</p>
      </div>
    );
  }


  return (

    <section className="property-gallery">

      <div className="main-image">

        <img
          src={activeImage}
          alt="Property"
        />

      </div>


      <div className="thumbnail-list">

        {images.map((image, index) => (

          <button
            key={index}
            className={
              activeImage === image
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveImage(image)
            }
          >

            <img
              src={image}
              alt={`Property ${index + 1}`}
            />

          </button>

        ))}

      </div>


    </section>

  );
}