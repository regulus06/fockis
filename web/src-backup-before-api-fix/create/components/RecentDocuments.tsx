import { useCallback, useEffect, useState } from 'react';
import Icon from './Icon';
import documentsApi from '../services/documentsApi';

interface DocumentItem {
  id: string;
  title: string;
  name?: string;
  type?: string;
  updatedAt?: string;
  createdAt?: string;
}

type RawDocument = {
  id?: string;
  _id?: string;
  title?: string;
  name?: string;
  type?: string;
  updatedAt?: string;
  createdAt?: string;
};

type DocumentsResponse =
  | RawDocument[]
  | {
      items?: RawDocument[];
      data?: RawDocument[];
      documents?: RawDocument[];
      results?: RawDocument[];
      total?: number;
      page?: number;
      limit?: number;
      pages?: number;
    };

function extractDocuments(
  response: DocumentsResponse,
): RawDocument[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response.documents)) {
    return response.documents;
  }

  if (Array.isArray(response.items)) {
    return response.items;
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

  if (Array.isArray(response.results)) {
    return response.results;
  }

  return [];
}

function normalizeDocuments(
  response: DocumentsResponse,
): DocumentItem[] {
  return extractDocuments(response)
    .filter(
      (item) => Boolean(item?.id || item?._id),
    )
    .map((item) => ({
      id: String(item.id ?? item._id),
      title:
        item.title ||
        item.name ||
        'Untitled document',
      name: item.name,
      type: item.type,
      updatedAt: item.updatedAt,
      createdAt: item.createdAt,
    }));
}

function formatDate(date?: string) {
  if (!date) {
    return '';
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function RecentDocuments() {
  const [documents, setDocuments] =
    useState<DocumentItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadDocuments = useCallback(
    async (isMounted?: () => boolean) => {
      try {
        setLoading(true);
        setError(null);

        const response =
          await documentsApi.list({
            page: 1,
            limit: 12,
          });

        console.log(
          '[FOCKIS CREATE] Documents response:',
          response,
        );

        const normalized =
          normalizeDocuments(response);

        console.log(
          '[FOCKIS CREATE] Normalized documents:',
          normalized,
        );

        if (
          !isMounted ||
          isMounted()
        ) {
          setDocuments(normalized);
        }
      } catch (err) {
        console.error(
          '[FOCKIS CREATE] Failed to load documents:',
          err,
        );

        if (
          !isMounted ||
          isMounted()
        ) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load documents.',
          );
        }
      } finally {
        if (
          !isMounted ||
          isMounted()
        ) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    let mounted = true;

    void loadDocuments(() => mounted);

    return () => {
      mounted = false;
    };
  }, [loadDocuments]);

  const retry = () => {
    void loadDocuments();
  };

  return (
    <section>
      <div className="wrap">
        <div className="section-head reveal">
          <div>
            <span className="eyebrow">
              Your Workspace
            </span>

            <h2>Recent Documents</h2>

            <p>
              Continue working on documents
              you've recently created or scanned.
            </p>
          </div>
        </div>

        {loading && (
          <div
            className="recent-empty reveal"
            aria-live="polite"
          >
            <Icon id="i-folder" />

            <h3>Loading documents…</h3>

            <p>
              We're loading your workspace.
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          documents.length === 0 && (
            <div className="recent-empty reveal">
              <Icon id="i-folder" />

              <h3>No documents yet</h3>

              <p>
                Scans and documents you create
                will show up here for quick access.
              </p>

              <a
                href="#tools"
                className="btn btn-primary"
              >
                Scan Your First Document
              </a>
            </div>
          )}

        {!loading &&
          !error &&
          documents.length > 0 && (
            <div className="template-grid reveal">
              {documents.map((document) => (
                <article
                  className="template-card"
                  key={document.id}
                >
                  <div
                    className="template-preview"
                    style={{
                      minHeight: 180,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon
                      id="i-folder"
                      style={{
                        width: 42,
                        height: 42,
                      }}
                    />
                  </div>

                  <div className="template-body">
                    <span className="template-brand">
                      FOCKIS
                    </span>

                    <span className="template-cat">
                      {document.type || 'Document'}
                    </span>

                    <h3>
                      {document.title}
                    </h3>

                    {document.updatedAt && (
                      <p>
                        Updated{' '}
                        {formatDate(
                          document.updatedAt,
                        )}
                      </p>
                    )}

                    <a
                      href={`/create/documents/${document.id}`}
                      className="btn btn-primary btn-sm"
                    >
                      Continue Editing
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}

        {!loading && error && (
          <div
            className="recent-empty reveal"
            role="alert"
          >
            <Icon id="i-folder" />

            <h3>
              Unable to load documents
            </h3>

            <p>{error}</p>

            <button
              type="button"
              className="btn btn-primary"
              onClick={retry}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </section>
  );
}