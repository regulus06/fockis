import {
  Controller,
  Get,
  Query,
  Req,
} from "@nestjs/common";

import { DocumentHistoryService } from "../services/document-history.service";

function getUserId(req: any): string {
  const userId =
    req.user?.userId ||
    req.user?.id ||
    req.user?._id;

  if (!userId) {
    throw new Error(
      "Authenticated user ID was not found",
    );
  }

  return String(userId);
}

@Controller("document-scanner")
export class DocumentHistoryController {
  constructor(
    private readonly historyService: DocumentHistoryService,
  ) {}

  @Get("history")
  async history(
    @Query("page") page = "1",
    @Query("limit") limit = "20",
    @Req() req: any,
  ) {
    return this.historyService.getHistory(
      getUserId(req),
      Number(page),
      Number(limit),
    );
  }
}