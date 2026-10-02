import React, { useEffect, useState } from 'react';

import type { CallSettings } from '../types/messageAdmin.types';

interface CallSettingsFormProps {
  value: CallSettings;
  onSave: (
    value: CallSettings,
  ) => Promise<CallSettings> | void;
  saving?: boolean;
}

export default function CallSettingsForm({
  value,
  onSave,
  saving = false,
}: CallSettingsFormProps) {
  const [form, setForm] =
    useState<CallSettings>(value);

  useEffect(() => {
    setForm(value);
  }, [value]);

  function updateForm(
    changes: Partial<CallSettings>,
  ): void {
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
      className="call-settings-form"
      onSubmit={handleSubmit}
    >
      <div className="call-settings-form__header">
        <h2>Call Settings</h2>

        <p>
          Configure voice, video, and group calling
          capabilities for Fockis.
        </p>
      </div>

      <section className="call-settings-form__section">
        <h3>Voice Calls</h3>

        <label className="admin-form-toggle">
          <input
            type="checkbox"
            checked={form.voiceCallsEnabled}
            onChange={(event) =>
              updateForm({
                voiceCallsEnabled:
                  event.target.checked,
              })
            }
            disabled={saving}
          />

          <span>
            Enable voice calls
          </span>
        </label>
      </section>

      <section className="call-settings-form__section">
        <h3>Video Calls</h3>

        <label className="admin-form-toggle">
          <input
            type="checkbox"
            checked={form.videoCallsEnabled}
            onChange={(event) =>
              updateForm({
                videoCallsEnabled:
                  event.target.checked,
              })
            }
            disabled={saving}
          />

          <span>
            Enable video calls
          </span>
        </label>
      </section>

      <section className="call-settings-form__section">
        <h3>Group Calls</h3>

        <label className="admin-form-toggle">
          <input
            type="checkbox"
            checked={form.groupCallsEnabled}
            onChange={(event) =>
              updateForm({
                groupCallsEnabled:
                  event.target.checked,
              })
            }
            disabled={saving}
          />

          <span>
            Enable group calls
          </span>
        </label>

        <label>
          Maximum participants

          <input
            type="number"
            min={2}
            step={1}
            value={form.maxParticipants}
            onChange={(event) =>
              updateForm({
                maxParticipants: Number(
                  event.target.value,
                ),
              })
            }
            disabled={
              saving ||
              !form.groupCallsEnabled
            }
          />
        </label>
      </section>

      <section className="call-settings-form__section">
        <h3>Call Recording</h3>

        <label className="admin-form-toggle">
          <input
            type="checkbox"
            checked={form.callRecordingEnabled}
            onChange={(event) =>
              updateForm({
                callRecordingEnabled:
                  event.target.checked,
              })
            }
            disabled={saving}
          />

          <span>
            Enable call recording
          </span>
        </label>

        <p className="call-settings-form__notice">
          Call recording should only be enabled when
          your application has the appropriate consent,
          privacy, and storage controls in place.
        </p>
      </section>

      <div className="call-settings-form__summary">
        <div>
          <span>Voice calls</span>
          <strong>
            {form.voiceCallsEnabled
              ? 'Enabled'
              : 'Disabled'}
          </strong>
        </div>

        <div>
          <span>Video calls</span>
          <strong>
            {form.videoCallsEnabled
              ? 'Enabled'
              : 'Disabled'}
          </strong>
        </div>

        <div>
          <span>Group calls</span>
          <strong>
            {form.groupCallsEnabled
              ? `${form.maxParticipants} participants`
              : 'Disabled'}
          </strong>
        </div>

        <div>
          <span>Recording</span>
          <strong>
            {form.callRecordingEnabled
              ? 'Enabled'
              : 'Disabled'}
          </strong>
        </div>
      </div>

      <div className="call-settings-form__actions">
        <button
          type="submit"
          disabled={saving}
        >
          {saving
            ? 'Saving...'
            : 'Save Call Settings'}
        </button>
      </div>
    </form>
  );
}