import { useCallback, useEffect, useState } from 'react';

import messageAdminService from '../services/messageAdminService';

import type {
  AttachmentSettings,
  CallSettings,
  MessageSettings,
} from '../types/messageAdmin.types';

const DEFAULT_MESSAGE_SETTINGS: MessageSettings = {
  messagingEnabled: true,
  maxMessageLength: 5000,
  maxAttachmentsPerMessage: 10,
  messageEditEnabled: true,
  messageDeleteEnabled: true,
  reactionsEnabled: true,
  repliesEnabled: true,
  forwardingEnabled: true,
};

const DEFAULT_CALL_SETTINGS: CallSettings = {
  voiceCallsEnabled: true,
  videoCallsEnabled: true,
  groupCallsEnabled: true,
  maxParticipants: 10,
  callRecordingEnabled: false,
};

const DEFAULT_ATTACHMENT_SETTINGS: AttachmentSettings = {
  attachmentsEnabled: true,
  maxFileSizeMb: 50,
  maxImagesPerMessage: 10,
  maxVideosPerMessage: 5,
  maxDocumentsPerMessage: 5,
  maxVoiceMessageMinutes: 10,
};

export function useMessageSettings() {
  const [messageSettings, setMessageSettings] =
    useState<MessageSettings>(
      DEFAULT_MESSAGE_SETTINGS,
    );

  const [callSettings, setCallSettings] =
    useState<CallSettings>(DEFAULT_CALL_SETTINGS);

  const [attachmentSettings, setAttachmentSettings] =
    useState<AttachmentSettings>(
      DEFAULT_ATTACHMENT_SETTINGS,
    );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        messageResult,
        callResult,
        attachmentResult,
      ] = await Promise.all([
        messageAdminService
          .getMessageSettings()
          .catch(() => DEFAULT_MESSAGE_SETTINGS),

        messageAdminService
          .getCallSettings()
          .catch(() => DEFAULT_CALL_SETTINGS),

        messageAdminService
          .getAttachmentSettings()
          .catch(() => DEFAULT_ATTACHMENT_SETTINGS),
      ]);

      setMessageSettings(messageResult);
      setCallSettings(callResult);
      setAttachmentSettings(attachmentResult);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load message settings.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveMessageSettings = useCallback(
    async (value: MessageSettings) => {
      setSaving(true);

      try {
        const result =
          await messageAdminService.updateMessageSettings(
            value,
          );

        setMessageSettings(result);
        return result;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const saveCallSettings = useCallback(
    async (value: CallSettings) => {
      setSaving(true);

      try {
        const result =
          await messageAdminService.updateCallSettings(
            value,
          );

        setCallSettings(result);
        return result;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const saveAttachmentSettings = useCallback(
    async (value: AttachmentSettings) => {
      setSaving(true);

      try {
        const result =
          await messageAdminService.updateAttachmentSettings(
            value,
          );

        setAttachmentSettings(result);
        return result;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  return {
    messageSettings,
    callSettings,
    attachmentSettings,
    loading,
    saving,
    error,
    saveMessageSettings,
    saveCallSettings,
    saveAttachmentSettings,
    reload: load,
  };
}

export default useMessageSettings;
