import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  SetMetadata,
} from "@nestjs/common";

import { VapiService } from "./vapi.service";
import { IS_PUBLIC_KEY } from "../../auth/public.decorator";

interface VapiChatBody {
  message?: string;
  assistantId?: string;
  previousChatId?: string;
}

@Controller("admin/ai/vapi")
export class VapiController {
  constructor(
    private readonly vapiService: VapiService,
  ) {}

  /**
   * Vapi health/configuration check.
   *
   * This endpoint is intentionally public so the frontend/server
   * configuration can be tested even when a user's Fockis session
   * has expired.
   *
   * IMPORTANT:
   * testConnection() must never return the VAPI_PRIVATE_KEY.
   */
  @Get("status")
  @SetMetadata(IS_PUBLIC_KEY, true)
  async status() {
    return this.vapiService.testConnection();
  }

  /**
   * Return all Vapi assistants.
   *
   * Authentication remains required.
   */
  @Get("assistants")
  assistants() {
    return this.vapiService.listAssistants();
  }

  /**
   * Return one Vapi assistant.
   *
   * Authentication remains required.
   */
  @Get("assistants/:id")
  assistant(
    @Param("id") id: string,
  ) {
    return this.vapiService.getAssistant(id);
  }

  /**
   * Send a text message to a Vapi assistant.
   *
   * The Vapi private key stays on the NestJS server.
   *
   * Authentication remains required.
   */
  @Post("chat")
  async chat(
    @Body() body: VapiChatBody,
  ) {
    return this.vapiService.chat({
      message: body.message,
      assistantId: body.assistantId,
      previousChatId: body.previousChatId,
    });
  }
}