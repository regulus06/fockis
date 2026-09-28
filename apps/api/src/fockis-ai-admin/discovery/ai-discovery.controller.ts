import {
  Body,
  Controller,
  Get,
  HttpCode,
  Logger,
  Post,
} from "@nestjs/common";

import { AiDiscoveryService } from "./ai-discovery.service";

import type {
  AiDiscoveryQuery,
  AiDiscoveryTool,
} from "./ai-discovery.types";

/**
 * Vapi sends a tool-calls webhook containing one or more
 * function calls.
 *
 * We intentionally keep this type local to the controller so
 * the rest of the discovery system does not depend on Vapi's
 * webhook payload shape.
 */
interface VapiToolCall {
  id?: string;
  name?: string;
  arguments?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
}

interface VapiToolCallsMessage {
  type?: string;
  toolCallList?: VapiToolCall[];
}

interface VapiToolCallsWebhookBody {
  message?: VapiToolCallsMessage;
}

interface VapiToolResult {
  toolCallId: string;
  result?: string;
  error?: string;
}

@Controller("admin/ai/discovery")
export class AiDiscoveryController {
  private readonly logger =
    new Logger(AiDiscoveryController.name);

  constructor(
    private readonly discoveryService: AiDiscoveryService,
  ) {}

  /**
   * Get all approved Fockis AI discovery tools.
   *
   * GET /admin/ai/discovery/tools
   */
  @Get("tools")
  getTools() {
    return {
      success: true,
      tools:
        this.discoveryService.getAvailableTools(),
    };
  }

  /**
   * Search the live Fockis database manually.
   *
   * This endpoint remains available for:
   * - Admin testing
   * - Debugging
   * - Frontend testing
   * - Internal services
   *
   * POST /admin/ai/discovery/search
   */
  @Post("search")
  async search(
    @Body() body: AiDiscoveryQuery,
  ) {
    const result =
      await this.discoveryService.search(
        body,
      );

    return {
      success: true,
      ...result,
    };
  }

  /**
   * Vapi Function Tool webhook.
   *
   * Vapi sends:
   *
   * POST /admin/ai/discovery/vapi
   *
   * {
   *   "message": {
   *     "type": "tool-calls",
   *     "toolCallList": [
   *       {
   *         "id": "call_123",
   *         "name": "search_fockis_stores",
   *         "arguments": {
   *           "query": "restaurant",
   *           "city": "Columbus",
   *           "limit": 5
   *         }
   *       }
   *     ]
   *   }
   * }
   *
   * Vapi expects HTTP 200 and:
   *
   * {
   *   "results": [
   *     {
   *       "toolCallId": "call_123",
   *       "result": "..."
   *     }
   *   ]
   * }
   */
  @Post("vapi")
  @HttpCode(200)
  async handleVapiToolCalls(
    @Body() body: VapiToolCallsWebhookBody,
  ): Promise<{
    results: VapiToolResult[];
  }> {
    const message = body?.message;

    if (
      !message ||
      message.type !== "tool-calls" ||
      !Array.isArray(
        message.toolCallList,
      )
    ) {
      this.logger.warn(
        "Received invalid Vapi tool-calls webhook payload.",
      );

      return {
        results: [],
      };
    }

    const results: VapiToolResult[] = [];

    for (const toolCall of message.toolCallList) {
      const toolCallId =
        typeof toolCall?.id === "string"
          ? toolCall.id
          : "";

      const toolName =
        typeof toolCall?.name === "string"
          ? toolCall.name
          : "";

      if (!toolCallId) {
        this.logger.warn(
          "Vapi tool call did not contain an id.",
        );

        continue;
      }

      if (!toolName) {
        results.push({
          toolCallId,
          error:
            "The Vapi tool call did not specify a tool name.",
        });

        continue;
      }

      try {
        const result =
          await this.executeVapiDiscoveryTool(
            toolName,
            this.getToolArguments(toolCall),
          );

        results.push({
          toolCallId,
          result: this.toSingleLineString(
            result,
          ),
        });
      } catch (error) {
        this.logger.error(
          `Vapi discovery tool "${toolName}" failed.`,
          error instanceof Error
            ? error.stack
            : String(error),
        );

        /**
         * Vapi Function Tool errors are returned with
         * HTTP 200 and an error string inside results[].
         */
        results.push({
          toolCallId,
          error: this.toSingleLineString(
            error instanceof Error
              ? error.message
              : "The Fockis discovery tool failed.",
          ),
        });
      }
    }

    return {
      results,
    };
  }

