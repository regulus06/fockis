import type {
  Advertisement,
} from "../types/marketingTypes";

interface Props {
  ad: Advertisement;
}

export default function AdPreview({
  ad,
}: Props) {
  return (
    <div className="fk-ad-preview">
      {ad.imageUrl && (
        <img
          src={ad.imageUrl}
          alt={
            ad.title ??
            ad.name ??
            "Advertisement"
          }
        />
      )}

      <div className="fk-ad-preview-content">
        <span className="fk-sponsored-label">
          Sponsored
        </span>

        <h3>
          {ad.title ??
            ad.name ??
            "Advertisement"}
        </h3>

        {ad.description && (
          <p>
            {ad.description}
          </p>
        )}

        {ad.destinationUrl && (
          <a
            href={ad.destinationUrl}
            target="_blank"
            rel="noreferrer"
          >
            View destination
          </a>
        )}
      </div>
    </div>
  );
}