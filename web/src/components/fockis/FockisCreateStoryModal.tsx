import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { storyApi } from "../../api/storyApi";

import "../../styles/FockisCreateStoryModal.scss";

interface FockisCreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated?: () => void | Promise<void>;
}

const API_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000";

export default function FockisCreateStoryModal({
  isOpen,
  onClose,
  onStoryCreated,
}: FockisCreateStoryModalProps) {
  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [file, setFile] =
    useState<File | null>(null);

  const [previewUrl, setPreviewUrl] =
    useState<string>("");

  const [mediaType, setMediaType] =
    useState<"image" | "video">("image");

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState("");

  /* ============================================================
     CLEAN PREVIEW URL
  ============================================================ */

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  /* ============================================================
     RESET MODAL
  ============================================================ */

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setPreviewUrl("");
      setMediaType("image");
      setUploading(false);
      setError("");
    }
  }, [isOpen]);

  /* ============================================================
     GET CURRENT USER
  ============================================================ */

  const getCurrentUser = () => {
    const userId =
      localStorage.getItem("userId") ||
      localStorage.getItem("user_id");

    let username = "User";
    let avatar: string | null = null;

    try {
      const storedUser =
        localStorage.getItem("user");

      if (storedUser) {
        const user =
          JSON.parse(storedUser);

        username =
          user?.username ||
          user?.name ||
          "User";

        avatar =
          user?.avatar ||
          user?.profilePhoto ||
          user?.userPhoto ||
          null;
      }
    } catch {
      // Ignore invalid stored user data.
    }

    return {
      userId: userId || "",
      username,
      avatar,
    };
  };

  /* ============================================================
     SELECT FILE
  ============================================================ */

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile =
      event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    setError("");

    if (
      !selectedFile.type.startsWith("image/") &&
      !selectedFile.type.startsWith("video/")
    ) {
      setError(
        "Please select an image or video.",
      );

      return;
    }

    const nextMediaType =
      selectedFile.type.startsWith("video/")
        ? "video"
        : "image";

    setMediaType(nextMediaType);

    setFile(selectedFile);

    if (previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    const newPreviewUrl =
      URL.createObjectURL(selectedFile);

    setPreviewUrl(newPreviewUrl);
  };

  /* ============================================================
     OPEN FILE PICKER
  ============================================================ */

  const openFilePicker = () => {
    if (uploading) {
      return;
    }

    fileInputRef.current?.click();
  };

  /* ============================================================
     UPLOAD MEDIA
  ============================================================ */

  const uploadMedia = async (
    selectedFile: File,
  ): Promise<string> => {
    const formData =
      new FormData();

    formData.append(
      "file",
      selectedFile,
    );

    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      "";

    const response =
      await fetch(
        `${API_URL}/uploads`,
        {
          method: "POST",

          headers: token
            ? {
                Authorization:
                  `Bearer ${token}`,
              }
            : undefined,

          body: formData,
        },
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        errorText ||
          "Failed to upload story media.",
      );
    }

    const result =
      await response.json();

    const media =
      result?.url ||
      result?.path ||
      result?.fileUrl ||
      result?.filePath ||
      result?.filename ||
      result?.data?.url ||
      result?.data?.path;

    if (!media) {
      throw new Error(
        "Upload succeeded, but no media URL was returned.",
      );
    }

    return String(media);
  };

  /* ============================================================
     CREATE STORY
  ============================================================ */

  const handleSubmit = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    setError("");

    if (!file) {
      setError(
        "Please select an image or video first.",
      );

      return;
    }

    const currentUser =
      getCurrentUser();

    if (!currentUser.userId) {
      setError(
        "You must be logged in to create a story.",
      );

      return;
    }

    setUploading(true);

    try {
      const media =
        await uploadMedia(file);

      const createdStory =
        await storyApi.createStory({
          userId:
            currentUser.userId,

          username:
            currentUser.username,

          avatar:
            currentUser.avatar,

          media,

          type:
            mediaType,
        });

      console.log(
        "Fockis story created:",
        createdStory,
      );

      /* ========================================================
         TELL FOCKIS FEED THAT A NEW STORY EXISTS

         This allows SellerStoriesPage and FockisFeedPage
         to communicate even when they are different routes.
      ======================================================== */

      window.dispatchEvent(
        new CustomEvent(
          "fockis:story-created",
          {
            detail: {
              story: createdStory,
            },
          },
        ),
      );

      /* ========================================================
         OPTIONAL LOCAL CALLBACK
      ======================================================== */

      if (onStoryCreated) {
        await onStoryCreated();
      }

      onClose();
    } catch (err) {
      console.error(
        "Create story error:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to create story.",
      );
    } finally {
      setUploading(false);
    }
  };

  /* ============================================================
     CLOSE ON ESCAPE
  ============================================================ */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key === "Escape" &&
        !uploading
      ) {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [
    isOpen,
    uploading,
    onClose,
  ]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fockis-create-story-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-story-title"
    >
      <div
        className="fockis-create-story-modal__backdrop"
        onClick={() => {
          if (!uploading) {
            onClose();
          }
        }}
      />

      <div className="fockis-create-story-modal__content">
        <div className="fockis-create-story-modal__header">
          <div>
            <h2 id="create-story-title">
              Create Story
            </h2>

            <p>
              Share a photo or video
              that disappears after
              24 hours.
            </p>
          </div>

          <button
            type="button"
            className="fockis-create-story-modal__close"
            onClick={onClose}
            disabled={uploading}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            hidden
          />

          <div
            className="fockis-create-story-modal__preview"
            onClick={openFilePicker}
          >
            {previewUrl &&
            mediaType === "image" ? (
              <img
                src={previewUrl}
                alt="Story preview"
              />
            ) : previewUrl &&
              mediaType === "video" ? (
              <video
                src={previewUrl}
                controls
                playsInline
              />
            ) : (
              <div className="fockis-create-story-modal__empty">
                <div className="fockis-create-story-modal__icon">
                  +
                </div>

                <strong>
                  Add photo or video
                </strong>

                <span>
                  Click here to choose media
                </span>
              </div>
            )}
          </div>

          {file && (
            <div className="fockis-create-story-modal__file">
              <span>
                {file.name}
              </span>

              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPreviewUrl("");

                  if (
                    fileInputRef.current
                  ) {
                    fileInputRef.current.value =
                      "";
                  }
                }}
                disabled={uploading}
              >
                Remove
              </button>
            </div>
          )}

          {error && (
            <div className="fockis-create-story-modal__error">
              {error}
            </div>
          )}

          <div className="fockis-create-story-modal__actions">
            <button
              type="button"
              className="fockis-create-story-modal__cancel"
              onClick={onClose}
              disabled={uploading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="fockis-create-story-modal__submit"
              disabled={
                uploading ||
                !file
              }
            >
              {uploading
                ? "Creating..."
                : "Create Story"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}