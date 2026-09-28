import {

  BadRequestException,

  Injectable,

  Logger,

  ServiceUnavailableException,

} from "@nestjs/common";



import { ConfigService } from "@nestjs/config";



import { config as loadDotenv } from "dotenv";



import { existsSync } from "fs";



import { resolve } from "path";



import { AiDiscoveryService } from "../discovery/ai-discovery.service";



import type {

  AiDiscoveryTool,

} from "../discovery/ai-discovery.types";



type VapiRequestOptions = RequestInit;



export interface VapiChatOptions {

  message?: string;

  assistantId?: string;

  previousChatId?: string;

}



export interface VapiChatOutputMessage {

  role?: string;

  content?: string;

  [key: string]: unknown;

}



export interface VapiChatResponse {

  id?: string;

  assistantId?: string;

  sessionId?: string;

  messages?: unknown[];

  output?: VapiChatOutputMessage[];

  [key: string]: unknown;

}



interface VapiJsonSchema {
  type: "object";
  properties: Record<string, {
    type: "string" | "number" | "integer";
    description?: string;
  }>;
  required?: string[];
  additionalProperties?: boolean;
}

interface VapiApiRequestToolPayload {
  type: "apiRequest";
  name: string;
  description: string;
  method: "POST";
  url: string;
  timeoutSeconds: number;
  parameters: Array<{
    key: string;
    value: string;
  }>;
  body: VapiJsonSchema;
}

interface VapiToolRecord {
  id?: string;
  type?: string;
  name?: string;
  function?: {
    name?: string;
  };
  [key: string]: unknown;
}

interface VapiAssistantRecord {
  id?: string;
  model?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface FockisDiscoveryToolSyncResult {
  success: boolean;
  assistantId: string;
  webhookUrl: string;
  created: string[];
  reused: string[];
  toolIds: string[];
}

@Injectable()

export class VapiService {

  private readonly logger = new Logger(

    VapiService.name,

  );

  private fockisDiscoveryToolsReady = false;
  private fockisDiscoveryWebhookUrl = "";



  private readonly baseUrl: string;



  constructor(

    private readonly configService: ConfigService,



    /**

     * Gives Vapi access to the controlled Fockis

     * live-discovery layer.

     *

     * Vapi NEVER receives arbitrary MongoDB queries.

     */

    private readonly discoveryService: AiDiscoveryService,

  ) {

    /*

     * ------------------------------------------------------------

     * Load apps/api/.env explicitly.

     * ------------------------------------------------------------

     */



    const envCandidates = [

      resolve(

        process.cwd(),

        ".env",

      ),



      resolve(

        process.cwd(),

        "apps",

        "api",

        ".env",

      ),



      resolve(

        __dirname,

        "../../../.env",

      ),

    ];



    for (const envPath of envCandidates) {

      if (existsSync(envPath)) {

        loadDotenv({

          path: envPath,

          override: false,

        });



        this.logger.log(

          `Vapi environment file loaded from: ${envPath}`,

        );



        break;

      }

    }



    /*

     * ------------------------------------------------------------

     * Base URL

     * ------------------------------------------------------------

     */



    this.baseUrl = (

      this.getEnvValue(

        "VAPI_BASE_URL",

      ) ||

      "https\://api.vapi.ai"

    ).replace(/\/+$/, "");



    /*

     * ------------------------------------------------------------

     * SAFE startup diagnostic

     *

     * Never print:

     * - VAPI_PRIVATE_KEY

     * - actual VAPI_ASSISTANT_ID

     * ------------------------------------------------------------

     */



    const privateKey =

      this.getPrivateKey();



    const assistantId =

      this.getAssistantId();



    const diagnostic = [

      "============================================================",

      "FOCKIS VAPI CONFIGURATION",

      `privateKey=${Boolean(privateKey)}`,

      `assistantId=${Boolean(assistantId)}`,

      `assistantIdLength=${assistantId.length}`,

      `baseUrl=${this.baseUrl}`,

      "liveFockisDiscovery=true",

      "============================================================",

    ].join("\n");



    console.log(diagnostic);



    this.logger.log(

      `Vapi configuration: privateKey=${Boolean(

        privateKey,

      )}, assistantId=${Boolean(

        assistantId,

      )}, assistantIdLength=${

        assistantId.length

      }, baseUrl=${this.baseUrl}, liveFockisDiscovery=true`,

    );

  }



  // ============================================================

  // ENVIRONMENT

  // ============================================================



