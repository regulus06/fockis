import React, { useEffect, useState } from 'react';

import type { AttachmentSettings } from '../types/messageAdmin.types';

interface AttachmentSettingsFormProps {
  value: AttachmentSettings;
  onSave: (
    value: AttachmentSettings,
  ) => Promise<AttachmentSettings> | void;
  saving?: boolean;
}

export default function AttachmentSettingsForm({
  value,
  onSave,
  saving = false,
}: AttachmentSettingsFormProps) {
  const [form, setForm] =
    useState<AttachmentSettings>(value);

  useEffect(() => {
    setForm(value);
  }, [value]);

  function updateForm(
    changes: Partial<AttachmentSettings>,
  ) {
    setForm((previous) => ({
      ...previous,
      ...changes,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    await onSave(form);
  }

  return (
    <form
      className="attachment-settings-form"
      onSubmit={handleSubmit}
    >
      <div className="attachment-settings-form__header">
        <h2>Attachment Settings</h2>

        <p>
          Control file sizes and attachment limits for
          Fockis messaging.
        </p>
      </div>

      <label className="admin-form-toggle">
        <input
          type="checkbox"
          checked={form.attachmentsEnabled}
          onChange={(event) =>
            updateForm({
              attachmentsEnabled:
                event.target.checked,
            })
          }
          disabled={saving}
        />

        <span>
          Attachments enabled
        </span>
      </label>

      <label>
        Maximum file size (MB)

        <input
          type="number"
          min={1}
          step={1}
          value={form.maxFileSizeMb}
          onChange={(event) =>
            updateForm({
              maxFileSizeMb: Number(
                event.target.value,
              ),
            })
          }
          disabled={saving}
        />
      </label>

      <label>
        Maximum images per message

        <input
          type="number"
          min={0}
          step={1}
          value={form.maxImagesPerMessage}
          onChange={(event) =>
            updateForm({
              maxImagesPerMessage: Number(
                event.target.value,
              ),
            })
          }
          disabled={saving}
        />
      </label>

      <label>
        Maximum videos per message

        <input
          type="number"
          min={0}
          step={1}
          value={form.maxVideosPerMessage}
          onChange={(event) =>
            updateForm({
              maxVideosPerMessage: Number(
                event.target.value,
              ),
            })
          }
          disabled={saving}
        />
      </label>

      <label>
        Maximum documents per message

        <input
          type="number"
          min={0}
          step={1}
          value={form.maxDocumentsPerMessage}
          onChange={(event) =>
            updateForm({
              maxDocumentsPerMessage: Number(
                event.target.value,
              ),
            })
          }
          disabled={saving}
        />
      </label>

      <label>
        Maximum voice message (minutes)

        <input
          type="number"
          min={1}
          step={1}
          value={form.maxVoiceMessageMinutes}
          onChange={(event) =>
            updateForm({
              maxVoiceMessageMinutes: Number(
                event.target.value,
              ),
            })
          }
          disabled={saving}
        />
      </label>

      <button
        type="submit"
        disabled={saving}
      >
        {saving
          ? 'Saving...'
          : 'Save Attachment Settings'}
      </button>
    </form>
  );
}