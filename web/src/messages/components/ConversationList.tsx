import { FOCKIS_API_URL } from "../../config/fockisConfig";

import {
  Search,
  SquarePen,
  X,
  UserRound,
  MessageCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";

import {
  useState,
  type FormEvent,
} from "react";

import {
  useConversations,
} from "../hooks/useConversations";

import ConversationItem from "./ConversationItem";

import "../styles/conversation-list.scss";


/* ============================================================================
   TYPES
============================================================================ */

interface ConversationListProps {
  activeConversationId: string | null;
  onSelect: (id: string) => void;
}


interface FockisUser {
  id: string;
  fockisId: string;
  username: string;
  firstName: string;
  lastName: string;
  name: string;
  displayName: string;
  profilePicture: string | null;
  avatar: string | null;
  bio: string;
  online: boolean;
  presence: "online" | "offline";
  lastSeen: string;
  verified: boolean;
  premium: boolean;
  accountType: string;
  isActive: boolean;
}


/* ============================================================================
   API HELPERS
============================================================================ */

function getApiBase(): string {
  const configured =
    import.meta.env.VITE_API_URL as
      | string
      | undefined;

  return (
    configured ||
    FOCKIS_API_URL
  ).replace(/\/+$/, "");
}


function getAccessToken(): string {
  const keys = [
    "access_token",
    "token",
    "jwt",
    "authToken",
  ];

  for (const key of keys) {
    const value =
      localStorage.getItem(key);

    if (value) {
      return value;
    }
  }

  return "";
}


/* ============================================================================
   FOCKIS ID NORMALIZATION
============================================================================ */

function normalizeFockisId(
  value: string,
): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/-/g, "");
}