  private getEnvValue(

    name: string,

  ): string {

    const configValue =

      this.configService

        .get<string>(name)

        ?.trim();



    if (configValue) {

      return configValue;

    }



    return (

      process.env[name]?.trim() || ""

    );

  }



  private getPrivateKey(): string {

    return this.getEnvValue(

      "VAPI_PRIVATE_KEY",

    );

  }



  private getAssistantId(): string {

    return this.getEnvValue(

      "VAPI_ASSISTANT_ID",

    );

  }



  private getDiscoveryWebhookSecret(): string {

    return this.getEnvValue(

      "VAPI_FOCKIS_WEBHOOK_SECRET",

    );

  }



  // ============================================================

  // CONFIGURATION

  // ============================================================



  /**

   * Used by AiAdminService.

   */

  isConfigured(): boolean {

    return Boolean(

      this.getPrivateKey() &&

        this.getAssistantId(),

    );

  }



  // ============================================================

  // VAPI HTTP REQUEST

  // ============================================================



  private async request<T>(

    path: string,

    init: VapiRequestOptions = {},

  ): Promise<T> {

    const key =

      this.getPrivateKey();



    if (!key) {

      this.logger.error(

        "VAPI_PRIVATE_KEY is not configured",

      );



      throw new ServiceUnavailableException(

        "Vapi private API key is not configured on the server.",

      );

    }



    const response = await fetch(

      `${this.baseUrl}${path}`,

      {

        ...init,



        headers: {

          Accept:

            "application/json",



          "Content-Type":

            "application/json",



          Authorization:

            `Bearer ${key}`,



          ...(init.headers || {}),

        },

      },

    );



    const responseText =

      await response.text();



    let responseBody: unknown =

      null;



    if (responseText) {

      try {

        responseBody =

          JSON.parse(responseText);

      } catch {

        responseBody =

          responseText;

      }

    }



    if (!response.ok) {

      this.logger.error(

        `Vapi request failed: ${response.status} ${response.statusText}`,

      );



      const vapiMessage =

        this.extractVapiErrorMessage(

          responseBody,

        );



      throw new Error(

        vapiMessage ||

          `Vapi request failed with HTTP ${response.status}`,

      );

    }



    return responseBody as T;

  }



  private extractVapiErrorMessage(

    body: unknown,

  ): string {

    if (!body) {

      return "";

    }



    if (typeof body === "string") {

      return body.trim();

    }



    if (

      typeof body === "object"

    ) {

      const value =

        body as Record<

          string,

          unknown

        >;



      const candidates = [

        value.message,

        value.error,

        value.detail,

        value.description,

      ];



      for (const candidate of candidates) {

        if (

          typeof candidate ===

            "string" &&

          candidate.trim()

        ) {

          return candidate.trim();

        }



        if (

          candidate &&

          typeof candidate ===

            "object"

        ) {

          const nested =

            candidate as Record<

              string,

              unknown

            >;



          if (

            typeof nested.message ===

              "string" &&

            nested.message.trim()

          ) {

            return nested.message.trim();

          }

        }

      }

    }



    return "";

  }



  // ============================================================

  // CONNECTION TEST

  // ============================================================



  async testConnection() {

    const privateKey =

      this.getPrivateKey();



    const assistantId =

      this.getAssistantId();



    if (!privateKey) {

      return {

        connected: false,

        configured: false,

        baseUrl: this.baseUrl,

        message:

          "VAPI_PRIVATE_KEY is not configured.",

      };

    }



    if (!assistantId) {

      return {

        connected: false,

        configured: false,

        baseUrl: this.baseUrl,

        message:

          "VAPI_ASSISTANT_ID is not configured.",

      };

    }



    try {

      await this.request<
        unknown[]
      >("/assistant");

      let functionTools:
        FockisDiscoveryToolSyncResult | null =
        null;

      const discoveryWebhookUrl =
        this.getEnvValue(
          "VAPI_FOCKIS_DISCOVERY_WEBHOOK_URL",
        );

      if (discoveryWebhookUrl) {
        try {
          functionTools =
            await this.syncFockisDiscoveryTools();
          this.fockisDiscoveryToolsReady = true;
          this.fockisDiscoveryWebhookUrl = discoveryWebhookUrl;
        } catch (error) {
          const syncMessage =
            error instanceof Error
              ? error.message
              : String(error);

          this.logger.error(
            `Fockis Vapi Function Tool synchronization failed: ${syncMessage}`,
          );

          return {
            connected: true,
            configured: true,
            baseUrl: this.baseUrl,
            liveFockisDiscovery: true,
            functionToolsConnected: false,
            functionToolsError: syncMessage,
            message:
              "Vapi is reachable, but Fockis discovery Function Tools could not be synchronized.",
          };
        }
      }

      return {
        connected: true,
        configured: true,
        baseUrl: this.baseUrl,
        liveFockisDiscovery: true,
        functionToolsConnected:
          Boolean(functionTools),
        functionTools,
        message:
          "Fockis is successfully connected to Vapi.",
      };

    } catch (error) {

      const message =

        error instanceof Error

          ? error.message

          : "Unknown Vapi connection error.";



      this.logger.error(

        `Vapi connection test failed: ${message}`,

      );



      return {

        connected: false,

        configured: true,

        baseUrl: this.baseUrl,

        liveFockisDiscovery:

          true,

        message,

      };

    }

  }



