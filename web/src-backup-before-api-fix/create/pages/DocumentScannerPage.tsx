import {
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import scannerApi from "../services/scannerApi";

export default function DocumentScannerPage() {
  const navigate = useNavigate();

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [file, setFile] =
    useState<File | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selected =
      event.target.files?.[0];

    if (!selected) {
      return;
    }

    setFile(selected);
    setError(null);
  };

  const handleScan = async () => {
    if (!file) {
      setError(
        "Please select an image or PDF first.",
      );
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();

      formData.append("file", file);

      const response =
        await scannerApi.scan(formData);

      const result = response as {
        documentId?: string;
        document?: {
          id?: string;
          _id?: string;
        };
        id?: string;
        _id?: string;
      };

      const documentId =
        result.documentId ||
        result.document?.id ||
        result.document?._id ||
        result.id ||
        result._id;

      if (documentId) {
        navigate(
          `/create/documents/${documentId}`,
        );
        return;
      }

      setError(
        "The scan completed, but no document ID was returned.",
      );
    } catch (err) {
      console.error(
        "[FOCKIS CREATE] Scan failed:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to scan this file.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "60px 24px",
        background: "#f5f7fa",
      }}
    >
      <div
        style={{
          maxWidth: 850,
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

        <section
          style={{
            marginTop: 30,
            background: "#ffffff",
            borderRadius: 14,
            padding: 40,
            textAlign: "center",
            boxShadow:
              "0 4px 20px rgba(0,0,0,.06)",
          }}
        >
          <span className="eyebrow">
            FOCKIS SCANNER
          </span>

          <h1>Scan a Document</h1>

          <p>
            Upload an image or PDF and turn it
            into an editable FOCKIS document.
          </p>

          <div
            style={{
              marginTop: 30,
              padding: 40,
              border: "2px dashed #d0d5dd",
              borderRadius: 12,
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,application/pdf"
              onChange={handleFileChange}
              hidden
            />

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                fileInputRef.current?.click()
              }
            >
              Choose File
            </button>

            {file && (
              <div style={{ marginTop: 20 }}>
                <strong>{file.name}</strong>

                <p
                  style={{
                    color: "#667085",
                    fontSize: 14,
                  }}
                >
                  {(
                    file.size /
                    1024 /
                    1024
                  ).toFixed(2)}{" "}
                  MB
                </p>
              </div>
            )}
          </div>

          {error && (
            <div
              role="alert"
              style={{
                marginTop: 20,
                padding: 12,
                borderRadius: 8,
                background: "#fef3f2",
                color: "#b42318",
                textAlign: "left",
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 12,
              marginTop: 25,
            }}
          >
            <button
              type="button"
              className="btn btn-gold"
              disabled={!file || loading}
              onClick={() => void handleScan()}
            >
              {loading
                ? "Scanning…"
                : "Scan Document"}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              disabled={loading}
              onClick={() => navigate("/create")}
            >
              Cancel
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}