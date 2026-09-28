import { useCallback, useMemo } from 'react';
import { useMessagesStore } from '../store/messagesStore';
import { isBlank } from '../utils/messageFormatting';
import type { Attachment } from '../types';
import { useTypingIndicator } from './useTypingIndicator';

export function useMessageComposer(conversationId: string | null) {
  const drafts = useMessagesStore((s) => s.drafts);
  const setDraftText = useMessagesStore((s) => s.setDraftText);
  const setReplyTo = useMessagesStore((s) => s.setReplyTo);
  const cancelEditing = useMessagesStore((s) => s.cancelEditing);
  const clearDraft = useMessagesStore((s) => s.clearDraft);
  const sendMessage = useMessagesStore((s) => s.sendMessage);
  const editMessage = useMessagesStore((s) => s.editMessage);
  const { stopTyping } = useTypingIndicator(conversationId);

  const draft = conversationId ? drafts[conversationId] : undefined;
  const text = draft?.text ?? '';
  const replyTo = draft?.replyTo;
  const editingMessageId = draft?.editingMessageId;

  const canSend = useMemo(() => !isBlank(text), [text]);

  const setText = useCallback(
    (value: string) => {
      if (conversationId) setDraftText(conversationId, value);
    },
    [conversationId, setDraftText],
  );

  const setReply = useCallback(
    (reply: typeof replyTo) => {
      if (conversationId) setReplyTo(conversationId, reply);
    },
    [conversationId, setReplyTo],
  );

  const clearReply = useCallback(() => setReply(undefined), [setReply]);

  const submit = useCallback(async () => {
    if (!conversationId || isBlank(text)) return;
    stopTyping();

    if (editingMessageId) {
      await editMessage(conversationId, editingMessageId, text.trim());
      cancelEditing(conversationId);
      return;
    }

    await sendMessage(conversationId, {
      type: 'text',
      text: text.trim(),
      replyTo,
    });
    clearDraft(conversationId);
  }, [conversationId, text, editingMessageId, replyTo, sendMessage, editMessage, cancelEditing, clearDraft, stopTyping]);

  const sendAttachments = useCallback(
    async (type: 'image' | 'video' | 'document', attachments: Attachment[], caption?: string) => {
      if (!conversationId) return;
      await sendMessage(conversationId, { type, attachments, text: caption });
    },
    [conversationId, sendMessage],
  );

  const sendVoice = useCallback(
    async (attachment: Attachment) => {
      if (!conversationId) return;
      await sendMessage(conversationId, { type: 'audio', attachments: [attachment] });
    },
    [conversationId, sendMessage],
  );

  return {
    text,
    setText,
    replyTo,
    setReply,
    clearReply,
    editingMessageId,
    canSend,
    submit,
    sendAttachments,
    sendVoice,
  };
}
