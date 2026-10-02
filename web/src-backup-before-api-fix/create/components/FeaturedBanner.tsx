import { useState } from 'react';
import documentsApi from '../services/documentsApi';

interface CreateDocumentResponse {
  id?: string;
  _id?: string;
  document?: {
    id?: string;
    _id?: string;
  };
}

export default function FeaturedBanner() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startFromScratch = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = (await documentsApi.create({
        title: 'Untitled Document',
        name: 'Untitled Document',
        type: 'document',
      })) as CreateDocumentResponse;

      const documentId =
        response.id ||
        response._id ||
        response.document?.id ||
        response.document?._id;

      if (!documentId) {
        throw new Error(
          'The API created the document but did not return its ID.',
        );
      }

      window.location.href =
        `/create/documents/${documentId}`;
    } catch (err) {
      console.error(
        '[FOCKIS CREATE] Failed to create document:',
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to create document.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <div className="wrap">
        <div className="featured reveal">
          <div className="featured-copy">
            <span className="eyebrow">
              Create Faster
            </span>

            <h3>
              Start with a professional
              template
            </h3>

            <p>
              Choose a template, customize
              the text and images, and make it
              your own — no design background
              required.
            </p>

            <div className="featured-ctas">
              <a
                href="#templates"
                className="btn btn-gold"
              >
                Browse Templates
              </a>

              <button
                type="button"
                className="btn btn-secondary"
                disabled={loading}
                onClick={() => void startFromScratch()}
              >
                {loading
                  ? 'Creating…'
                  : 'Start From Scratch'}
              </button>
            </div>

            {error && (
              <p
                role="alert"
                style={{
                  marginTop: 12,
                  color: 'var(--danger, #b42318)',
                }}
              >
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}