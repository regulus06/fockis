import { Dispatch, SetStateAction } from 'react';
import { ImagePlus, Plus, X } from 'lucide-react';

import { FormCard } from './FormCard';

interface ImagesSectionProps {
  images: string[];
  imageUrl: string;
  setImageUrl: Dispatch<SetStateAction<string>>;
  onAddImage: () => void;
  onRemoveImage: (url: string) => void;
}

export function ImagesSection({
  images,
  imageUrl,
  setImageUrl,
  onAddImage,
  onRemoveImage,
}: ImagesSectionProps) {
  return (
    <FormCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
        <ImagePlus size={19} />
        <h2 style={{ margin: 0 }}>Listing photos</h2>
      </div>

      <p style={{ marginTop: 5, color: 'var(--slate, #5B6B76)', fontSize: 14 }}>
        Add high-quality image URLs. For vacation rentals, use photos of the exterior, living
        areas, bedrooms, bathrooms, kitchen, amenities, and views.
      </p>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          placeholder="https://example.com/photo.jpg"
        />

        <button type="button" className="btn" onClick={onAddImage}>
          <Plus size={15} />
          Add
        </button>
      </div>

      {images.length > 0 && (
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 15 }}
        >
          {images.map((image) => (
            <div
              key={image}
              style={{
                position: 'relative',
                borderRadius: 10,
                overflow: 'hidden',
                border: '1px solid rgba(15,27,43,0.12)',
              }}
            >
              <img
                src={image}
                alt="Listing"
                style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }}
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />

              <button
                type="button"
                onClick={() => onRemoveImage(image)}
                aria-label="Remove image"
                style={{
                  position: 'absolute',
                  top: 7,
                  right: 7,
                  width: 28,
                  height: 28,
                  border: 0,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.65)',
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </FormCard>
  );
}
