import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import MessageSettingsForm from '../components/MessageSettingsForm';
import type {
  MessageSettings,
} from '../types/messageAdmin.types';

const STORAGE_KEY =
  'fockis-admin-message-settings';

const DEFAULT_MESSAGE_SETTINGS: MessageSettings = {
  messagingEnabled: true,
  maxMessageLength: 2000,
  maxAttachmentsPerMessage: 10,
  messageEditEnabled: true,
  messageDeleteEnabled: true,
  reactionsEnabled: true,
  repliesEnabled: true,
  forwardingEnabled: true,
};

function loadSettings(): MessageSettings {
  try {
    const stored =
      window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return DEFAULT_MESSAGE_SETTINGS;
    }

    const parsed: unknown = JSON.parse(stored);

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      return DEFAULT_MESSAGE_SETTINGS;
    }

    return {
      ...DEFAULT_MESSAGE_SETTINGS,
      ...(parsed as Partial<MessageSettings>),
    };
  } catch {
    return DEFAULT_MESSAGE_SETTINGS;
  }
}

async function saveSettings(
  value: MessageSettings,
): Promise<void> {
  const normalized: MessageSettings = {
    ...value,

    maxMessageLength: Math.max(
      1,
      Number(value.maxMessageLength) || 1,
    ),

    maxAttachmentsPerMessage: Math.max(
      0,
      Number(value.maxAttachmentsPerMessage) || 0,
    ),
  };

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(normalized),
  );
}

export default function MessageSettingsPage(): React.ReactElement {
  const [settings, setSettings] =
    useState<MessageSettings>(
      () => loadSettings(),
    );

  const [saving, setSaving] =
    useState<boolean>(false);

  const [loading, setLoading] =
    useState<boolean>(true);

  const [pageError, setPageError] =
    useState<string | null>(null);

  const loadMessageSettings =
    useCallback(async (): Promise<void> => {
      try {
        setPageError(null);

        const loaded = loadSettings();

        setSettings(loaded);
      } catch (error) {
        setPageError(
          error instanceof Error
            ? error.message
            : 'Unable to load message settings.',
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadMessageSettings();
  }, [loadMessageSettings]);

  const handleSave = useCallback(
    async (
      value: MessageSettings,
    ): Promise<void> => {
      setSaving(true);
      setPageError(null);

      try {
        await saveSettings(value);

        setSettings(value);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to save message settings.';

        setPageError(message);

        throw error;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  if (loading) {
    return (
      <section className="message-admin-settings-page">
        <div className="message-admin-settings-page__loading">
          Loading message settings...
        </div>
      </section>
    );
  }

  return (
    <section className="message-admin-settings-page">
      {pageError && (
        <div
          className="message-admin-alert message-admin-alert--error"
          role="alert"
        >
          {pageError}
        </div>
      )}

      <MessageSettingsForm
        value={settings}
        onSave={handleSave}
        saving={saving}
      />
    </section>
  );
}
