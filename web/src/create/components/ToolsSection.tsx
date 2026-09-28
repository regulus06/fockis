import { useRef, useState } from 'react';
import Icon from './Icon';
import tools from '../data/tools';
import scannerApi from '../services/scannerApi';
import ocrApi from '../services/ocrApi';
import pdfApi from '../services/pdfApi';

interface ToolResult {
  documentId?: string;
  id?: string;
  _id?: string;
  document?: {
    id?: string;
    _id?: string;
  };
}

function getDocumentId(result: unknown): string | undefined {
  const data = result as ToolResult | null | undefined;

  return (
    data?.documentId ||
    data?.document?.id ||
    data?.document?._id ||
    data?.id ||
    data?._id
  );
}

export default function ToolsSection() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTool, setActiveTool] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const handleTool = (title: string) => {
    const normalized = title.toLowerCase();

    setError(null);

    if (
      normalized.includes('scan') ||
      normalized.includes('scanner')
    ) {
      setActiveTool(title);
      fileInputRef.current?.click();
      return;
    }

    if (
      normalized.includes('ocr') ||
      normalized.includes('text')
    ) {
      setActiveTool(title);
      fileInputRef.current?.click();
      return;
    }

    if (normalized.includes('pdf')) {
      void handlePdf(title);
      return;
    }

    setError(
      `${title} is ready for connection, but this tool does not require a file yet.`,
    );
  };

  const handleFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file || !activeTool) {
      return;
    }

    const normalized =
      activeTool.toLowerCase();

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();

      formData.append('file', file);

      let result: unknown;

      if (
        normalized.includes('ocr') ||
        normalized.includes('text')
      ) {
        result = await ocrApi.process(formData);
      } else {
        result = await scannerApi.scan(formData);
      }

      const documentId =
        getDocumentId(result);

      if (!documentId) {
        console.log(
          '[FOCKIS CREATE] Tool result:',
          result,
        );

        throw new Error(
          'The tool completed, but no document ID was returned.',
        );
      }

      window.location.href =
        `/create/documents/${documentId}`;
    } catch (err) {
      console.error(
        '[FOCKIS CREATE] Tool failed:',
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : `Unable to run ${activeTool}.`,
      );
    } finally {
      setLoading(false);
      setActiveTool(null);
    }
  };

  const handlePdf = async (
    title: string,
  ) => {
    setLoading(true);
    setActiveTool(title);
    setError(null);

    try {
      const result =
        await pdfApi.create({
          title,
          type: 'pdf',
        });

      const documentId =
        getDocumentId(result);

      if (!documentId) {
        throw new Error(
          'The PDF was created, but no document ID was returned.',
        );
      }

      window.location.href =
        `/create/documents/${documentId}`;
    } catch (err) {
      console.error(
        '[FOCKIS CREATE] PDF creation failed:',
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to create PDF.',
      );
    } finally {
      setLoading(false);
      setActiveTool(null);
    }
  };

  return (
    <section id="tools">
      <div className="wrap">
        <div className="section-head reveal">
          <div>
            <span className="eyebrow">
              Document Tools
            </span>

            <h2>What do you need?</h2>

            <p>
              Quickly scan, convert and organize
              important documents from your phone
              or computer.
            </p>
          </div>
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

        <div className="tool-grid reveal">
          {tools.map((tool) => {
            const isActive =
              loading &&
              activeTool === tool.title;

            return (
              <button
                type="button"
                className="tool-card"
                aria-label={tool.label}
                key={tool.title}
                disabled={loading}
                onClick={() =>
                  handleTool(tool.title)
                }
              >
                <span className="tool-icon">
                  <Icon id={tool.icon} />
                </span>

                <h3>{tool.title}</h3>

                <p>{tool.desc}</p>

                <span className="action">
                  {isActive
                    ? 'Opening…'
                    : 'Open Tool'}

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