  /**
   * Execute one approved Fockis discovery tool.
   *
   * IMPORTANT:
   * We do not accept arbitrary MongoDB queries from Vapi.
   * The tool name must match one of our explicitly approved
   * discovery tools.
   */
  private async executeVapiDiscoveryTool(
    toolName: string,
    rawArguments: Record<string, unknown>,
  ): Promise<string> {
    if (!this.isAiDiscoveryTool(toolName)) {
      throw new Error(
        `Unsupported Fockis AI discovery tool: ${toolName}`,
      );
    }

    const query =
      this.normalizeDiscoveryArguments(
        rawArguments,
      );

    const result =
      await this.discoveryService.search({
        tool: toolName,
        ...query,
      });

    /**
     * Return a compact JSON string because Vapi expects
     * the Function Tool result to be a string.
     *
     * The discovery service already controls which fields
     * are exposed through AiDiscoveryResultItem.
     */
    return JSON.stringify({
      tool: result.tool,
      query: result.query,
      count: result.count,
      results: result.results,
      searchedLiveDatabase:
        result.searchedLiveDatabase,
    });
  }

  /**
   * Vapi currently sends tool arguments as "arguments".
   *
   * Some Vapi payload shapes/documentation may expose the
   * function parameters as "parameters", so we support both.
   */
  private getToolArguments(
    toolCall: VapiToolCall,
  ): Record<string, unknown> {
    if (
      toolCall.arguments &&
      typeof toolCall.arguments === "object" &&
      !Array.isArray(toolCall.arguments)
    ) {
      return toolCall.arguments;
    }

    if (
      toolCall.parameters &&
      typeof toolCall.parameters === "object" &&
      !Array.isArray(toolCall.parameters)
    ) {
      return toolCall.parameters;
    }

    return {};
  }

  /**
   * Normalize the model-generated arguments before they
   * reach AiDiscoveryService.
   *
   * This keeps Vapi input controlled and prevents arbitrary
   * values from becoming an unrestricted database query.
   */
  private normalizeDiscoveryArguments(
    raw: Record<string, unknown>,
  ): Omit<AiDiscoveryQuery, "tool"> {
    const query =
      this.cleanString(raw.query);

    const city =
      this.cleanString(raw.city);

    const state =
      this.cleanString(raw.state);

    const country =
      this.cleanString(raw.country);

    const category =
      this.cleanString(raw.category);

    const type =
      this.cleanString(raw.type);

    const minPrice =
      this.toNumber(raw.minPrice);

    const maxPrice =
      this.toNumber(raw.maxPrice);

    const limit =
      this.normalizeLimit(raw.limit);

    return {
      ...(query ? { query } : {}),
      ...(city ? { city } : {}),
      ...(state ? { state } : {}),
      ...(country ? { country } : {}),
      ...(category ? { category } : {}),
      ...(type ? { type } : {}),
      ...(minPrice !== undefined
        ? { minPrice }
        : {}),
      ...(maxPrice !== undefined
        ? { maxPrice }
        : {}),
      limit,
    };
  }

  /**
   * Only allow the discovery tools that are registered
   * by the Fockis AI discovery system.
   */
  private isAiDiscoveryTool(
    value: string,
  ): value is AiDiscoveryTool {
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

  /**
   * Keep discovery requests small.
   *
   * The service itself also has its own limit protection.
   */
  private normalizeLimit(
    value: unknown,
  ): number {
    const number =
      this.toNumber(value);

    if (
      number === undefined ||
      !Number.isFinite(number)
    ) {
      return 8;
    }

    return Math.min(
      Math.max(Math.floor(number), 1),
      20,
    );
  }

  private toNumber(
    value: unknown,
  ): number | undefined {
    if (
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      return value;
    }

    if (typeof value === "string") {
      const trimmed =
        value.trim();

      if (!trimmed) {
        return undefined;
      }

      const parsed =
        Number(trimmed);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return undefined;
  }

  private cleanString(
    value: unknown,
  ): string | undefined {
    if (typeof value !== "string") {
      return undefined;
    }

    const cleaned =
      value.trim();

    if (!cleaned) {
      return undefined;
    }

    /**
     * Prevent extremely large model-generated strings
     * from being passed into database searches.
     */
    return cleaned.slice(0, 500);
  }

  /**
   * Vapi expects the result/error to be a string.
   *
   * We also remove line breaks because Vapi's Function Tool
   * troubleshooting documentation recommends single-line
   * result strings.
   */
  private toSingleLineString(
    value: unknown,
  ): string {
    let output: string;

    if (typeof value === "string") {
      output = value;
    } else {
      try {
        output = JSON.stringify(value);
      } catch {
        output = String(value);
      }
    }

    return output
      .replace(/\r?\n|\r/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
}