function isValidFockisId(
  value: string,
): boolean {
  return /^FK[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(
    value,
  );
}


/* ============================================================================
   COMPONENT
============================================================================ */

export default function ConversationList({
  activeConversationId,
  onSelect,
}: ConversationListProps) {

  /* ==========================================================================
     CONVERSATIONS

     IMPORTANT:
     Use the same hook that MessagesPage uses.

     This prevents the new conversation from being created in one Zustand
     subscription while MessagesPage is reading a stale/different view.
  ========================================================================== */

  const {
    items,
    loading,
    startConversationWith,
  } = useConversations();


  /* ==========================================================================
     LOCAL STATE
  ========================================================================== */

  const [
    query,
    setQuery,
  ] = useState("");


  const [
    composeOpen,
    setComposeOpen,
  ] = useState(false);


  const [
    fockisIdInput,
    setFockisIdInput,
  ] = useState("");


  const [
    foundUser,
    setFoundUser,
  ] = useState<FockisUser | null>(
    null,
  );


  const [
    searching,
    setSearching,
  ] = useState(false);


  const [
    creatingConversation,
    setCreatingConversation,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  /* ==========================================================================
     FILTER
  ========================================================================== */

  const normalizedQuery =
    query
      .trim()
      .toLowerCase();


  const filtered =
    items.filter(
      (item) =>
        item.title
          .toLowerCase()
          .includes(
            normalizedQuery,
          ),
    );


  /* ==========================================================================
     CLOSE COMPOSE
  ========================================================================== */

  const closeCompose = () => {

    if (
      searching ||
      creatingConversation
    ) {
      return;
    }


    setComposeOpen(false);

    setFockisIdInput("");

    setFoundUser(null);

    setError("");

  };


  /* ==========================================================================
     FIND USER BY FOCKIS ID
  ========================================================================== */

  const handleFindUser = async (
    event?: FormEvent,
  ) => {

    event?.preventDefault();


    const normalizedFockisId =
      normalizeFockisId(
        fockisIdInput,
      );


    setError("");

    setFoundUser(null);


    if (
      !isValidFockisId(
        normalizedFockisId,
      )
    ) {

      setError(
        "Enter a valid 8-character Fockis ID, for example FK7Q2M8A.",
      );

      return;
    }


    const token =
      getAccessToken();


    if (!token) {

      setError(
        "Your session has expired. Please sign in again.",
      );

      return;
    }


    setSearching(true);


    try {

      const url =
        `${getApiBase()}/users/fockis/${encodeURIComponent(
          normalizedFockisId,
        )}`;


      console.log(
        "[FOCKIS MESSAGES] Finding Fockis user:",
        {
          fockisId:
            normalizedFockisId,
          url,
        },
      );


      const response =
        await fetch(
          url,
          {
            method: "GET",

            headers: {
              Accept:
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },
          },
        );


      let data: any = null;


      try {

        data =
          await response.json();

      } catch {

        data = null;

      }


      console.log(
        "[FOCKIS MESSAGES] Fockis lookup response:",
        {
          status:
            response.status,
          ok:
            response.ok,
          data,
        },
      );


      if (!response.ok) {

        const serverMessage =
          data?.message ||
          data?.error;


        throw new Error(
          Array.isArray(
            serverMessage,
          )
            ? serverMessage.join(
                ", ",
              )
            : typeof serverMessage ===
                "string"
              ? serverMessage
              : response.status ===
                  404
                ? "No Fockis user was found with that ID."
                : "Unable to find this Fockis user.",
        );
      }


      const user =
        data?.user ||
        data?.data?.user ||
        data?.data ||
        data;


      if (
        !user?.id ||
        !user?.fockisId
      ) {

        throw new Error(
          "The server returned an invalid Fockis user.",
        );

      }


      const resolvedFockisId =
        String(
          user.fockisId,
        ).toUpperCase();


      setFoundUser({

        id:
          String(
            user.id,
          ),

        fockisId:
          resolvedFockisId,

        username:
          String(
            user.username ||
              "",
          ),

        firstName:
          String(
            user.firstName ||
              "",
          ),

        lastName:
          String(
            user.lastName ||
              "",
          ),

        name:
          String(
            user.name ||
              user.displayName ||
              user.username ||
              "Fockis user",
          ),

        displayName:
          String(
            user.displayName ||
              user.name ||
              user.username ||
              "Fockis user",
          ),

        profilePicture:
          user.profilePicture ||
          null,

        avatar:
          user.avatar ||
          user.profilePicture ||
          null,

        bio:
          String(
            user.bio ||
              "",
          ),

        online:
          Boolean(
            user.online,
          ),

        presence:
          user.presence ===
          "online"
            ? "online"
            : "offline",

        lastSeen:
          String(
            user.lastSeen ||
              "",
          ),

        verified:
          Boolean(
            user.verified,
          ),

        premium:
          Boolean(
            user.premium,
          ),

        accountType:
          String(
            user.accountType ||
              "user",
          ),

        isActive:
          user.isActive !==
          false,

      });

    } catch (lookupError) {

      console.error(
        "[FOCKIS MESSAGES] Fockis ID lookup failed:",
        lookupError,
      );


      setError(
        lookupError instanceof Error
          ? lookupError.message
          : "Unable to find this Fockis user.",
      );

    } finally {

      setSearching(false);

    }

  };


  /* ==========================================================================
     START CONVERSATION

     IMPORTANT:

     This is now the complete handoff:

       Fockis ID
          ↓
       foundUser.id
          ↓
       startConversationWith(internal user ID)
          ↓
       conversation inserted into Zustand
          ↓
       active conversation selected
          ↓
       MessagesPage renders ChatBox
  ========================================================================== */

  const handleStartConversation =
    async () => {

      if (
        !foundUser?.id
      ) {

        setError(
          "Please find a Fockis user first.",
        );

        return;
      }


      const participantId =
        String(
          foundUser.id,
        ).trim();


      if (!participantId) {

        setError(
          "The selected Fockis user has no internal user ID.",
        );

        return;
      }


      setError("");

      setCreatingConversation(
        true,
      );


      try {

        console.log(
          "[FOCKIS MESSAGES] Creating conversation:",
          {
            fockisId:
              foundUser.fockisId,

            participantId,

            displayName:
              foundUser.displayName,
          },
        );


        /*
         * IMPORTANT:
         *
         * Fockis ID is public and is only used for lookup.
         *
         * The conversation endpoint receives the internal user ID.
         */
        const conversationId =
          await startConversationWith(
            participantId,
          );


        if (!conversationId) {

          throw new Error(
            "The conversation was created, but the server did not return a conversation ID.",
          );

        }


        const normalizedConversationId =
          String(
            conversationId,
          ).trim();


        if (
          !normalizedConversationId
        ) {

          throw new Error(
            "The returned conversation ID is empty.",
          );

        }


        console.log(
          "[FOCKIS MESSAGES] Conversation ready:",
          {
            conversationId:
              normalizedConversationId,

            participantId,

            fockisId:
              foundUser.fockisId,
          },
        );


        /*
         * IMPORTANT:
         *
         * Select the conversation BEFORE closing the modal.
         *
         * MessagesPage receives this through onSelect().
         */
        onSelect(
          normalizedConversationId,
        );


        /*
         * Only close the modal after the conversation has successfully
         * been handed to MessagesPage.
         */
        setComposeOpen(false);

        setFockisIdInput("");

        setFoundUser(null);

        setError("");

      } catch (
        conversationError
      ) {

        console.error(
          "[FOCKIS MESSAGES] Failed to create conversation:",
          conversationError,
        );


        setError(
          conversationError instanceof Error
            ? conversationError.message
            : "Unable to start the conversation.",
        );

      } finally {

        setCreatingConversation(
          false,
        );

      }

    };


  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (

    <div className="conversation-list">

      {/* ====================================================================
          HEADER
      ==================================================================== */}

      <div className="conversation-list__header">

        <h1>
          Messages
        </h1>


        <button
          type="button"
          className="conversation-list__compose-btn"
          aria-label="New message"
          title="New message"
          onClick={() => {

            setComposeOpen(true);

            setError("");

            setFoundUser(null);

          }}
        >

          <SquarePen
            size={18}
          />

        </button>

      </div>


      {/* ====================================================================
          SEARCH
      ==================================================================== */}

      <div className="conversation-list__search">

        <Search
          size={16}
        />

        <input
          type="text"
          placeholder="Search conversations"
          value={query}
          onChange={(event) =>
            setQuery(
              event.target.value,
            )
          }
        />

      </div>


      {/* ====================================================================
          CONVERSATIONS
      ==================================================================== */}

      <div className="conversation-list__scroll">

        {loading && (

          <div className="conversation-list__skeletons">

            {Array.from({
              length: 6,
            }).map(
              (_, index) => (

                <div
                  key={index}
                  className="conversation-skeleton"
                >

                  <span className="conversation-skeleton__avatar" />

                  <span className="conversation-skeleton__lines">

                    <span />

                    <span />

                  </span>

                </div>

              ),
            )}

          </div>

        )}


        {!loading &&
          filtered.length === 0 && (

            <div className="conversation-list__empty">

              {normalizedQuery
                ? "No conversations found"
                : "No conversations yet"}

            </div>

          )}


        {!loading &&
          filtered.length > 0 &&

          filtered.map(
            ({
              conversation,
              participant,
              title,
              avatar,
              preview,
            }) => (

              <ConversationItem
                key={
                  conversation.id
                }

                conversation={
                  conversation
                }

                participant={
                  participant
                }

                title={
                  title
                }

                avatar={
                  avatar
                }

                preview={
                  preview
                }

                active={
                  String(
                    conversation.id,
                  ) ===
                  String(
                    activeConversationId,
                  )
                }

                onClick={() =>
                  onSelect(
                    String(
                      conversation.id,
                    ),
                  )
                }
              />

            ),
          )}

      </div>


      {/* ====================================================================
          NEW MESSAGE MODAL
      ==================================================================== */}

      {composeOpen && (

        <div
          className="conversation-list__compose-overlay"
          role="presentation"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {

              closeCompose();

            }

          }}
        >

          <div
            className="conversation-list__compose-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-message-title"
          >

            {/* ==============================================================
                MODAL HEADER
            ============================================================== */}

            <div className="conversation-list__compose-modal-header">

              <div>

                <span className="conversation-list__compose-eyebrow">
                  Fockis Messages
                </span>

                <h2 id="new-message-title">
                  New message
                </h2>

              </div>


              <button
                type="button"
                className="conversation-list__compose-close"
                onClick={
                  closeCompose
                }
                disabled={
                  searching ||
                  creatingConversation
                }
                aria-label="Close"
              >

                <X
                  size={20}
                />

              </button>

            </div>


            {/* ==============================================================
                FOCKIS ID FORM
            ============================================================== */}

            <form
              onSubmit={
                handleFindUser
              }
            >

              <label
                htmlFor="new-message-fockis-id"
                className="conversation-list__compose-label"
              >
                Fockis ID
              </label>


              <div className="conversation-list__compose-input-wrap">

                <UserRound
                  size={18}
                />


                <input
                  id="new-message-fockis-id"
                  type="text"
                  value={
                    fockisIdInput
                  }
                  onChange={(event) => {

                    setFockisIdInput(
                      event.target.value
                        .toUpperCase(),
                    );

                    setFoundUser(
                      null,
                    );

                    setError("");

                  }}
                  placeholder="FK7Q2M8A"
                  maxLength={9}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  disabled={
                    searching ||
                    creatingConversation
                  }
                />

              </div>


              <p className="conversation-list__compose-help">

                Enter the 8-character Fockis ID
                of the person you want to message.

              </p>


              <button
                type="submit"
                className="conversation-list__compose-find-btn"
                disabled={
                  searching ||
                  creatingConversation ||
                  !fockisIdInput.trim()
                }
              >

                {searching ? (

                  <>

                    <Loader2
                      size={17}
                      className="conversation-list__spin"
                    />

                    Finding user...

                  </>

                ) : (

                  <>

                    <Search
                      size={17}
                    />

                    Find user

                  </>

                )}

              </button>

            </form>


            {/* ==============================================================
                ERROR
            ============================================================== */}

            {error && (

              <div
                className="conversation-list__compose-error"
                role="alert"
              >

                {error}

              </div>

            )}


            {/* ==============================================================
                FOUND USER
            ============================================================== */}

            {foundUser && (

              <div className="conversation-list__found-user">

                <div className="conversation-list__found-user-main">

                  <div className="conversation-list__found-avatar">

                    {foundUser.avatar ? (

                      <img
                        src={
                          foundUser.avatar
                        }
                        alt={
                          foundUser.displayName
                        }
                      />

                    ) : (

                      <UserRound
                        size={24}
                      />

                    )}


                    {foundUser.online && (

                      <span className="conversation-list__found-online" />

                    )}

                  </div>


                  <div className="conversation-list__found-details">

                    <div className="conversation-list__found-name">

                      <strong>
                        {
                          foundUser.displayName
                        }
                      </strong>


                      {foundUser.verified && (

                        <CheckCircle2
                          size={16}
                        />

                      )}

                    </div>


                    {foundUser.username && (

                      <span className="conversation-list__found-username">

                        @
                        {
                          foundUser.username
                        }

                      </span>

                    )}


                    <span className="conversation-list__found-fockis-id">

                      {
                        foundUser.fockisId
                      }

                    </span>


                    {foundUser.bio && (

                      <p className="conversation-list__found-bio">

                        {
                          foundUser.bio
                        }

                      </p>

                    )}

                  </div>

                </div>


                {/* ==========================================================
                    MESSAGE BUTTON
                ========================================================== */}

                <button
                  type="button"
                  className="conversation-list__message-user-btn"
                  onClick={
                    handleStartConversation
                  }
                  disabled={
                    creatingConversation
                  }
                >

                  {creatingConversation ? (

                    <>

                      <Loader2
                        size={17}
                        className="conversation-list__spin"
                      />

                      Opening...

                    </>

                  ) : (

                    <>

                      <MessageCircle
                        size={17}
                      />

                      Message

                    </>

                  )}

                </button>

              </div>

            )}

          </div>

        </div>

      )}

    </div>

  );
}