import React, { useEffect, useState } from "react";
import {
  Phone,
  PhoneOff,
  Sparkles,
} from "lucide-react";

import "../styles/FockisAi.scss";

import AiSidebar from "../components/AiSidebar";
import AiChatHeader from "../components/AiChatHeader";
import AiMessageBubble from "../components/AiMessageBubble";
import AiPromptSuggestions from "../components/AiPromptSuggestions";
import AiChatComposer from "../components/AiChatComposer";
import AiStatusBar from "../components/AiStatusBar";
import AiVoicePanel from "../components/AiVoicePanel";

import { useFockisAi } from "../hooks/useFockisAi";

export default function FockisAiPage() {
  const [open, setOpen] = useState(false);

  const a = useFockisAi();

  const voice = [
    "connecting",
    "listening",
    "speaking",
  ].includes(a.voiceStatus);

  const connecting =
    a.voiceStatus === "connecting";

  useEffect(() => {
    document.title = "Fockis AI";
  }, []);

  const fresh = !a.messages.length;

  /*
   * ============================================================
   * CALL BUTTON
   * ============================================================
   */

  const handleCall = async () => {
    if (voice) {
      await a.stopVoice();
      return;
    }

    await a.startVoice();
  };

  return (
    <div className="fai-page">

      {/* ========================================================
          SIDEBAR
      ======================================================== */}

      <AiSidebar
        open={open}
        conversations={a.conversations}
        activeId={a.activeId}
        onSelect={(id: string) => {
          a.select(id);
          setOpen(false);
        }}
        onRename={a.rename}
        onDelete={a.remove}
        onNew={a.create}
        onClose={() => setOpen(false)}
      />

      {/* ========================================================
          MAIN
      ======================================================== */}

      <main className="fai-main">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="fai-header-row">

          <AiChatHeader
            title={
              a.activeConversation?.title ||
              "Fockis AI"
            }
            connection={a.connection}
            onMenu={() => setOpen(true)}
            onNew={a.create}
          />

          {/* ====================================================
              VAPI CALL BUTTON
          ==================================================== */}

          <button
            type="button"
            className={[
              "fai-call-button",
              voice
                ? "fai-call-button--active"
                : "",
              connecting
                ? "fai-call-button--connecting"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => {
              void handleCall();
            }}
            disabled={connecting}
            aria-label={
              voice
                ? "End call with Elince"
                : "Call Elince"
            }
            title={
              voice
                ? "End call"
                : "Call Elince"
            }
          >

            <span className="fai-call-button__icon">

              {voice ? (
                <PhoneOff size={18} />
              ) : (
                <Phone size={18} />
              )}

            </span>

            <span className="fai-call-button__label">

              {connecting
                ? "Connecting..."
                : voice
                  ? "End Call"
                  : "Call Elince"}

            </span>

          </button>

        </div>

        {/* ======================================================
            STATUS
        ====================================================== */}

        <AiStatusBar
          error={a.error}
          onRetry={() => {
            void a.startVoice();
          }}
        />

        {/* ======================================================
            CHAT
        ====================================================== */}

        <section className="fai-chat">

          {fresh ? (

            <div className="fai-welcome">

              <div className="fai-mark">
                <Sparkles size={30} />
              </div>

              <h1>
                What can I help you with?
              </h1>

              <p>
                Ask questions, create content, learn,
                code, search Fockis, or talk directly
                with Elince.
              </p>

              {/* ==================================================
                  CALL CARD
              ================================================== */}

              <div className="fai-call-card">

                <div className="fai-call-card__icon">
                  <Phone size={22} />
                </div>

                <div className="fai-call-card__content">

                  <strong>
                    Talk to Elince
                  </strong>

                  <span>
                    Start a live voice conversation
                    with Fockis AI.
                  </span>

                </div>

                <button
                  type="button"
                  className={[
                    "fai-call-card__button",
                    voice
                      ? "fai-call-card__button--active"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    void handleCall();
                  }}
                  disabled={connecting}
                >

                  {voice ? (
                    <>
                      <PhoneOff size={17} />
                      End Call
                    </>
                  ) : (
                    <>
                      <Phone size={17} />
                      Call Elince
                    </>
                  )}

                </button>

              </div>

              {/* ==================================================
                  PROMPT SUGGESTIONS
              ================================================== */}

              <AiPromptSuggestions
                onSelect={a.send}
              />

              {/* ==================================================
                  EXISTING VOICE PANEL
              ================================================== */}

              <AiVoicePanel
                status={a.voiceStatus}
                onStart={() => {
                  void a.startVoice();
                }}
                onStop={() => {
                  void a.stopVoice();
                }}
              />

            </div>

          ) : (

            <div className="fai-messages">

              {a.messages.map((m, i) => (

                <AiMessageBubble
                  key={m.id}
                  message={m}
                  onRetry={
                    m.status === "error" &&
                    i === a.messages.length - 1
                      ? () =>
                          a.send(
                            [...a.messages]
                              .reverse()
                              .find(
                                (x) =>
                                  x.role === "user",
                              )
                              ?.content || "",
                          )
                      : undefined
                  }
                />

              ))}

              {/* ==================================================
                  ACTIVE CALL BAR
              ================================================== */}

              {voice && (
                <div className="fai-active-call">

                  <div className="fai-active-call__info">

                    <span className="fai-active-call__dot" />

                    <div>
                      <strong>
                        Elince is on a call
                      </strong>

                      <span>
                        Fockis AI voice assistant
                      </span>
                    </div>

                  </div>

                  <button
                    type="button"
                    className="fai-active-call__end"
                    onClick={() => {
                      void a.stopVoice();
                    }}
                  >
                    <PhoneOff size={16} />
                    End Call
                  </button>

                </div>
              )}

            </div>

          )}

        </section>

        {/* ======================================================
            MESSAGE COMPOSER
        ====================================================== */}

        <AiChatComposer
          disabled={a.sending}
          onSend={a.send}
          onVoice={() => {
            void handleCall();
          }}
          voiceActive={voice}
        />

        {/* ======================================================
            FOOTER
        ====================================================== */}

        <footer className="fai-footer">

          Fockis AI can make mistakes. Check important
          information before relying on it.

        </footer>

      </main>
    </div>
  );
}