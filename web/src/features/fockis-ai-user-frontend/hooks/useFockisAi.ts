import {

  useCallback,

  useEffect,

  useState,

} from "react";



import { fockisAiApi } from "../api/fockisAiApi";

import { vapiClient } from "../services/vapiClient";



import type {

  AiConversation,

  AiMessage,

  AiConnection,

  AiVoiceStatus,

} from "../types/fockisAi.types";



const prefix = "fockis-ai-messages-";



const createId = () => crypto.randomUUID();



/* ============================================================

   SHOP TYPES

   ============================================================ */



export type FockisShopResultType =

  | "product"

  | "store"

  | "business";



export interface FockisShopResult {

  id: string;

  type: FockisShopResultType;

  title: string;

  description?: string;



  price?: number;

  stock?: number;



  image?: string;



  location?: {

    city?: string;

    state?: string;

    country?: string;

  };



  urls?: {

    product?: string;

    marketplace?: string;

    store?: string;

    business?: string;

  };



  store?: {

    name?: string;

    slug?: string;

    verified?: boolean;



    location?: {

      city?: string;

      state?: string;

      country?: string;

    };

  };



  metadata?: {

    category?: string;

    brand?: string;

    rating?: number;

    totalReviews?: number;

    discount?: number;

    discountPrice?: number;

    displayLocations?: string[];

    verified?: boolean;

    followers?: number;

  };

}



export interface FockisShopPayload {

  tool?:

    | "search_fockis_products"

    | "search_fockis_stores"

    | "search_fockis_businesses";



  query?: string;



  count?: number;



  results?: FockisShopResult[];



  searchedLiveDatabase?: boolean;

}



/* ============================================================

   EXTENDED MESSAGE DATA

   ============================================================ */



type AiMessageWithShop = AiMessage & {

  shopResults?: FockisShopPayload;

};



/* ============================================================

   LOAD MESSAGES

   ============================================================ */



const loadMessages = (

  conversationId: string,

): AiMessage[] => {

  try {

    return JSON.parse(

      localStorage.getItem(

        prefix + conversationId,

      ) || "[]",

    ) as AiMessage[];

  } catch {

    return [];

  }

};



/* ============================================================

   SAVE MESSAGES

   ============================================================ */



const saveMessages = (

  conversationId: string,

  messages: AiMessage[],

) => {

  localStorage.setItem(

    prefix + conversationId,

    JSON.stringify(messages),

  );

};



/* ============================================================

   ERROR HANDLING

   ============================================================ */



const getErrorMessage = (

  error: unknown,

): string => {

  if (

    error instanceof Error &&

    error.message.trim()

  ) {

    return error.message.trim();

  }



  if (

    typeof error === "object" &&

    error !== null

  ) {

    const candidate = error as {

      message?: unknown;

      error?: unknown;

      response?: {

        message?: unknown;

      };

    };



    if (

      typeof candidate.message === "string" &&

      candidate.message.trim()

    ) {

      return candidate.message.trim();

    }



    if (

      typeof candidate.response?.message ===

        "string" &&

      candidate.response.message.trim()

    ) {

      return candidate.response.message.trim();

    }



    if (

      typeof candidate.error === "string" &&

      candidate.error.trim()

    ) {

      return candidate.error.trim();

    }

  }



  return "Fockis AI connection failed.";

};



/* ============================================================

   SHOP PAYLOAD DETECTION

   ============================================================ */



const isShopTool = (

  value: unknown,

): value is FockisShopPayload["tool"] => {

  return (

    value === "search_fockis_products" ||

    value === "search_fockis_stores" ||

    value === "search_fockis_businesses"

  );

};



const isShopPayload = (

  value: unknown,

): value is FockisShopPayload => {

  if (

    !value ||

    typeof value !== "object"

  ) {

    return false;

  }



  const candidate =

    value as Record<string, unknown>;



  return (

    isShopTool(candidate.tool) &&

    Array.isArray(candidate.results)

  );

};



/* ============================================================

   PARSE SHOP JSON

   ============================================================ */



