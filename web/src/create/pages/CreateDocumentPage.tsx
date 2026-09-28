import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import documentsApi from '../services/documentsApi';

interface CreatedDocument {
  _id?: string;
  id?: string;

  document?: {
    _id?: string;
    id?: string;
  };
}

export default function CreateDocumentPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDocument = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        title: 'Untitled Document',
        name: 'Untitled Document',
        type: 'document',
        elements: [],
      };

      console.log(
        '[FOCKIS CREATE] Creating document:',
        payload,
      );

      const response =
        await documentsApi.create(payload);

      console.log(
        '[FOCKIS CREATE] Created document:',
        response,
      );

      const created =
        response as CreatedDocument;

      const documentId =
        created._id ??
        created.id ??
        created.document?._id ??
        created.document?.id;

      if (!documentId) {
        console.error(
          '[FOCKIS CREATE] Invalid create response:',
          response,
        );

        throw new Error(
          'The API did not return a document ID.',
        );
      }

      console.log(
        '[FOCKIS CREATE] Navigating to document:',
        documentId,
      );

      navigate(
        `/create/documents/${documentId}`,
      );
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
    <main className="create-document-page">
      <div className="create-document-page__inner">
        <div className="create-document-page__header">
          <span className="create-document-page__eyebrow">
            FOCKIS CREATE
          </span>

          <h1>Create a document</h1>

          <p>
            Start with a blank document and begin
            creating your content.
          </p>
        </div>

        <div className="create-document-page__actions">
          <button
            type="button"
            onClick={() => void createDocument()}
            disabled={loading}
            className="btn btn-gold"
          >
            {loading
              ? 'Creating…'
              : 'Create Blank Document'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/create')}
            className="btn btn-secondary"
            disabled={loading}
          >
            Back to Create
          </button>
        </div>

        {error && (
          <p
            role="alert"
            style={{
              marginTop: 16,
              color: 'var(--danger, #b42318)',
            }}
          >
            {error}
          </p>
        )}
      </div>
    </main>
  );
}