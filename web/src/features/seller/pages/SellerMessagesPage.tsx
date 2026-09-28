import { useEffect, useState } from "react";

import { chatApi } from "../services/chatApi";

import type {
  Conversation,
  ChatMessage,
} from "../services/chatApi";

import "../styles/SellerDashboard.scss";

/* ============================================================================
   SELLER MESSAGES PAGE

   Flow:

   1. Load seller conversations from /messages/inbox
   2. Select a conversation
   3. Load messages for that conversation
   4. Send using:
      {
        conversationId,
        senderId,
        content
      }
============================================================================ */

export default function SellerMessagesPage() {
  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);

  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [text, setText] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [messagesLoading, setMessagesLoading] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  /* ==========================================================================
     CURRENT USER
  ========================================================================== */

  function getCurrentUserId(): string {
    const storedUserId =
      localStorage.getItem("userId");

    if (storedUserId) {
      return storedUserId;
    }

    try {
      const raw =
        localStorage.getItem("user");

      if (!raw) {
        return "";
      }

      const user =
        JSON.parse(raw);

      return String(
        user?._id ||
        user?.id ||
        ""
      );
    } catch {
      return "";
    }
  }

  /* ==========================================================================
     LOAD SELLER INBOX
  ========================================================================== */

  useEffect(() => {
    void loadConversations();
  }, []);

  async function loadConversations() {
    try {
      setLoading(true);

      const data =
        await chatApi.getSellerMessages();

      const conversationList =
        Array.isArray(data)
          ? data
          : [];

      setConversations(
        conversationList
      );

      if (
        conversationList.length > 0
      ) {
        await selectConversation(
          conversationList[0]
        );
      }
    } catch (error) {
      console.error(
        "Seller inbox error:",
        error
      );

      setConversations([]);
    } finally {
      setLoading(false);
    }
  }

  /* ==========================================================================
     SELECT CONVERSATION
  ========================================================================== */

  async function selectConversation(
    conversation: Conversation
  ) {
    setSelectedConversation(
      conversation
    );

    setMessagesLoading(true);

    try {
      const data =
        await chatApi.getMessages(
          conversation._id
        );

      setMessages(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (error) {
      console.error(
        "Conversation messages error:",
        error
      );

      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }

  /* ==========================================================================
     SEND REPLY
  ========================================================================== */

  async function sendReply() {
    const content =
      text.trim();

    if (!content) {
      return;
    }

    if (!selectedConversation) {
      console.error(
        "No conversation selected."
      );

      return;
    }

    const senderId =
      getCurrentUserId();

    if (!senderId) {
      console.error(
        "No current user ID found."
      );

      return;
    }

    try {
      setSending(true);

      await chatApi.sendMessage({
        conversationId:
          selectedConversation._id,

        senderId,

        content,
      });

      setText("");

      await selectConversation(
        selectedConversation
      );
    } catch (error) {
      console.error(
        "Send seller message error:",
        error
      );
    } finally {
      setSending(false);
    }
  }

  /* ==========================================================================
     LOADING
  ========================================================================== */

  if (loading) {
    return (
      <div className="seller-dashboard">
        <div className="card">
          Loading messages...
        </div>
      </div>
    );
  }

  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <div className="seller-dashboard">

      <main className="dashboard-main">

        <h1>
          💬 Seller Messages
        </h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "280px 1fr",
            gap: "16px",
            alignItems: "start",
          }}
        >

          {/* ================================================================
              CONVERSATIONS
          ================================================================ */}

          <div className="card">

            <h3>
              Conversations
            </h3>

            {conversations.length === 0 ? (

              <p>
                No conversations yet.
              </p>

            ) : (

              conversations.map(
                (conversation) => {

                  const isActive =
                    selectedConversation?._id ===
                    conversation._id;

                  return (
                    <button
                      key={
                        conversation._id
                      }
                      type="button"
                      onClick={() =>
                        selectConversation(
                          conversation
                        )
                      }
                      style={{
                        width: "100%",
                        textAlign:
                          "left",
                        padding:
                          "12px",
                        marginBottom:
                          "8px",
                        borderRadius:
                          "8px",
                        border:
                          "1px solid var(--fk-border, #ddd)",
                        background:
                          isActive
                            ? "var(--fk-sunken, #f5f5f5)"
                            : "transparent",
                        cursor:
                          "pointer",
                      }}
                    >

                      <strong>
                        Conversation
                      </strong>

                      <div
                        style={{
                          fontSize:
                            "12px",
                          opacity:
                            0.7,
                          marginTop:
                            "4px",
                        }}
                      >
                        {
                          conversation.participants
                            ?.length || 0
                        }{" "}
                        participants
                      </div>

                    </button>
                  );
                }
              )

            )}

          </div>

          {/* ================================================================
              CHAT
          ================================================================ */}

          <div className="card">

            {!selectedConversation ? (

              <div>
                <h3>
                  Select a conversation
                </h3>

                <p>
                  Choose a conversation
                  from the left to view
                  messages.
                </p>
              </div>

            ) : (

              <>

                <div
                  style={{
                    borderBottom:
                      "1px solid var(--fk-border, #ddd)",
                    paddingBottom:
                      "12px",
                    marginBottom:
                      "16px",
                  }}
                >

                  <h3>
                    Conversation
                  </h3>

                  <small>
                    {
                      selectedConversation
                        .participants
                        ?.length || 0
                    }{" "}
                    participants
                  </small>

                </div>

                {/* =========================================================
                    MESSAGE LIST
                ========================================================= */}

                {messagesLoading ? (

                  <p>
                    Loading conversation...
                  </p>

                ) : messages.length === 0 ? (

                  <p>
                    No messages in this
                    conversation yet.
                  </p>

                ) : (

                  <div
                    style={{
                      display:
                        "flex",
                      flexDirection:
                        "column",
                      gap:
                        "10px",
                      marginBottom:
                        "20px",
                    }}
                  >

                    {messages.map(
                      (message) => {

                        const senderId =
                          getCurrentUserId();

                        const isMine =
                          message.senderId ===
                          senderId;

                        return (
                          <div
                            key={
                              message._id
                            }
                            style={{
                              alignSelf:
                                isMine
                                  ? "flex-end"
                                  : "flex-start",
                              maxWidth:
                                "75%",
                              padding:
                                "10px 14px",
                              borderRadius:
                                "12px",
                              background:
                                isMine
                                  ? "var(--fk-fjord, #234)"
                                  : "var(--fk-sunken, #f5f5f5)",
                              color:
                                isMine
                                  ? "#fff"
                                  : "inherit",
                            }}
                          >

                            <p
                              style={{
                                margin:
                                  0,
                              }}
                            >
                              {
                                message.content
                              }
                            </p>

                            {message.createdAt && (
                              <small
                                style={{
                                  display:
                                    "block",
                                  marginTop:
                                    "5px",
                                  opacity:
                                    0.65,
                                }}
                              >
                                {new Date(
                                  message.createdAt
                                ).toLocaleString()}
                              </small>
                            )}

                          </div>
                        );
                      }
                    )}

                  </div>

                )}

                {/* =========================================================
                    REPLY
                ========================================================= */}

                <div>

                  <h3>
                    Reply
                  </h3>

                  <textarea
                    value={text}
                    onChange={(event) =>
                      setText(
                        event.target.value
                      )
                    }
                    placeholder="Write your reply..."
                    rows={4}
                    disabled={sending}
                    style={{
                      width:
                        "100%",
                      resize:
                        "vertical",
                      marginBottom:
                        "10px",
                    }}
                  />

                  <button
                    type="button"
                    onClick={
                      sendReply
                    }
                    disabled={
                      sending ||
                      !text.trim()
                    }
                  >
                    {sending
                      ? "Sending..."
                      : "Send Message"}
                  </button>

                </div>

              </>

            )}

          </div>

        </div>

      </main>

    </div>
  );
}