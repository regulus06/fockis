import {
  ChangeEvent,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import AiModelSelector from "../AiModelSelector";
import AiPromptBox from "../AiPromptBox";
import AiGenerationProgress from "../AiGenerationProgress";
import VideoDurationSelector from "./VideoDurationSelector";

import { requiredPrompt } from "../../utils/aiValidation";
import { useAiGeneration } from "../../hooks/useAiGeneration";

const API_BASE = String(
  import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:3000",
).replace(/\/+$/, "");

function getToken(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    ""
  );
}

interface UploadedImage {
  imageGcsUri: string;
  imageMimeType: string;
  previewUrl: string;
  name: string;
}

export default function AiVideoGenerator() {
  const navigate = useNavigate();
  const imageInputRef =
    useRef<HTMLInputElement>(null);

  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(60);
  const [model, setModel] = useState("auto");
  const [error, setError] =
    useState<string>();
  const [uploadingImage, setUploadingImage] =
    useState(false);
  const [image, setImage] =
    useState<UploadedImage>();

  const {
    job,
    loading,
    error: generationError,
    generate,
  } = useAiGeneration();

  async function uploadImage(
    file: File,
  ): Promise<UploadedImage> {
    const token = getToken();

    if (!token) {
      throw new Error(
        "Your session has expired. Please sign in again.",
      );
    }

    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(
      `${API_BASE}/ai/jobs/image-upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: formData,
      },
    );

    const raw = await response.text();

    let data: any = {};

    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          "Image upload failed.",
      );
    }

    if (!data.imageGcsUri) {
      throw new Error(
        "The server did not return an image GCS URI.",
      );
    }

    return {
      imageGcsUri: String(
        data.imageGcsUri,
      ),
      imageMimeType: String(
        data.imageMimeType ||
          file.type ||
          "image/jpeg",
      ),
      previewUrl:
        URL.createObjectURL(file),
      name: file.name,
    };
  }

  async function handleImageChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setError(undefined);
    setUploadingImage(true);

    try {
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
      ];

      if (
        !allowedTypes.includes(
          file.type.toLowerCase(),
        )
      ) {
        throw new Error(
          "Please select a JPEG, PNG, or WebP image.",
        );
      }

      if (
        file.size >
        10 * 1024 * 1024
      ) {
        throw new Error(
          "The starting image must be 10 MB or smaller.",
        );
      }

      if (image?.previewUrl) {
        URL.revokeObjectURL(
          image.previewUrl,
        );
      }

      const uploaded =
        await uploadImage(file);

      setImage(uploaded);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Image upload failed.",
      );
    } finally {
      setUploadingImage(false);

      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  }

  function removeImage() {
    if (image?.previewUrl) {
      URL.revokeObjectURL(
        image.previewUrl,
      );
    }

    setImage(undefined);
  }

  async function handleGenerate() {
    const validation =
      requiredPrompt(prompt);

    if (validation) {
      setError(validation);
      return;
    }

    if (uploadingImage) {
      setError(
        "Please wait for the starting image to finish uploading.",
      );
      return;
    }

    setError(undefined);

    try {
      await generate({
        type: "video",
        prompt: prompt.trim(),
        model,
        options: {
          durationSeconds: duration,
          aspectRatio: "16:9",
          voiceover: true,
          captions: true,
          music: true,
          ...(image
            ? {
                imageGcsUri:
                  image.imageGcsUri,
                imageMimeType:
                  image.imageMimeType,
              }
            : {}),
        },
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Video generation failed.",
      );
    }
  }

  const displayError =
    error || generationError;

  const jobId =
    job && typeof job === "object"
      ? String(
          (job as {
            id?: string;
            _id?: string;
          }).id ??
            (job as {
              id?: string;
              _id?: string;
            })._id ??
            "",
        )
      : "";

  const jobStatus =
    job && typeof job === "object"
      ? String(
          (job as {
            status?: string;
          }).status ?? "",
        ).toLowerCase()
      : "";

  const isCompleted =
    jobStatus === "completed" ||
    jobStatus === "complete" ||
    jobStatus === "succeeded" ||
    jobStatus === "success";

  function handleViewResult() {
    if (!jobId) {
      setError(
        "The video job ID is missing.",
      );
      return;
    }

    navigate(
      `/ai/jobs/${jobId}/media`,
    );
  }

  return (
    <div className="fockis-ai-generator">
      <div className="fockis-ai-generator__controls">
        <AiPromptBox
          value={prompt}
          onChange={setPrompt}
          onSubmit={handleGenerate}
          loading={
            loading ||
            uploadingImage
          }
          placeholder="Describe your video, story, scenes, visual style, audience, and narration…"
        />

        <section
          className="fockis-ai-image-upload"
          aria-label="Starting image"
        >
          <div className="fockis-ai-image-upload__header">
            <div>
              <span className="fockis-ai-image-upload__eyebrow">
                OPTIONAL
              </span>

              <h3>
                🖼️ Start with a photo
              </h3>

              <p>
                Upload a photo and Veo will
                use it as the starting image
                for your video.
              </p>
            </div>
          </div>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={
              handleImageChange
            }
            hidden
          />

          {!image ? (
            <button
              type="button"
              className="fockis-ai-image-upload__button"
              onClick={() =>
                imageInputRef.current?.click()
              }
              disabled={
                loading ||
                uploadingImage
              }
            >
              <span className="fockis-ai-image-upload__icon">
                {uploadingImage
                  ? "⏳"
                  : "📷"}
              </span>

              <span>
                <strong>
                  {uploadingImage
                    ? "Uploading photo..."
                    : "Upload a photo"}
                </strong>

                <small>
                  JPG, PNG, or WebP ·
                  Maximum 10 MB
                </small>
              </span>
            </button>
          ) : (
            <div className="fockis-ai-image-upload__selected">
              <img
                src={image.previewUrl}
                alt={`Selected starting image: ${image.name}`}
              />

              <div className="fockis-ai-image-upload__selected-info">
                <strong>
                  {image.name}
                </strong>

                <span>
                  ✓ Photo uploaded
                </span>

                <small>
                  This photo will guide the
                  first Veo scene.
                </small>
              </div>

              <div className="fockis-ai-image-upload__selected-actions">
                <button
                  type="button"
                  onClick={() =>
                    imageInputRef.current?.click()
                  }
                  disabled={loading}
                >
                  Change
                </button>

                <button
                  type="button"
                  onClick={removeImage}
                  disabled={loading}
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </section>

        <div className="fockis-ai-inline-fields">
          <VideoDurationSelector
            value={duration}
            onChange={setDuration}
          />

          <AiModelSelector
            value={model}
            onChange={setModel}
          />
        </div>

        {displayError && (
          <p className="fockis-ai-error">
            {displayError}
          </p>
        )}
      </div>

      <AiGenerationProgress
        job={job}
      />

      {isCompleted &&
        jobId && (
          <div className="fockis-ai-video-result-action">
            <button
              type="button"
              className="fockis-ai-video-result-button"
              onClick={
                handleViewResult
              }
            >
              🎬 View Video Result
            </button>
          </div>
        )}
    </div>
  );
}
