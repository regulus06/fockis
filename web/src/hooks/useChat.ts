import { useEffect, useState } from "react";
import { getSocket } from "../socket/client";
import { sendMessage, getMessages } from "../api/messagesApi";

type Message = {
  _id?: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt?: string;
};

export default function useChat(conversationId: string, userId: string) {
  const socket = getSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch messages
  useEffect(() => {
    if (!conversationId) return;

    setLoading(true);

    getMessages(conversationId)
      .then((res: any) => {
        setMessages(res.data || []);
      })
      .finally(() => setLoading(false));
  }, [conversationId]);

  // Join conversation room
  useEffect(() => {
    if (!conversationId) return;

    socket.connect();
    socket.emit("joinConversation", conversationId);

    return () => {
      socket.emit("leaveConversation", conversationId);
    };
  }, [conversationId, socket]);

  // Listen for new messages
  useEffect(() => {
    const handler = (message: Message) => {
      if (message.conversationId !== conversationId) return;

      setMessages((prev) => {
        const exists = prev.some(
          (m) => m._id && m._id === message._id
        );

        if (exists) return prev;

        return [...prev, message];
      });
    };

    socket.on("newMessage", handler);

    return () => {
      socket.off("newMessage", handler);
    };
  }, [conversationId, socket]);

  // Send message
  const send = async (content: string) => {
    if (!content.trim()) return;

    const payload = {
      conversationId,
      senderId: userId,
      content,
    };

    const res = await sendMessage(payload);

    const newMessage = res.data;

    // Update UI immediately
    setMessages((prev) => {
      const exists = prev.some(
        (m) => m._id && m._id === newMessage._id
      );

      if (exists) return prev;

      return [...prev, newMessage];
    });

    socket.emit("sendMessage", newMessage);
  };

  return {
    messages,
    send,
    loading,
  };
}