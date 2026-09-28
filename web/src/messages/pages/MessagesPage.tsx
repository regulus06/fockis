import "../styles/messages.scss";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  useConversations,
} from "../hooks/useConversations";

import {
  useMessagesStore,
} from "../store/messagesStore";

import {
  useMessageSocket,
} from "../hooks/useMessageSocket";

import {
  useMediaViewer,
} from "../hooks/useMediaViewer";

import ConversationList from "../components/ConversationList";
import ChatBox from "../components/ChatBox";
import ChatInfoPanel from "../components/ChatInfoPanel";
import EmptyConversation from "../components/EmptyConversation";
import MediaViewer from "../components/MediaViewer";
import CallModal from "../hooks/CallModal";

import type {
  Attachment,
} from "../types";


/* ============================================================================
   STABLE EMPTY ARRAY
============================================================================ */

const EMPTY_MESSAGES: never[] = [];


/* ============================================================================
   FOCKIS MESSAGES PAGE
============================================================================ */

export default function MessagesPage() {

  const navigate = useNavigate();

  const [
    searchParams,
  ] = useSearchParams();


  /* ========================================================================== 
     CONVERSATIONS
  ========================================================================== */

  const {
    items,
    loading,
    activeConversationId,
    setActiveConversation,
    startConversationWith,
  } = useConversations();


  /* ========================================================================== 
     LOCAL UI STATE
  ========================================================================== */

  const [
    infoOpen,
    setInfoOpen,
  ] = useState(false);

  const [
    mobileView,
    setMobileView,
  ] = useState<"list" | "chat">(
    "list",
  );


  /* ========================================================================== 
     REAL-TIME SOCKET

     IMPORTANT:
     This must remain mounted while the Messages page is mounted.

     It receives:
       - messages
       - typing
       - presence
       - incoming calls
       - call accepted/rejected/ended
       - WebRTC signaling
  ========================================================================== */

  useMessageSocket();


  /* ========================================================================== 
     OPEN FOCKIS ID PAGE
  ========================================================================== */

  const handleOpenFockisId =
    () => {

      navigate(
        "/settings/fockis-id",
      );

    };


  /* ========================================================================== 
     OPEN CONVERSATION FROM URL

     Supported:

       /messages?with=INTERNAL_USER_ID

     The `with` parameter remains an internal Mongo user ID for backwards
     compatibility.
  ========================================================================== */

  useEffect(() => {

    const userId =
      searchParams.get("with");

    if (!userId) {
      return;
    }

    const normalizedUserId =
      userId.trim();

    if (!normalizedUserId) {
      return;
    }

    let cancelled = false;


    const openConversation =
      async () => {

        try {

          console.log(
            "[FOCKIS MESSAGES] Opening conversation with:",
            normalizedUserId,
          );


          const conversationId =
            await startConversationWith(
              normalizedUserId,
            );


          if (cancelled) {
            return;
          }


          const normalizedConversationId =
            String(
              conversationId ?? "",
            ).trim();


          if (!normalizedConversationId) {
            throw new Error(
              "Conversation was created but no conversation ID was returned.",
            );
          }


          console.log(
            "[FOCKIS MESSAGES] Conversation created/opened:",
            normalizedConversationId,
          );


          /*
           * startConversationWith() is responsible for putting the
           * conversation into the Zustand conversation store.
           *
           * We still explicitly select it here so the chat immediately
           * becomes the active screen.
           */

          setActiveConversation(
            normalizedConversationId,
          );

          setInfoOpen(false);

          setMobileView(
            "chat",
          );


          console.log(
            "[FOCKIS MESSAGES] Active conversation set:",
            normalizedConversationId,
          );

        } catch (error) {

          if (!cancelled) {

            console.error(
              "[FOCKIS MESSAGES] Failed to open conversation:",
              error,
            );

          }

        }

      };


    void openConversation();


    return () => {

      cancelled = true;

    };

  }, [
    searchParams,
    startConversationWith,
    setActiveConversation,
  ]);


  /* ========================================================================== 
     ACTIVE CONVERSATION

     Compare IDs as strings because Mongo IDs can arrive from different
     runtime representations.
  ========================================================================== */

  const active =
    useMemo(
      () => {

        if (!activeConversationId) {
          return undefined;
        }


        const normalizedActiveId =
          String(
            activeConversationId,
          ).trim();


        if (!normalizedActiveId) {
          return undefined;
        }


        const found =
          items.find(
            (item) => {

              const conversationId =
                String(
                  item?.conversation?.id ?? "",
                ).trim();

              return (
                conversationId ===
                normalizedActiveId
              );

            },
          );


        if (found) {

          console.log(
            "[FOCKIS MESSAGES] Active conversation found:",
            {
              activeId:
                normalizedActiveId,

              conversationId:
                found.conversation.id,

              title:
                found.title,

              participantId:
                found.participant?.id ??
                null,

              participantFockisId:
                found.participant?.fockisId ??
                null,
            },
          );

          return found;
        }


        /*
         * If the active ID has just been created but the conversation list
         * has not rendered it yet, do NOT manufacture an invalid conversation.
         *
         * Instead we wait for the store to update.
         */

        console.warn(
          "[FOCKIS MESSAGES] Active conversation ID exists but conversation is not yet in items:",
          normalizedActiveId,
        );


        return undefined;

      },
      [
        items,
        activeConversationId,
      ],
    );


  /* ========================================================================== 
     ACTIVE CONVERSATION MESSAGES
  ========================================================================== */

  const messages =
    useMessagesStore(
      (state) => {

        if (!activeConversationId) {
          return EMPTY_MESSAGES;
        }

        const conversationId =
          String(
            activeConversationId,
          );


        return (
          state.messagesByConversation[
            conversationId
          ] ??
          EMPTY_MESSAGES
        );

      },
    );


  /* ========================================================================== 
     MEDIA VIEWER
  ========================================================================== */

  const infoViewer =
    useMediaViewer();


  /* ========================================================================== 
     SELECT CONVERSATION
  ========================================================================== */

  const handleSelect =
    (id: string) => {

      const normalizedId =
        String(
          id ?? "",
        ).trim();


      if (!normalizedId) {

        console.warn(
          "[FOCKIS MESSAGES] Ignoring empty conversation ID.",
        );

        return;
      }


      console.log(
        "[FOCKIS MESSAGES] Selecting conversation:",
        normalizedId,
      );


      setActiveConversation(
        normalizedId,
      );

      setInfoOpen(false);

      setMobileView(
        "chat",
      );

    };


  /* ========================================================================== 
     BACK TO CONVERSATION LIST
  ========================================================================== */

  const handleBack =
    () => {

      setInfoOpen(false);

      setMobileView(
        "list",
      );

    };


  /* ========================================================================== 
     OPEN / CLOSE INFO PANEL
  ========================================================================== */

  const handleToggleInfo =
    () => {

      setInfoOpen(
        (current) =>
          !current,
      );

    };


  const handleCloseInfo =
    () => {

      setInfoOpen(false);

    };


  /* ========================================================================== 
     OPEN IMAGE FROM INFO PANEL
  ========================================================================== */

  const handleOpenInfoImage =
    (
      attachments: Attachment[],
      index: number,
    ) => {

      infoViewer.openViewer(
        attachments,
        index,
      );

    };


  /* ========================================================================== 
     DEBUG
  ========================================================================== */

  useEffect(() => {

    console.log(
      "[FOCKIS MESSAGES] Render state:",
      {
        loading,

        activeConversationId:
          activeConversationId ??
          null,

        normalizedActiveConversationId:
          activeConversationId
            ? String(
                activeConversationId,
              ).trim()
            : null,

        itemCount:
          items.length,

        conversationIds:
          items.map(
            (item) =>
              String(
                item?.conversation?.id ?? "",
              ),
          ),

        activeConversationFound:
          Boolean(active),

        activeConversation:
          active?.conversation?.id ??
          null,

        activeTitle:
          active?.title ??
          null,

        activeParticipant:
          active?.participant?.id ??
          null,

        activeParticipantFockisId:
          active?.participant?.fockisId ??
          null,

        messageCount:
          messages.length,
      },
    );

  }, [
    loading,
    activeConversationId,
    items,
    active,
    messages.length,
  ]);


  /* ========================================================================== 
     RENDER
  ========================================================================== */

  return (

    <div className="messages-page">

      {/* ====================================================================
          GLOBAL CALL UI

          IMPORTANT:

          CallModal is intentionally outside ChatBox.

          Incoming calls are global to the Messages application and must
          appear even when:

            - no conversation is selected
            - the user is viewing the conversation list
            - the user is viewing another conversation
            - the mobile UI is on the list screen

          useMessageSocket() receives call:incoming and stores it in
          useCallStore.incomingCall.

          CallModal subscribes to that Zustand state and renders the
          Accept / Reject UI.
      ==================================================================== */}

      <CallModal />


      {/* ====================================================================
          TOP BAR
      ==================================================================== */}

      <header
        className="messages-page__topbar"
      >

        <div
          className="messages-page__topbar-title"
        >

          <h1>
            Fockis Messages
          </h1>

        </div>


        {/* ==================================================================
            FOCKIS ID BUTTON

            Opens the existing paid Fockis ID access page.

            The actual Fockis ID is NOT handled here.
            The Fockis ID page controls:

              - access status
              - configured price
              - Stripe Checkout
              - webhook confirmation
              - revealing the existing Fockis ID
        ================================================================== */}

        <button
          type="button"
          className="messages-page__fockis-id-button"
          onClick={
            handleOpenFockisId
          }
          aria-label="Open my Fockis ID"
          title="My Fockis ID"
        >

          <span
            className="messages-page__fockis-id-button-icon"
            aria-hidden="true"
          >
            #
          </span>

          <span>
            Fockis ID
          </span>

        </button>

      </header>


      {/* ====================================================================
          MAIN MESSAGES LAYOUT
      ==================================================================== */}

      <div
        className={[
          "messages-page__layout",

          mobileView === "chat"
            ? "mobile-show-chat"
            : "mobile-show-list",

          infoOpen
            ? "info-open"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >

        {/* ================================================================
            CONVERSATION LIST
        ================================================================ */}

        <aside
          className="messages-page__conversations"
        >

          <ConversationList
            activeConversationId={
              activeConversationId
            }

            onSelect={
              handleSelect
            }
          />

        </aside>


        {/* ================================================================
            CHAT
        ================================================================ */}

        <main
          className="messages-page__chat"
        >

          {active ? (

            <ChatBox
              conversation={
                active.conversation
              }

              participant={
                active.participant
              }

              title={
                active.title
              }

              avatar={
                active.avatar
              }

              onBack={
                handleBack
              }

              onToggleInfo={
                handleToggleInfo
              }

              infoOpen={
                infoOpen
              }
            />

          ) : (

            /*
             * Do not show the normal "Start a conversation" empty state
             * while a conversation is actively being created/opened.
             *
             * This prevents the UI from misleading the user during the
             * short period between selecting/creating a conversation and
             * receiving it from the conversation store.
             */

            activeConversationId ? (

              <div
                className="empty-conversation"
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: "10px",
                  padding: "24px",
                  textAlign: "center",
                }}
              >

                <strong>
                  Opening conversation…
                </strong>

                <span>
                  Loading your secure Fockis conversation.
                </span>

              </div>

            ) : (

              <EmptyConversation />

            )

          )}

        </main>


        {/* ================================================================
            CHAT INFORMATION PANEL
        ================================================================ */}

        {active &&
          infoOpen && (

            <aside
              className="messages-page__info"
            >

              <ChatInfoPanel
                conversation={
                  active.conversation
                }

                participant={
                  active.participant
                }

                title={
                  active.title
                }

                avatar={
                  active.avatar
                }

                messages={
                  messages
                }

                onClose={
                  handleCloseInfo
                }

                onOpenImage={
                  handleOpenInfoImage
                }
              />

            </aside>

          )}

      </div>


      {/* ====================================================================
          MEDIA VIEWER
      ==================================================================== */}

      {infoViewer.open && (

        <MediaViewer
          items={
            infoViewer.items
          }

          index={
            infoViewer.index
          }

          zoom={
            infoViewer.zoom
          }

          onClose={
            infoViewer.close
          }

          onNext={
            infoViewer.next
          }

          onPrev={
            infoViewer.prev
          }

          onToggleZoom={
            infoViewer.toggleZoom
          }
        />

      )}

    </div>

  );
}