  // ============================================================

  // ASSISTANTS

  // ============================================================



  listAssistants() {

    return this.request<

      unknown[]

    >("/assistant");

  }



  getAssistant(id: string) {

    return this.request(

      `/assistant/${encodeURIComponent(

        id,

      )}`,

    );

  }



  createAssistant(

    payload: Record<

      string,

      unknown

    >,

  ) {

    return this.request(

      "/assistant",

      {

        method: "POST",

        body: JSON.stringify(

          payload,

        ),

      },

    );

  }



  updateAssistant(

    id: string,

    payload: Record<

      string,

      unknown

    >,

  ) {

    return this.request(

      `/assistant/${encodeURIComponent(

        id,

      )}`,

      {

        method: "PATCH",

        body: JSON.stringify(

          payload,

        ),

      },

    );

  }



  deleteAssistant(id: string) {

    return this.request(

      `/assistant/${encodeURIComponent(

        id,

      )}`,

      {

        method: "DELETE",

      },

    );

  }



  // ============================================================

  // ============================================================
  // FOCKIS VAPI FUNCTION TOOLS
  // ============================================================

  private async ensureFockisDiscoveryTools(): Promise<void> {
    const webhookUrl = this.getEnvValue(
      "VAPI_FOCKIS_DISCOVERY_WEBHOOK_URL",
    );

    if (!webhookUrl) {
      this.logger.warn(
        "VAPI_FOCKIS_DISCOVERY_WEBHOOK_URL is not configured; Fockis discovery tools are disabled.",
      );
      return;
    }

    if (
      this.fockisDiscoveryToolsReady &&
      this.fockisDiscoveryWebhookUrl === webhookUrl
    ) {
      return;
    }

    await this.syncFockisDiscoveryTools();
    this.fockisDiscoveryToolsReady = true;
    this.fockisDiscoveryWebhookUrl = webhookUrl;
  }