const parseShopPayload = (

  value: unknown,

): FockisShopPayload | undefined => {

  if (!value) {

    return undefined;

  }



  if (isShopPayload(value)) {

    return value;

  }



  if (typeof value !== "string") {

    return undefined;

  }



  const text = value.trim();



  if (!text) {

    return undefined;

  }



  /*

   * Direct JSON.

   */

  try {

    const parsed: unknown =

      JSON.parse(text);



    if (isShopPayload(parsed)) {

      return parsed;

    }

  } catch {

    // Continue.

  }



  /*

   * Sometimes the backend/AI may put a sentence

   * before the JSON object.

   */

  const toolNames = [

    "search_fockis_products",

    "search_fockis_stores",

    "search_fockis_businesses",

  ];



  for (const toolName of toolNames) {

    const marker = `{"tool":"${toolName}"`;



    const index = text.indexOf(marker);



    if (index < 0) {

      continue;

    }



    const candidate = text.slice(index);



    try {

      const parsed: unknown =

        JSON.parse(candidate);



      if (isShopPayload(parsed)) {

        return parsed;

      }

    } catch {

      /*

       * The JSON may be surrounded by additional

       * assistant text. Try to extract the largest

       * balanced JSON object.

       */

      const firstBrace =

        candidate.indexOf("{");



      const lastBrace =

        candidate.lastIndexOf("}");



      if (

        firstBrace >= 0 &&

        lastBrace > firstBrace

      ) {

        try {

          const jsonText =

            candidate.slice(

              firstBrace,

              lastBrace + 1,

            );



          const parsed: unknown =

            JSON.parse(jsonText);



          if (isShopPayload(parsed)) {

            return parsed;

          }

        } catch {

          // Not valid Shop JSON.

        }

      }

    }

  }



  return undefined;

};



/* ============================================================

   NORMALIZE SHOP RESULT

   ============================================================ */



const normalizeShopPayload = (

  payload: FockisShopPayload,

): FockisShopPayload => {

  return {

    tool: payload.tool,



    query:

      typeof payload.query === "string"

        ? payload.query

        : "",



    count:

      typeof payload.count === "number"

        ? payload.count

        : Array.isArray(payload.results)

          ? payload.results.length

          : 0,



    searchedLiveDatabase:

      payload.searchedLiveDatabase === true,



    results: Array.isArray(payload.results)

      ? payload.results

      : [],

  };

};



/* ============================================================

   EXTRACT SHOP RESULTS FROM BACKEND RESPONSE

   ============================================================ */



const extractShopPayload = (

  response: unknown,

): FockisShopPayload | undefined => {

  if (

    !response ||

    typeof response !== "object"

  ) {

    return undefined;

  }



  const candidate =

    response as Record<string, unknown>;



  /*

   * Possible response:

   *

   * {

   *   shopResults: {...}

   * }

   */

  if (

    candidate.shopResults &&

    isShopPayload(candidate.shopResults)

  ) {

    return normalizeShopPayload(

      candidate.shopResults,

    );

  }



  /*

   * Possible response:

   *

   * {

   *   shop: {...}

   * }

   */

  if (

    candidate.shop &&

    isShopPayload(candidate.shop)

  ) {

    return normalizeShopPayload(

      candidate.shop,

    );

  }



  /*

   * Possible response:

   *

   * {

   *   discovery: {...}

   * }

   */

  if (

    candidate.discovery &&

    isShopPayload(candidate.discovery)

  ) {

    return normalizeShopPayload(

      candidate.discovery,

    );

  }



  /*

   * Most important fallback:

   *

   * response.content

   *

   * Check this BEFORE isShopPayload(candidate).

   * The type guard can narrow candidate to never

   * after a failed branch, which breaks candidate.content.

   */

  const responseContent = candidate.content;

  if (typeof responseContent === "string") {

    const parsed = parseShopPayload(responseContent);

    if (parsed) {

      return normalizeShopPayload(parsed);

    }

  }

  /*

   * Backend may return the Shop payload itself.

   */

  if (isShopPayload(candidate)) {

    return normalizeShopPayload(candidate);

  }



  return undefined;

};



/* ============================================================

   HOOK

   ============================================================ */



