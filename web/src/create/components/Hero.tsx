import { useState } from 'react';
import documentsApi from '../services/documentsApi';

export default function Hero() {
  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const createSomething = async () => {
    setLoading(true);
    setError(null);

    try {
      const document =
        await documentsApi.create({
          title: 'Untitled Document',
          name: 'Untitled Document',
          type: 'document',
          elements: [],
        });

      const documentId = document.id;

      if (!documentId) {
        throw new Error(
          'The API did not return a document ID.',
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
    <section
      className="hero"
      id="top"
    >
      <div className="wrap hero-inner">
        <div>
          <span className="hero-eyebrow">
            FOCKIS CREATE
          </span>

          <h1>
            Design, scan, edit and organize{' '}
            <em>everything</em> in one place.
          </h1>

          <p className="lede">
            Create professional documents,
            graphics, business materials and
            digital content using simple,
            powerful tools.
          </p>

          <p className="desc">
            Built for students, faculty,
            staff and organizations who need
            work that looks finished — not just
            fast.
          </p>

          <div className="hero-ctas">
            <button
              type="button"
              className="btn btn-gold"
              disabled={loading}
              onClick={() =>
                void createSomething()
              }
            >
              {loading
                ? 'Creating…'
                : 'Create Something'}
            </button>

            <a
              href="#tools"
              className="btn btn-secondary"
            >
              Scan a Document
            </a>
          </div>

          {error && (
            <p
              role="alert"
              style={{
                marginTop: 12,
                color:
                  'var(--danger, #b42318)',
              }}
            >
              {error}
            </p>
          )}
        </div>

        <div
          className="hero-visual"
          aria-hidden="true"
        >
          <div className="stack-card c1">
            <div className="bar" />
            <div className="bar short" />
            <div className="bar gold" />
          </div>

          <div className="stack-card c2">
            <div className="bar" />
            <div className="bar" />
            <div className="bar short" />
          </div>

          <div className="stack-card c3">
            <div className="bar" />
            <div className="bar short" />
            <div className="bar gold" />
          </div>

          <div className="seal">
            <span className="seal-text">
              FCK
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}