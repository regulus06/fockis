import React, {
  useState,
} from "react";
import {
  ImagePlus,
  X,
} from "lucide-react";

interface PropertyImageUploadProps {
  value?: string[];
  onChange?: (images: string[]) => void;
}

const PropertyImageUpload: React.FC<
  PropertyImageUploadProps
> = ({
  value = [],
  onChange,
}) => {
  const [images, setImages] =
    useState<string[]>(value);

  const addImages = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(
      event.target.files || [],
    );

    const urls = files.map((file) =>
      URL.createObjectURL(file),
    );

    const next = [...images, ...urls];

    setImages(next);
    onChange?.(next);
  };

  const remove = (index: number) => {
    const next = images.filter(
      (_, imageIndex) =>
        imageIndex !== index,
    );

    setImages(next);
    onChange?.(next);
  };

  return (
    <div className="re-image-upload">
      <label className="re-upload-box">
        <ImagePlus size={32} />

        <strong>
          Add property photos
        </strong>

        <span>
          PNG, JPG or supported image
          files
        </span>

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={addImages}
        />
      </label>

      {images.length > 0 && (
        <div className="re-upload-grid">
          {images.map(
            (image, index) => (
              <div
                key={image}
                className="re-upload-image"
              >
                <img
                  src={image}
                  alt=""
                />

                <button
                  type="button"
                  onClick={() =>
                    remove(index)
                  }
                >
                  <X size={14} />
                </button>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
};

export default PropertyImageUpload;