  async syncFockisDiscoveryTools(): Promise<FockisDiscoveryToolSyncResult> {
    const assistantId = this.getAssistantId();
    if (!assistantId) {
      throw new ServiceUnavailableException(
        "VAPI_ASSISTANT_ID is not configured on the server.",
      );
    }

    const webhookUrl = this.getEnvValue(
      "VAPI_FOCKIS_DISCOVERY_WEBHOOK_URL",
    );

    if (!webhookUrl) {
      throw new ServiceUnavailableException(
        "VAPI_FOCKIS_DISCOVERY_WEBHOOK_URL is not configured on the server.",
      );
    }

    const webhookSecret = this.getDiscoveryWebhookSecret();

    if (!webhookSecret) {
      throw new ServiceUnavailableException(
        "VAPI_FOCKIS_WEBHOOK_SECRET is not configured on the server.",
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(webhookUrl);
    } catch {
      throw new BadRequestException(
        "VAPI_FOCKIS_DISCOVERY_WEBHOOK_URL must be a valid URL.",
      );
    }

    const local =
      parsedUrl.hostname === "localhost" ||
      parsedUrl.hostname === "127.0.0.1" ||
      parsedUrl.hostname === "::1";

    if (parsedUrl.protocol !== "https:" && !local) {
      throw new BadRequestException(
        "VAPI_FOCKIS_DISCOVERY_WEBHOOK_URL must use HTTPS unless it points to localhost.",
      );
    }

    const definitions =
      this.getFockisDiscoveryToolDefinitions(
        webhookUrl,
      );

    const assistant =
      await this.getAssistant(
        assistantId,
      ) as VapiAssistantRecord;

    const existingToolIds =
      this.extractAssistantToolIds(assistant);

    const existingFockisTools =
      new Map<string, { id: string; type: string }>();

    const nonFockisToolIds: string[] = [];

    for (const toolId of existingToolIds) {
      try {
        const tool = await this.getTool(toolId) as VapiToolRecord;
        const name = this.extractVapiToolName(tool);
        const type = typeof tool.type === "string" ? tool.type : "";

        if (
          name &&
          this.isFockisDiscoveryToolName(name)
        ) {
          existingFockisTools.set(name, {
            id: toolId,
            type,
          });
        } else {
          nonFockisToolIds.push(toolId);
        }
      } catch (error) {
        this.logger.warn(
          `Unable to inspect Vapi tool ${toolId}; it will not be reused: ${
            error instanceof Error
              ? error.message
              : String(error)
          }`,
        );
      }
    }

    const created: string[] = [];
    const reused: string[] = [];
    const fockisToolIds: string[] = [];

    for (const definition of definitions) {
      const name = definition.name;
      const existing = existingFockisTools.get(name);

      if (existing?.type === "apiRequest") {
        await this.updateTool(
          existing.id,
          definition as unknown as Record<string, unknown>,
        );
        reused.push(name);
        fockisToolIds.push(existing.id);
        continue;
      }

      // Existing Fockis Function tools are intentionally replaced with
      // API Request tools so Chat can execute the endpoint directly.
      if (existing?.id) {
        try {
          await this.deleteTool(existing.id);
        } catch (error) {
          this.logger.warn(
            `Unable to remove legacy Fockis tool ${existing.id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }

      const createdTool =
        await this.createTool(definition);

      const createdId =
        this.extractResourceId(createdTool);

      if (!createdId) {
        throw new Error(
          `Vapi created ${name}, but no tool ID was returned.`,
        );
      }

      created.push(name);
      fockisToolIds.push(createdId);
    }

    const mergedToolIds = [
      ...new Set([
        ...nonFockisToolIds,
        ...fockisToolIds,
      ]),
    ];

    const currentModel =
      assistant?.model &&
      typeof assistant.model === "object"
        ? assistant.model
        : {};

    await this.updateAssistant(
      assistantId,
      {
        model: {
          ...currentModel,
          toolIds: mergedToolIds,
        },
      },
    );

    this.logger.log(
      `Fockis Vapi discovery API Request tools synchronized: created=${created.length}, reused=${reused.length}, total=${fockisToolIds.length}`,
    );

    return {
      success: true,
      assistantId,
      webhookUrl,
      created,
      reused,
      toolIds: fockisToolIds,
    };
  }

  async createFockisDiscoveryTool(
    tool: AiDiscoveryTool,
  ) {
    const webhookUrl =
      this.getEnvValue(
        "VAPI_FOCKIS_DISCOVERY_WEBHOOK_URL",
      );

    if (!webhookUrl) {
      throw new ServiceUnavailableException(
        "VAPI_FOCKIS_DISCOVERY_WEBHOOK_URL is not configured on the server.",
      );
    }

    const definition =
      this.getFockisDiscoveryToolDefinitions(
        webhookUrl,
      ).find(
        (item) =>
          item.name === tool,
      );

    if (!definition) {
      throw new BadRequestException(
        `No Vapi discovery tool definition exists for ${tool}.`,
      );
    }

    return this.createTool(definition);
  }

  async getTool(id: string) {
    if (!id?.trim()) {
      throw new BadRequestException(
        "A Vapi tool ID is required.",
      );
    }

    return this.request(
      `/tool/${encodeURIComponent(id.trim())}`,
    );
  }

  async updateTool(
    id: string,
    payload: Record<string, unknown>,
  ) {
    if (!id?.trim()) {
      throw new BadRequestException(
        "A Vapi tool ID is required.",
      );
    }

    return this.request(
      `/tool/${encodeURIComponent(id.trim())}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
  }

  async deleteTool(id: string) {
    if (!id?.trim()) {
      throw new BadRequestException(
        "A Vapi tool ID is required.",
      );
    }

    return this.request(
      `/tool/${encodeURIComponent(id.trim())}`,
      {
        method: "DELETE",
      },
    );
  }

  private async createTool(
    payload: VapiApiRequestToolPayload,
  ) {
    return this.request(
      "/tool",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  }

  private getFockisDiscoveryToolDefinitions(
    webhookUrl: string,
  ): VapiApiRequestToolPayload[] {
    const properties = {
      query: {
        type: "string" as const,
        description:
          "Natural-language search terms describing what the user wants.",
      },
      city: {
        type: "string" as const,
        description: "Optional city filter.",
      },
      state: {
        type: "string" as const,
        description: "Optional state or province filter.",
      },
      country: {
        type: "string" as const,
        description: "Optional country filter.",
      },
      category: {
        type: "string" as const,
        description: "Optional category filter.",
      },
      type: {
        type: "string" as const,
        description: "Optional record type filter.",
      },
      minPrice: {
        type: "number" as const,
        description: "Optional minimum price.",
      },
      maxPrice: {
        type: "number" as const,
        description: "Optional maximum price.",
      },
      limit: {
        type: "integer" as const,
        description: "Maximum results to return. Normally use 1 to 10.",
      },
    };

    const makeTool = (
      name: string,
      description: string,
    ): VapiApiRequestToolPayload => ({
      type: "apiRequest",
      name,
      description,
      method: "POST",
      url: webhookUrl,
      timeoutSeconds: 20,
      // These are server-controlled static values. Vapi merges them into
      // the outbound JSON body without exposing them as model-generated
      // arguments.
      parameters: [
        {
          key: "tool",
          value: name,
        },
        {
          key: "webhookSecret",
          value: this.getDiscoveryWebhookSecret(),
        },
      ],
      body: {
        type: "object",
        properties,
        required: [],
        additionalProperties: false,
      },
    });

    return [
      makeTool(
        "search_fockis_stores",
        "IMPORTANT: Use this tool whenever the user asks to find, search, browse, or identify a Fockis Shop store, shop, seller, or storefront. Do not ask unnecessary clarification questions. Search the live public Fockis stores database and answer using only records returned by this tool.",
      ),
      makeTool(
        "search_fockis_products",
        "IMPORTANT: Use this tool whenever the user asks to find, search, browse, compare, locate, buy, or get details about a Fockis Shop product or item. Do not ask unnecessary clarification questions when the user has already named a product. Search the live public Fockis products database and answer using only records returned by this tool.",
      ),
      makeTool(
        "search_fockis_businesses",
        "IMPORTANT: Use this tool whenever the user asks to find or search for a Fockis business. Search the live public Fockis businesses database and answer using only records returned by this tool.",
      ),
      makeTool(
        "search_fockis_jobs",
        "Search the live public and approved Fockis jobs database. Use this for jobs, employment, internships, careers, hiring, or positions. Only use records returned by the tool.",
      ),
      makeTool(
        "search_fockis_courses",
        "Search the live Fockis Academy courses database. Use this for courses, classes, or lessons. Only use records returned by the tool.",
      ),
      makeTool(
        "search_fockis_programs",
        "Search the live Fockis Academy programs database. Use this for programs, degrees, majors, or programs of study. Only use records returned by the tool.",
      ),
      makeTool(
        "search_fockis_real_estate",
        "Search the live approved Fockis real estate database. Use this for properties, houses, apartments, rentals, homes, or real estate listings. Only use records returned by the tool.",
      ),
      makeTool(
        "search_fockis_events",
        "Search the live public Fockis events database. Use this for events, concerts, festivals, conferences, or public happenings. Only use records returned by the tool.",
      ),
      makeTool(
        "search_fockis_posts",
        "Search the live public Fockis posts database. Use this for public posts and what people posted. Only use records returned by the tool.",
      ),
    ];
  }

  private extractAssistantToolIds(
    assistant: VapiAssistantRecord,
  ): string[] {
    const model = assistant?.model;

    if (
      !model ||
      typeof model !== "object"
    ) {
      return [];
    }

    const toolIds = model.toolIds;

    if (!Array.isArray(toolIds)) {
      return [];
    }

    return toolIds.filter(
      (id): id is string =>
        typeof id === "string" &&
        id.trim().length > 0,
    );
  }

  private extractVapiToolName(
    tool: unknown,
  ): string | undefined {
    if (
      !tool ||
      typeof tool !== "object"
    ) {
      return undefined;
    }

    const value = tool as VapiToolRecord;

    if (
      typeof value.name === "string" &&
      value.name.trim()
    ) {
      return value.name.trim();
    }

    if (
      value.function &&
      typeof value.function.name === "string" &&
      value.function.name.trim()
    ) {
      return value.function.name.trim();
    }

    return undefined;
  }

  private extractResourceId(
    value: unknown,
  ): string | undefined {
    if (
      !value ||
      typeof value !== "object"
    ) {
      return undefined;
    }

    const record =
      value as Record<string, unknown>;

    return typeof record.id === "string" &&
      record.id.trim()
      ? record.id.trim()
      : undefined;
  }

  private isFockisDiscoveryToolName(
    value: string,
  ): boolean {
    return (
      value === "search_fockis_stores" ||
      value === "search_fockis_products" ||
      value === "search_fockis_businesses" ||
      value === "search_fockis_jobs" ||
      value === "search_fockis_courses" ||
      value === "search_fockis_programs" ||
      value === "search_fockis_real_estate" ||
      value === "search_fockis_events" ||
      value === "search_fockis_posts"
    );
  }

  // CHAT

  // ============================================================



  async chat(

    options: VapiChatOptions,

  ): Promise<{

    success: boolean;

    chatId: string | null;

    assistantId: string;

    sessionId: string | null;

    content: string;

    raw?: VapiChatResponse;

  }> {

    const message =

      options.message?.trim();



    if (!message) {

      throw new BadRequestException(

        "A chat message is required.",

      );

    }



    const assistantId =

      options.assistantId?.trim() ||

      this.getAssistantId();



    if (!assistantId) {

      this.logger.error(

        "VAPI_ASSISTANT_ID is not configured on the server.",

      );



      throw new ServiceUnavailableException(

        "VAPI_ASSISTANT_ID is not configured on the server.",

      );

    }



    try {
      await this.ensureFockisDiscoveryTools();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Fockis discovery tool synchronization failed before chat: ${message}`,
      );

      throw new ServiceUnavailableException(
        `Fockis Shop discovery is not available: ${message}`,
      );
    }

    /*
     * Fockis discovery is handled by Vapi Function Tools.
     *
     * The user's original request is sent to Vapi. When the model
     * needs current Fockis data, it calls one of the registered
     * discovery tools and Vapi sends that call to the controlled
     * /admin/ai/vapi/tools webhook.
     *
     * The older buildLiveFockisContext() implementation remains
     * below for compatibility/debugging but is no longer injected
     * into the chat prompt.
     */
    const finalInput = message;

    const previousChatId =

      options.previousChatId?.trim();



    const payload: Record<

      string,

      unknown

    > = {

      assistantId,



      input: finalInput,

    };



    if (previousChatId) {

      payload.previousChatId =

        previousChatId;

    }



    this.logger.log(
      `Sending chat request to Vapi using assistantId length=${assistantId.length}, functionTools=true`,
    );



    try {

      const response =

        await this.request<VapiChatResponse>(

          "/chat",

          {

            method: "POST",



            body: JSON.stringify(

              payload,

            ),

          },

        );



      const output =

        Array.isArray(

          response.output,

        )

          ? response.output

          : [];



      const assistantMessage =

        output.find(

          (item) =>

            item &&

            typeof item ===

              "object" &&

            item.role ===

              "assistant" &&

            typeof item.content ===

              "string",

        );



      let content =

        assistantMessage?.content?.trim() ||

        "";



      /*

       * Some Vapi responses expose assistant

       * content through messages instead.

       */



      if (!content) {

        const messages =

          Array.isArray(

            response.messages,

          )

            ? response.messages

            : [];



        const lastAssistantMessage =

          [...messages]

            .reverse()

            .find(

              (item) =>

                item &&

                typeof item ===

                  "object" &&

                (item as any)

                  .role ===

                  "assistant" &&

                typeof (

                  item as any

                ).content ===

                  "string",

            ) as

            | {

                role?: string;

                content?: string;

              }

            | undefined;



        content =

          lastAssistantMessage?.content?.trim() ||

          "";

      }



      if (!content) {

        this.logger.warn(

          `Vapi chat returned no assistant text. Chat ID: ${

            response.id ||

            "unknown"

          }`,

        );



        return {

          success: true,



          chatId:

            response.id || null,



          assistantId:

            response.assistantId ||

            assistantId,



          sessionId:

            response.sessionId ||

            null,



          content:

            "I received your message, but I didn't receive a text response from the AI.",



          raw: response,

        };

      }



      return {

        success: true,



        chatId:

          response.id || null,



        assistantId:

          response.assistantId ||

          assistantId,



        sessionId:

          response.sessionId ||

          null,



        content,



        raw: response,

      };

    } catch (error) {

      const message =

        error instanceof Error

          ? error.message

          : "Unknown Vapi chat error.";



      this.logger.error(

        `Vapi chat request failed: ${message}`,

      );



      throw new ServiceUnavailableException(

        `Fockis AI chat failed: ${message}`,

      );

    }

  }



  // ============================================================

  // LIVE FOCKIS DISCOVERY

  // ============================================================



  private async buildLiveFockisContext(

    message: string,

  ): Promise<string> {

    const normalized =

      message.toLowerCase();



    const tools: AiDiscoveryTool[] =

      [];



    /*

     * ----------------------------------------------------------

     * SHOP

     * ----------------------------------------------------------

     */



    if (

      this.matchesAny(

        normalized,

        [

          "store",

          "stores",

          "shop",

          "shops",

          "seller",

          "sellers",

          "marketplace",

        ],

      )

    ) {

      tools.push(

        "search_fockis_stores",

      );

    }



    if (

      this.matchesAny(

        normalized,

        [

          "product",

          "products",

          "buy",

          "purchase",

          "price",

          "shoes",

          "clothes",

          "phone",

          "laptop",

        ],

      )

    ) {

      tools.push(

        "search_fockis_products",

      );

    }



    /*

     * ----------------------------------------------------------

     * BUSINESSES

     * ----------------------------------------------------------

     */



    if (

      this.matchesAny(

        normalized,

        [

          "business",

          "businesses",

          "restaurant",

          "restaurants",

          "company",

          "companies",

          "salon",

          "barber",

          "storefront",

        ],

      )

    ) {

      tools.push(

        "search_fockis_businesses",

      );

    }



    /*

     * ----------------------------------------------------------

     * CAREERS

     * ----------------------------------------------------------

     *

     * This is the connection you are asking for.

     *

     * A newly created and approved job is searched from

     * the live jobs collection automatically.

     * ----------------------------------------------------------

     */



    if (

      this.matchesAny(

        normalized,

        [

          "job",

          "jobs",

          "career",

          "careers",

          "employment",

          "work",

          "internship",

          "internships",

          "hiring",

          "hire",

          "position",

          "positions",

          "vacancy",

          "vacancies",

          "resume",

        ],

      )

    ) {

      tools.push(

        "search_fockis_jobs",

      );

    }



    /*

     * ----------------------------------------------------------

     * ACADEMY

     * ----------------------------------------------------------

     */



    if (

      this.matchesAny(

        normalized,

        [

          "course",

          "courses",

          "class",

          "classes",

          "academy",

          "lesson",

          "lessons",

        ],

      )

    ) {

      tools.push(

        "search_fockis_courses",

      );

    }



    if (

      this.matchesAny(

        normalized,

        [

          "program",

          "programs",

          "degree",

          "degrees",

          "major",

          "majors",

        ],

      )

    ) {

      tools.push(

        "search_fockis_programs",

      );

    }



    /*

     * ----------------------------------------------------------

     * REAL ESTATE

     * ----------------------------------------------------------

     */



    if (

      this.matchesAny(

        normalized,

        [

          "house",

          "houses",

          "home",

          "homes",

          "apartment",

          "apartments",

          "property",

          "properties",

          "real estate",

          "rent",

          "rental",

          "rentals",

          "for sale",

          "listing",

          "listings",

        ],

      )

    ) {

      tools.push(

        "search_fockis_real_estate",

      );

    }



    /*

     * ----------------------------------------------------------

     * EVENTS

     * ----------------------------------------------------------

     */



    if (

      this.matchesAny(

        normalized,

        [

          "event",

          "events",

          "concert",

          "concerts",

          "festival",

          "festivals",

          "conference",

          "conferences",

          "happening",

          "happenings",

        ],

      )

    ) {

      tools.push(

        "search_fockis_events",

      );

    }



    /*

     * ----------------------------------------------------------

     * POSTS

     * ----------------------------------------------------------

     */



    if (

      this.matchesAny(

        normalized,

        [

          "post",

          "posts",

          "people said",

          "what people are saying",

          "fockis post",

        ],

      )

    ) {

      tools.push(

        "search_fockis_posts",

      );

    }



    /*

     * ----------------------------------------------------------

     * GENERAL FOCKIS SEARCH

     * ----------------------------------------------------------

     */



    if (

      tools.length === 0 &&

      this.matchesAny(

        normalized,

        [

          "fockis",

          "find",

          "search",

          "looking for",

          "show me",

          "where can i find",

        ],

      )

    ) {

      tools.push(

        "search_fockis_stores",

        "search_fockis_products",

        "search_fockis_businesses",

      );

    }



    /*

     * Do not execute unlimited searches.

     */



    const selectedTools = [

      ...new Set(tools),

    ].slice(0, 3);



    if (

      selectedTools.length === 0

    ) {

      return "";

    }



    const discoveryResults: string[] =

      [];



    for (const tool of selectedTools) {

      try {

        const result =

          await this.discoveryService.search(

            {

              tool,



              /*

               * The discovery layer is controlled.

               * It does not accept arbitrary MongoDB

               * queries.

               */

              query: message,



              limit: 8,

            },

          );



        if (result.count > 0) {

          discoveryResults.push(

            this.formatDiscoveryResult(

              result,

            ),

          );

        }

      } catch (error) {

        this.logger.warn(

          `Fockis live discovery failed for ${tool}.`,

        );

      }

    }



    if (

      discoveryResults.length === 0

    ) {

      /*

       * We deliberately do not inject a fake

       * "no result" record into Vapi.

       */

      return "";

    }



    return `

\============================================================

FOCKIS LIVE DATABASE RESULTS

\============================================================



The following records were retrieved from the current Fockis

database immediately before this AI response.



These are live Fockis records.



IMPORTANT AI RULES:



1\. Use these records when answering the user's request.

2\. Do not invent Fockis records.

3\. Do not claim a Fockis store, product, business, job,

   course, program, property, event, or post exists unless

   it appears in these results.

4\. If the records do not answer the user's question,

   clearly say that no matching public Fockis record was found.

5\. Do not reveal MongoDB collection names, database queries,

   private fields, tokens, passwords, or internal IDs unless

   they are intentionally presented as public application data.

6\. Treat this information as current Fockis data.



${discoveryResults.join("\n\n")}



\============================================================

END FOCKIS LIVE DATABASE RESULTS

\============================================================

`;

  }



  // ============================================================

  // INTENT HELPERS

  // ============================================================



  private matchesAny(

    text: string,

    phrases: string[],

  ): boolean {

    return phrases.some(

      (phrase) =>

        text.includes(phrase),

    );

  }



  // ============================================================

  // DISCOVERY RESULT FORMATTER

  // ============================================================



  private formatDiscoveryResult(

    result: any,

  ): string {

    const lines: string[] = [];



    lines.push(

      `SOURCE TOOL: ${result.tool}`,

    );



    lines.push(

      `RESULT COUNT: ${result.count}`,

    );



    for (

      const item of result.results ||

      []

    ) {

      lines.push(

        `TITLE: ${item.title}`,

      );



      if (item.description) {

        lines.push(

          `DESCRIPTION: ${item.description}`,

        );

      }



      if (

        item.location &&

        (

          item.location.city ||

          item.location.state ||

          item.location.country

        )

      ) {

        lines.push(

          `LOCATION: ${this.formatLocation(

            item.location,

          )}`,

        );

      }



      if (

        typeof item.price ===

        "number"

      ) {

        lines.push(

          `PRICE: ${item.price}`,

        );

      }



      /*

       * Keep useful public metadata.

       *

       * Do not dump the entire MongoDB document.

       */



      if (

        item.metadata &&

        typeof item.metadata ===

          "object"

      ) {

        const safeMetadata =

          this.sanitizeMetadata(

            item.metadata,

          );



        if (

          Object.keys(

            safeMetadata,

          ).length

        ) {

          lines.push(

            `DETAILS: ${JSON.stringify(

              safeMetadata,

            )}`,

          );

        }

      }



      /*

       * Public application URL is safe if the

       * discovery layer provides one.

       */



      if (item.url) {

        lines.push(

          `URL: ${item.url}`,

        );

      }



      lines.push("---");

    }



    return lines.join("\n");

  }



  private formatLocation(

    location: {

      city?: string;

      state?: string;

      country?: string;

    },

  ): string {

    return [

      location.city,

      location.state,

      location.country,

    ]

      .filter(Boolean)

      .join(", ");

  }



  private sanitizeMetadata(

    metadata: Record<

      string,

      unknown

    >,

  ): Record<string, unknown> {

    const blockedKeys =

      new Set([

        "_id",

        "ownerId",

        "userId",

        "password",

        "passwordHash",

        "token",

        "accessToken",

        "refreshToken",

        "secret",

        "privateKey",

        "apiKey",

        "passcode",

        "meetingCode",

        "joinToken",

      ]);



    const safe: Record<

      string,

      unknown

    > = {};



    for (

      const [key, value] of Object.entries(

        metadata,

      )

    ) {

      if (

        blockedKeys.has(key)

      ) {

        continue;

      }



      safe[key] = value;

    }



    return safe;

  }

}