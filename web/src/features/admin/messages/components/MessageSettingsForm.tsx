import React, { useEffect, useState } from 'react';

import type { MessageSettings } from '../types/messageAdmin.types';

interface MessageSettingsFormProps {
  value: MessageSettings;
  onSave: (value: MessageSettings) => Promise<void> | void;
  saving?: boolean;
}

export default function MessageSettingsForm({
  value,
  onSave,
  saving = false,
}: MessageSettingsFormProps) {
  const [form, setForm] = useState(value);

  useEffect(() => {
    setForm(value);
  }, [value]);

  const toggle = (
    key: keyof MessageSettings,
  ) => {
    setForm((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  return (
    <form
      className="message-settings-form"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSave(form);
      }}
    >
      <div className="message-settings-form__header">
        <h2>Message Settings</h2>
        <p>
          Control the behavior and limits of Fockis
          messaging.
        </p>
      </div>

      <label className="admin-form-toggle">
        <input
          type="checkbox"
          checked={form.messagingEnabled}
          onChange={() =>
            toggle('messagingEnabled')
          }
        />
        <span>Messaging enabled</span>
      </label>

      <label>
        Maximum message length
        <input
          type="number"
          min={1}
          value={form.maxMessageLength}
          onChange={(event) =>
            setForm({
              ...form,
              maxMessageLength: Number(
                event.target.value,
              ),
            })
          }
        />
      </label>

      <label>
        Maximum attachments per message
        <input
          type="number"
          min={0}
          value={form.maxAttachmentsPerMessage}
          onChange={(event) =>
            setForm({
              ...form,
              maxAttachmentsPerMessage: Number(
                event.target.value,
              ),
            })
          }
        />
      </label>

      <div className="message-settings-form__toggles">
        <label className="admin-form-toggle">
          <input
            type="checkbox"
            checked={form.messageEditEnabled}
            onChange={() =>
              toggle('messageEditEnabled')
            }
          />
          <span>Allow message editing</span>
        </label>

        <label className="admin-form-toggle">
          <input
            type="checkbox"
            checked={form.messageDeleteEnabled}
            onChange={() =>
              toggle('messageDeleteEnabled')
            }
          />
          <span>Allow message deletion</span>
        </label>

        <label className="admin-form-toggle">
          <input
            type="checkbox"
            checked={form.reactionsEnabled}
            onChange={() =>
              toggle('reactionsEnabled')
            }
          />
          <span>Message reactions</span>
        </label>

        <label className="admin-form-toggle">
          <input
            type="checkbox"
            checked={form.repliesEnabled}
            onChange={() =>
              toggle('repliesEnabled')
            }
          />
          <span>Message replies</span>
        </label>

        <label className="admin-form-toggle">
          <input
            type="checkbox"
            checked={form.forwardingEnabled}
            onChange={() =>
              toggle('forwardingEnabled')
            }
          />
          <span>Message forwarding</span>
        </label>
      </div>

      <button type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'Save Message Settings'}
      </button>
    </form>
  );
}