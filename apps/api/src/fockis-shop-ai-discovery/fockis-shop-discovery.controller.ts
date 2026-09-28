import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  UseGuards,
} from "@nestjs/common";

import { Public } from "../auth/public.decorator";
import { VapiWebhookGuard } from "./vapi-webhook.guard";

import { FockisShopDiscoveryService } from "./fockis-shop-discovery.service";

import {
  FockisShopDiscoveryQuery,
  FockisShopDiscoveryTool,
} from "./fockis-shop-discovery.types";

// ─────────────────────────────────────────────
// VAPI TYPES
// ─────────────────────────────────────────────

interface VapiToolCall {
  id?: string;
  toolCallId?: string;
  name?: string;

  parameters?: Record<string, unknown>;

  function?: {
    name?: string;
    arguments?: Record<string, unknown> | string;
  };
}

interface VapiToolWithCall {
  name?: string;
  toolCall?: VapiToolCall;
}

interface VapiFunctionCall {
  name?: string;
  parameters?: Record<string, unknown>;
  arguments?: Record<string, unknown> | string;
}

interface VapiMessage {
  type?: string;

  toolCallList?: VapiToolCall[];

  toolWithToolCallList?: VapiToolWithCall[];

  functionCall?: VapiFunctionCall;
}

interface VapiToolCallEnvelope {
  message?: VapiMessage;
}

// ─────────────────────────────────────────────
// CONTROLLER
// ─────────────────────────────────────────────

@Controller("admin/ai/vapi")
@Public()
@UseGuards(VapiWebhookGuard)
export class FockisShopDiscoveryController {
  private readonly logger = new Logger(
    FockisShopDiscoveryController.name,
  );

  constructor(
    private readonly discoveryService: FockisShopDiscoveryService,
  ) {}

  // ───────────────────────────────────────────
  // VAPI TOOL WEBHOOK
  //
  // POST /admin/ai/vapi/tools
  // ───────────────────────────────────────────