export function useFockisAi() {

  const [

    conversations,

    setConversations,

  ] = useState<AiConversation[]>([]);



  const [

    activeId,

    setActiveId,

  ] = useState("");



  const [

    messages,

    setMessages,

  ] = useState<AiMessage[]>([]);



  const [

    connection,

    setConnection,

  ] = useState<AiConnection>("ready");



  const [

    voiceStatus,

    setVoiceStatus,

  ] = useState<AiVoiceStatus>("idle");



  const [

    sending,

    setSending,

  ] = useState(false);



  const [

    error,

    setError,

  ] = useState("");



  /*

   * Stores the Vapi chat ID for each Fockis

   * conversation.

   */

  const [

    vapiChatIds,

    setVapiChatIds,

  ] = useState<Record<string, string>>({});



  /* ==========================================================

     SYNCHRONIZE

     ========================================================== */



  const sync = useCallback(

    (

      conversationId: string,

      nextMessages: AiMessage[],

    ) => {

      saveMessages(

        conversationId,

        nextMessages,

      );



      setMessages(nextMessages);



      setConversations(

        (current) =>

          current.map(

            (conversation) =>

              conversation.id ===

              conversationId

                ? {

                    ...conversation,

                    messages:

                      nextMessages,

                    messageCount:

                      nextMessages.length,

                    updatedAt:

                      new Date().toISOString(),

                  }

                : conversation,

          ),

      );



      void fockisAiApi.touch(

        conversationId,

        nextMessages.length,

      );

    },

    [],

  );



  /* ==========================================================

     CREATE CONVERSATION

     ========================================================== */



  const create = useCallback(

    async () => {

      try {

        const item =

          await fockisAiApi.create(

            "New conversation",

          );



        const conversation: AiConversation =

          {

            ...item,

            messages: [],

          };



        setConversations(

          (current) => [

            conversation,

            ...current,

          ],

        );



        setActiveId(

          conversation.id,

        );



        setMessages([]);



        setError("");



        setVapiChatIds(

          (current) => {

            const next = {

              ...current,

            };



            delete next[

              conversation.id

            ];



            return next;

          },

        );

      } catch (error) {

        const message =

          getErrorMessage(error);



        console.error(

          "[FOCKIS AI] Create conversation error:",

          error,

        );



        setError(message);

      }

    },

    [],

  );



  /* ==========================================================

     LOAD CONVERSATIONS

     ========================================================== */



  useEffect(() => {

    let cancelled = false;



    const initialize = async () => {

      try {

        const rows =

          await fockisAiApi.list();



        if (cancelled) {

          return;

        }



        if (!rows.length) {

          await create();

          return;

        }



        const loaded: AiConversation[] =

          rows.map(

            (conversation) => ({

              ...conversation,

              messages:

                loadMessages(

                  conversation.id,

                ),

            }),

          );



        if (cancelled) {

          return;

        }



        setConversations(loaded);



        const first =

          loaded[0];



        if (first) {

          setActiveId(first.id);



          setMessages(

            first.messages || [],

          );

        }

      } catch (error) {

        if (cancelled) {

          return;

        }



        const message =

          getErrorMessage(error);



        console.error(

          "[FOCKIS AI] Load conversations error:",

          error,

        );



        setError(message);

      }

    };



    void initialize();



    return () => {

      cancelled = true;

    };

  }, [create]);



  /* ==========================================================

     VAPI

     ========================================================== */



  useEffect(() => {

    vapiClient.init(

      (message: any) => {

        const role =

          message?.message?.role ||

          message?.role;



        const content =

          message?.message?.content ??

          message?.content;



        if (

          role !== "assistant" ||

          !content ||

          !activeId

        ) {

          return;

        }



        setVoiceStatus(

          "speaking",

        );



        setMessages(

          (current) => {

            const last =

              current[

                current.length - 1

              ];



            let next: AiMessage[];



            if (

              last?.role ===

                "assistant" &&

              last.status ===

                "sending"

            ) {

              next = current.map(

                (

                  item,

                  index,

                ) =>

                  index ===

                  current.length - 1

                    ? {

                        ...item,

                        content:

                          String(

                            content,

                          ),

                        status:

                          "sent" as const,

                      }

                    : item,

              );

            } else {

              next = [

                ...current,

                {

                  id: createId(),

                  role: "assistant",

                  content:

                    String(content),

                  createdAt:

                    new Date().toISOString(),

                  status: "sent",

                },

              ];

            }



            saveMessages(

              activeId,

              next,

            );



            return next;

          },

        );

      },



      (status) => {

        if (

          status ===

          "unconfigured"

        ) {

          setConnection(

            "offline",

          );

        } else if (

          status === "ready" ||

          status === "ended"

        ) {

          setConnection(

            "ready",

          );

        } else if (

          status === "connecting"

        ) {

          setConnection(

            "connecting",

          );

        } else if (

          status === "connected"

        ) {

          setConnection(

            "connected",

          );

        } else {

          setConnection(

            "error",

          );

        }



        if (

          status === "connecting"

        ) {

          setVoiceStatus(

            "connecting",

          );

        }



        if (

          status === "connected"

        ) {

          setVoiceStatus(

            "listening",

          );

        }



        if (

          status === "ended"

        ) {

          setVoiceStatus(

            "ended",

          );

        }



        if (

          status === "error"

        ) {

          setVoiceStatus(

            "error",

          );

        }

      },



      (voiceError) => {

        console.error(

          "[FOCKIS AI] Vapi error:",

          voiceError,

        );



        setConnection(

          "error",

        );



        setVoiceStatus(

          "error",

        );



        setError(

          getErrorMessage(

            voiceError,

          ),

        );

      },

    );



    return () => {

      /*

       * Keep Vapi alive when changing

       * conversations.

       */

    };

  }, [activeId]);



  /* ==========================================================

     TEXT CHAT

     ========================================================== */



  const send = useCallback(

    async (text: string) => {

      const trimmed =

        text.trim();



      if (

        !trimmed ||

        !activeId ||

        sending

      ) {

        return;

      }



      setSending(true);

      setError("");



      const userMessage: AiMessage =

        {

          id: createId(),

          role: "user",

          content: trimmed,

          createdAt:

            new Date().toISOString(),

          status: "sent",

        };



      const assistantPlaceholder: AiMessage =

        {

          id: createId(),

          role: "assistant",

          content:

            "Thinking…",

          createdAt:

            new Date().toISOString(),

          status: "sending",

        };



      const nextMessages: AiMessage[] =

        [

          ...messages,

          userMessage,

          assistantPlaceholder,

        ];



      sync(

        activeId,

        nextMessages,

      );



      try {

        const response =

          await fockisAiApi.chat(

            trimmed,

            activeId,

          );



        const responseRecord =
          response !== null &&
          typeof response === "object"
            ? (response as Record<string, unknown>)
            : undefined;



        /*

         * Store Vapi chat ID if supplied.

         */

        if (typeof responseRecord?.chatId === "string") {
          const chatId = responseRecord.chatId;

          if (chatId.trim()) {

            setVapiChatIds(

              (current) => ({

                ...current,

                [activeId]:

                  chatId,

              }),

            );

          }

        }



        /*

         * Extract normal assistant content.

         */

        const responseContent =
          typeof responseRecord?.content === "string"
            ? responseRecord.content
            : "";



        const assistantContent =

          typeof responseContent ===

              "string" &&

            responseContent.trim()

            ? responseContent.trim()

            : "I received your message.";



        /*

         * ======================================================

         * SHOP DISCOVERY

         * ======================================================

         *

         * Look for structured Shop data in the

         * backend response first.

         */

        const shopPayload =

          extractShopPayload(

            response,

          );



        /*

         * If the backend returned Shop JSON

         * inside content, preserve it as structured

         * message metadata.

         */

        let assistantMessage:

          AiMessageWithShop = {

            ...assistantPlaceholder,

            content:

              assistantContent,

            status:

              "sent" as const,

          };



        if (shopPayload) {

          assistantMessage = {

            ...assistantMessage,

            shopResults:

              shopPayload,

          };

        }



        const completedMessages =

          nextMessages.map(

            (message, index) =>

              index ===

              nextMessages.length - 1

                ? assistantMessage

                : message,

          );



        sync(

          activeId,

          completedMessages,

        );



        setConnection("ready");

      } catch (error) {

        console.error(

          "[FOCKIS AI] Text chat error:",

          error,

        );



        const errorMessage =

          getErrorMessage(error);



        console.error(

          "[FOCKIS AI] Actual error:",

          errorMessage,

        );



        const failedMessages =

          nextMessages.map(

            (message, index) =>

              index ===

              nextMessages.length - 1

                ? {

                    ...message,

                    content:

                      `Fockis AI error: ${errorMessage}`,

                    status:

                      "error" as const,

                  }

                : message,

          );



        sync(

          activeId,

          failedMessages,

        );



        setConnection(

          "error",

        );



        setError(

          errorMessage,

        );

      } finally {

        setSending(false);

      }

    },

    [

      activeId,

      messages,

      sending,

      sync,

    ],

  );



  /* ==========================================================

     START VOICE

     ========================================================== */



  const startVoice =

    useCallback(

      async () => {

        try {

          setError("");



          setVoiceStatus(

            "connecting",

          );



          setConnection(

            "connecting",

          );



          await vapiClient.start();



          setConnection(

            "connected",

          );



          setVoiceStatus(

            "listening",

          );

        } catch (error) {

          console.error(

            "[FOCKIS AI] Voice start error:",

            error,

          );



          const message =

            getErrorMessage(

              error,

            );



          setConnection(

            "error",

          );



          setVoiceStatus(

            "error",

          );



          setError(message);

        }

      },

      [],

    );



  /* ==========================================================

     STOP VOICE

     ========================================================== */



  const stopVoice =

    useCallback(

      async () => {

        try {

          await vapiClient.stop();



          setVoiceStatus(

            "ended",

          );



          setConnection(

            "ready",

          );

        } catch (error) {

          console.error(

            "[FOCKIS AI] Voice stop error:",

            error,

          );



          setVoiceStatus(

            "error",

          );



          setConnection(

            "error",

          );



          setError(

            getErrorMessage(

              error,

            ),

          );

        }

      },

      [],

    );



  /* ==========================================================

     SELECT CONVERSATION

     ========================================================== */



  const select =

    useCallback(

      (conversationId: string) => {

        setActiveId(

          conversationId,

        );



        setMessages(

          loadMessages(

            conversationId,

          ),

        );



        setError("");

      },

      [],

    );



  /* ==========================================================

     RENAME

     ========================================================== */



  const rename =

    useCallback(

      async (

        conversationId: string,

        title: string,

      ) => {

        const nextTitle =

          title.trim() ||

          "New conversation";



        await fockisAiApi.rename(

          conversationId,

          nextTitle,

        );



        setConversations(

          (current) =>

            current.map(

              (conversation) =>

                conversation.id ===

                conversationId

                  ? {

                      ...conversation,

                      title:

                        nextTitle,

                    }

                  : conversation,

            ),

        );

      },

      [],

    );



  /* ==========================================================

     DELETE

     ========================================================== */



  const remove =

    useCallback(

      async (

        conversationId: string,

      ) => {

        await fockisAiApi.remove(

          conversationId,

        );



        localStorage.removeItem(

          prefix +

            conversationId,

        );



        setVapiChatIds(

          (current) => {

            const next = {

              ...current,

            };



            delete next[

              conversationId

            ];



            return next;

          },

        );



        const remaining =

          conversations.filter(

            (conversation) =>

              conversation.id !==

              conversationId,

          );



        if (!remaining.length) {

          await create();

          return;

        }



        setConversations(

          remaining,

        );



        if (

          conversationId ===

          activeId

        ) {

          const nextConversation =

            remaining[0];



          if (nextConversation) {

            setActiveId(

              nextConversation.id,

            );



            setMessages(

              nextConversation.messages ||

                [],

            );

          }

        }

      },

      [

        conversations,

        activeId,

        create,

      ],

    );



  /* ==========================================================

     RETURN

     ========================================================== */



  return {

    conversations,



    activeId,



    messages,



    activeConversation:

      conversations.find(

        (conversation) =>

          conversation.id ===

          activeId,

      ),



    connection,



    voiceStatus,



    sending,



    error,



    send,



    startVoice,



    stopVoice,



    create,



    select,



    rename,



    remove,

  };

}