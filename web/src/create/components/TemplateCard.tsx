import { useState } from 'react';
import TemplatePreview from './TemplatePreview';
import type { Template } from '../types/createTypes';
import documentsApi from '../services/documentsApi';

interface TemplateCardProps {
  template: Template;
}

export default function TemplateCard({
  template,
}: TemplateCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUseTemplate = async () => {
    setLoading(true);
    setError(null);

    try {
      const templateId =
        (template as any).id ||
        (template as any)._id;

      if (!templateId) {
        throw new Error(
          'This template does not have a backend ID.',
        );
      }

      const document = await documentsApi.create({
        title:
          template.title ||
          'Untitled Document',

        name:
          template.title ||
          'Untitled Document',

        type: 'template',

        templateId,

        elements:
          (template as any).elements || [],

        metadata: {
          templateId,
          templateCategory:
            (template as any).category,
        },
      });

      const documentId =
        document?.id ||
        (document as any)?._id;

      if (!documentId) {
        throw new Error(
          'The API created the document but did not return its ID.',
        );
      }

      window.location.href =
        `/create/documents/${documentId}`;
    } catch (err) {
      console.error(
        '[FOCKIS CREATE] Failed to use template:',
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to use this template.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <article
      className="template-card"
      data-cat={(template as any).cat}
    >
      <div
        style={{
          position: 'relative',
        }}
      >
        <TemplatePreview
          preview={template.preview}
        />

        <div className="use-overlay">
          <button
            type="button"
            className="btn btn-gold btn-sm"
            disabled={loading}
            onClick={() =>
              void handleUseTemplate()
            }
          >
            {loading
              ? 'Creating…'
              : 'Use Template'}
          </button>
        </div>
      </div>

      <div className="template-body">
        <span className="template-brand">
          FOCKIS
        </span>

        <span className="template-cat">
          {(template as any).category ||
            (template as any).cat ||
            'Template'}
        </span>

        <h3>
          {template.title ||
            'Untitled Template'}
        </h3>

        <p>
          Create something remarkable
        </p>

        {error && (
          <p
            role="alert"
            style={{
              color:
                'var(--danger, #b42318)',
              fontSize: 12,
            }}
          >
            {error}
          </p>
        )}
      </div>
    </article>
  );
}