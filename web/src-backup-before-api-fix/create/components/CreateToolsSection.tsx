import { useRef, useState } from 'react';
import Icon from './Icon';
import createTools from '../data/createTools';
import documentsApi from '../services/documentsApi';
import scannerApi from '../services/scannerApi';

export default function CreateToolsSection() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getDocumentId = (result: any): string | null => {
    return (
      result?.id ||
      result?._id ||
      result?.documentId ||
      result?.document?.id ||
      result?.document?._id ||
      null
    );
  };

  const openDocument = (result: any) => {
    const documentId = getDocumentId(result);

    if (!documentId) {
      throw new Error(
        'The API completed the operation but did not return a document ID.',
      );
    }

    window.location.href = `/create/documents/${documentId}`;
  };

  const createBlankDocument = async (title: string) => {
    setLoading(true);
    setActiveTool(title);
    setError(null);

    try {
      /*
       * Use ONLY fields supported by CreateDocumentPayload.
       *
       * Your existing documentsApi.create() does not accept
       * content or elements.
       */
      const document = await documentsApi.create({
        title,
        name: title,
        type: 'document',
      });

      openDocument(document);
    } catch (err) {
      console.error(
        '[FOCKIS CREATE] Failed to create document:',
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to create the document.',
      );
    } finally {
      setLoading(false);
      setActiveTool(null);
    }
  };

  const handleTool = async (
    tool: (typeof createTools)[number],
  ) => {
    setError(null);

    const title = tool.title.toLowerCase();

    /*
     * Scanner tools use the existing scanner API.
     */
    if (
      title.includes('scan') ||
      title.includes('document scanner')
    ) {
      setActiveTool(tool.title);
      fileInputRef.current?.click();
      return;
    }

    /*
     * Everything else starts a new document using
     * the existing documents API.
     */
    await createBlankDocument(tool.title);
  };

  const handleFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file) {
      setActiveTool(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      /*
       * The existing scannerApi.scan() expects FormData
       * or a Record<string, unknown>, not File directly.
       */
      const formData = new FormData();

      formData.append('file', file);

      const result = await scannerApi.scan(formData);

      openDocument(result);
    } catch (err) {
      console.error(
        '[FOCKIS CREATE] Scan failed:',
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to scan the document.',
      );
    } finally {
      setLoading(false);
      setActiveTool(null);
    }
  };

  return (
    <section className="alt" id="create-tools">
      <div className="wrap">
        <div className="section-head reveal">
          <div>
            <span className="eyebrow">FOCKIS CREATE</span>

            <h2>Design something beautiful</h2>

            <p>
              Create logos, flyers, banners, badges, business
              cards and more using beautiful professional
              templates.
            </p>
          </div>

          <a
            href="#templates"
            className="btn-ghost view-all"
          >
            Explore all templates →
          </a>
        </div>

        {error && (
          <div
            className="fs-error"
            role="alert"
            style={{ marginBottom: 20 }}
          >
            {error}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          hidden
          onChange={handleFile}
        />

        <div className="create-grid reveal">
          {createTools.map((tool) => {
            const isActive =
              loading && activeTool === tool.title;

            return (
              <button
                type="button"
                className="create-card"
                key={tool.title}
                onClick={() => void handleTool(tool)}
                disabled={loading}
                aria-busy={isActive}
              >
                <span className="create-icon">
                  <Icon
                    id={tool.icon}
                    style={{
                      width: 19,
                      height: 19,
                    }}
                  />
                </span>

                <h3>{tool.title}</h3>

                <p>{tool.desc}</p>

                <span className="action">
                  {isActive
                    ? 'Starting…'
                    : 'Start designing'}

                  {!isActive && (
                    <Icon id="i-arrow" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}