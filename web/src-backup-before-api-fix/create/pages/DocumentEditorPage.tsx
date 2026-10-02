import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import documentsApi from "../services/documentsApi";

interface DocumentData {
  id?: string;
  _id?: string;
  title?: string;
  name?: string;
  type?: string;
  content?: unknown;
  elements?: unknown[];
  updatedAt?: string;
}

export default function DocumentEditorPage() {
  const navigate = useNavigate();
  const { documentId } = useParams<{
    documentId: string;
  }>();

  const [document, setDocument] =
    useState<DocumentData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [title, setTitle] =
    useState("Untitled Document");

  useEffect(() => {
    let mounted = true;

    const loadDocument = async () => {
      if (!documentId) {
        setError("No document ID was provided.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response =
          await documentsApi.get(documentId);

        const result =
          response as DocumentData;

        if (!mounted) {
          return;
        }

        setDocument(result);

        setTitle(
          result.title ||
            result.name ||
            "Untitled Document",
        );
      } catch (err) {
        console.error(
          "[FOCKIS CREATE] Failed to load document:",
          err,
        );

        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load document.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadDocument();

    return () => {
      mounted = false;
    };
  }, [documentId]);

  const handleSave = async () => {
    if (!documentId) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await documentsApi.update(
        documentId,
        {
          title,
          name: title,
        },
      );

      setDocument((current) =>
        current
          ? {
              ...current,
              title,
              name: title,
            }
          : current,
      );
    } catch (err) {
      console.error(
        "[FOCKIS CREATE] Failed to save document:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save document.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
        }}
      >
        <div>
          <h2>Loading document…</h2>
          <p>
            Please wait while your document is
            opened.
          </p>
        </div>
      </main>
    );
  }

  if (error && !document) {
    return (
      <main
        style={{
          minHeight: "100vh",
          padding: 40,
        }}
      >
        <div
          style={{
            maxWidth: 700,
            margin: "0 auto",
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/create")}
          >
            ← Back to Create
          </button>

          <div
            role="alert"
            style={{
              marginTop: 30,
              padding: 20,
              borderRadius: 10,
              background: "#fef3f2",
              color: "#b42318",
            }}
          >
            <h2>Unable to open document</h2>
            <p>{error}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fa",
      }}
    >
      <header
        style={{
          minHeight: 70,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
          padding: "0 24px",
          background: "#ffffff",
          borderBottom:
            "1px solid #e4e7ec",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/create")}
          >
            ← Back
          </button>

          <div>
            <strong>FOCKIS CREATE</strong>
            <div
              style={{
                fontSize: 12,
                color: "#667085",
              }}
            >
              Document Editor
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-gold"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </header>

      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: 32,
        }}
      >
        {error && (
          <div
            role="alert"
            style={{
              marginBottom: 20,
              padding: 12,
              borderRadius: 8,
              background: "#fef3f2",
              color: "#b42318",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 1fr) 300px",
            gap: 24,
          }}
        >
          <section
            style={{
              background: "#ffffff",
              minHeight: 700,
              borderRadius: 12,
              padding: 40,
              boxShadow:
                "0 2px 10px rgba(0,0,0,.06)",
            }}
          >
            <input
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              aria-label="Document title"
              style={{
                width: "100%",
                border: 0,
                outline: 0,
                fontSize: 28,
                fontWeight: 700,
                marginBottom: 30,
                boxSizing: "border-box",
              }}
            />

            <div
              contentEditable
              suppressContentEditableWarning
              style={{
                minHeight: 550,
                padding: 24,
                border:
                  "1px solid #e4e7ec",
                borderRadius: 8,
                outline: "none",
                lineHeight: 1.7,
              }}
            >
              Start writing your document here…
            </div>
          </section>

          <aside
            style={{
              background: "#ffffff",
              borderRadius: 12,
              padding: 24,
              height: "fit-content",
              boxShadow:
                "0 2px 10px rgba(0,0,0,.06)",
            }}
          >
            <h3>Document</h3>

            <p>
              <strong>Type:</strong>{" "}
              {document?.type || "Document"}
            </p>

            <p>
              <strong>ID:</strong>{" "}
              {documentId}
            </p>

            <hr />

            <button
              type="button"
              className="btn btn-secondary"
              style={{
                width: "100%",
                marginBottom: 10,
              }}
              onClick={() =>
                navigate("/create/scan")
              }
            >
              Scan Document
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              style={{
                width: "100%",
              }}
              onClick={() =>
                navigate("/create")
              }
            >
              Back to Create
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}