  @Post("tools")
  @HttpCode(200)
  async handleVapiTools(
    @Body() body: VapiToolCallEnvelope,
  ) {
    const message = body?.message;

    if (!message) {
      return {
        results: [],
      };
    }

    // ─────────────────────────────────────────
    // CURRENT VAPI TOOL CALL FORMAT
    // ─────────────────────────────────────────

    if (message.type === "tool-calls") {
      const calls = this.extractToolCalls(message);

      const results: Array<{
        toolCallId: string;
        result?: string;
        error?: string;
      }> = [];

      for (const call of calls) {
        const toolCallId =
          this.extractToolCallId(call);

        const toolName =
          this.extractToolName(call);

        const parameters =
          this.extractParameters(call);

        if (!toolName) {
          results.push({
            toolCallId,
            error:
              "No Vapi tool name was provided.",
          });

          continue;
        }

        try {
          this.logger.log(
            `Vapi Shop tool call: ${toolName}`,
          );

          const result =
            await this.execute(
              toolName,
              parameters,
            );

          results.push({
            toolCallId,
            result:
              this.oneLineJson(result),
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Fockis Shop discovery failed.";

          this.logger.error(
            `Vapi Shop tool ${toolName} failed: ${errorMessage}`,
          );

          results.push({
            toolCallId,
            error: errorMessage,
          });
        }
      }

      return {
        results,
      };
    }

    // ─────────────────────────────────────────
    // LEGACY FUNCTION-CALL FORMAT
    // ─────────────────────────────────────────

    if (
      message.type ===
      "function-call"
    ) {
      const functionCall =
        message.functionCall;

      if (!functionCall?.name) {
        return {
          results: [
            {
              toolCallId: "unknown",
              error:
                "No Vapi function name was provided.",
            },
          ],
        };
      }

      try {
        const parameters =
          this.parseArguments(
            functionCall.arguments ??
              functionCall.parameters ??
              {},
          );

        const result =
          await this.execute(
            functionCall.name,
            parameters,
          );

        return {
          result:
            this.oneLineJson(result),
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Fockis Shop discovery failed.";

        this.logger.error(
          `Vapi Shop tool ${functionCall.name} failed: ${errorMessage}`,
        );

        return {
          result:
            this.oneLineJson({
              error: errorMessage,
            }),
        };
      }
    }

    return {
      results: [],
    };
  }

  // ───────────────────────────────────────────
  // EXTRACT TOOL CALLS
  // ───────────────────────────────────────────

  private extractToolCalls(
    message: VapiMessage,
  ): VapiToolCall[] {
    if (
      Array.isArray(
        message.toolCallList,
      ) &&
      message.toolCallList.length > 0
    ) {
      return message.toolCallList;
    }

    if (
      Array.isArray(
        message.toolWithToolCallList,
      )
    ) {
      return message.toolWithToolCallList
        .map((item) => {
          const toolCall =
            item.toolCall ?? {};

          return {
            ...toolCall,

            name:
              item.name ??
              toolCall.name ??
              toolCall.function?.name,
          };
        })
        .filter(
          (item) =>
            Boolean(
              item.id ||
                item.toolCallId,
            ),
        );
    }

    return [];
  }

  // ───────────────────────────────────────────
  // TOOL CALL ID
  // ───────────────────────────────────────────

  private extractToolCallId(
    call: VapiToolCall,
  ): string {
    return String(
      call.id ??
        call.toolCallId ??
        "unknown",
    );
  }

  // ───────────────────────────────────────────
  // TOOL NAME
  // ───────────────────────────────────────────

  private extractToolName(
    call: VapiToolCall,
  ): string {
    return String(
      call.name ??
        call.function?.name ??
        "",
    ).trim();
  }

  // ───────────────────────────────────────────
  // PARAMETERS
  // ───────────────────────────────────────────

  private extractParameters(
    call: VapiToolCall,
  ): Record<string, unknown> {
    if (
      call.parameters &&
      typeof call.parameters ===
        "object"
    ) {
      return call.parameters;
    }

    if (
      call.function?.arguments !==
      undefined
    ) {
      return this.parseArguments(
        call.function.arguments,
      );
    }

    return {};
  }

  // ───────────────────────────────────────────
  // EXECUTE SHOP TOOL
  // ───────────────────────────────────────────

  private async execute(
    toolName: string,
    parameters: Record<string, unknown>,
  ) {
    if (
      toolName !==
        "search_fockis_products" &&
      toolName !==
        "search_fockis_stores" &&
      toolName !==
        "search_fockis_businesses"
    ) {
      throw new Error(
        `Unsupported Fockis Shop discovery tool: ${toolName}`,
      );
    }

    const query: FockisShopDiscoveryQuery = {
      tool:
        toolName as FockisShopDiscoveryTool,

      query:
        this.stringValue(
          parameters.query,
        ),

      city:
        this.stringValue(
          parameters.city,
        ),

      state:
        this.stringValue(
          parameters.state,
        ),

      country:
        this.stringValue(
          parameters.country,
        ),

      category:
        this.stringValue(
          parameters.category,
        ),

      type:
        this.stringValue(
          parameters.type,
        ),

      minPrice:
        this.numberValue(
          parameters.minPrice,
        ),

      maxPrice:
        this.numberValue(
          parameters.maxPrice,
        ),

      limit:
        this.numberValue(
          parameters.limit,
        ),
    };

    return this.discoveryService.search(
      query,
    );
  }

  // ───────────────────────────────────────────
  // STRING VALUE
  // ───────────────────────────────────────────

  private stringValue(
    value: unknown,
  ): string | undefined {
    if (
      typeof value !== "string"
    ) {
      return undefined;
    }

    const trimmed =
      value.trim();

    if (!trimmed) {
      return undefined;
    }

    return trimmed.slice(
      0,
      300,
    );
  }

  // ───────────────────────────────────────────
  // NUMBER VALUE
  // ───────────────────────────────────────────

  private numberValue(
    value: unknown,
  ): number | undefined {
    if (
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      return value;
    }

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      const parsed =
        Number(value);

      if (
        Number.isFinite(parsed)
      ) {
        return parsed;
      }
    }

    return undefined;
  }

  // ───────────────────────────────────────────
  // PARSE VAPI ARGUMENTS
  // ───────────────────────────────────────────

  private parseArguments(
    value:
      | Record<string, unknown>
      | string,
  ): Record<string, unknown> {
    if (
      value &&
      typeof value === "object"
    ) {
      return value;
    }

    if (
      typeof value === "string"
    ) {
      try {
        const parsed =
          JSON.parse(value);

        if (
          parsed &&
          typeof parsed ===
            "object"
        ) {
          return parsed;
        }
      } catch {
        this.logger.warn(
          "Unable to parse Vapi function arguments.",
        );
      }
    }

    return {};
  }

  // ───────────────────────────────────────────
  // JSON RESULT
  // ───────────────────────────────────────────

  private oneLineJson(
    value: unknown,
  ): string {
    try {
      return JSON.stringify(value)
        .replace(/\s+/g, " ")
        .trim();
    } catch {
      return JSON.stringify({
        error:
          "Unable to serialize Fockis Shop discovery result.",
      });
    }
  }
}
