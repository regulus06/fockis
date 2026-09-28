import {
  Controller,
  Get,
  Param,
  Post,
} from "@nestjs/common";

import {
  MeetingSummaryService,
} from "../services/meeting-summary.service";

@Controller("meetings")
export class MeetingPdfController {
  constructor(
    private readonly summaryService: MeetingSummaryService,
  ) {}

  @Get(":meetingId/pdf")
  async status(
    @Param("meetingId")
    meetingId: string,
  ) {
    const summary =
      await this.summaryService.get(
        meetingId,
      );

    return {
      meetingId,
      status: summary
        ? "ready"
        : "idle",
      downloadUrl:
        undefined,
    };
  }

  @Post(":meetingId/pdf")
  async request(
    @Param("meetingId")
    meetingId: string,
  ) {
    const summary =
      await this.summaryService.get(
        meetingId,
      );

    if (!summary) {
      return {
        meetingId,
        status: "error",
        error:
          "Generate the meeting summary before requesting the PDF report.",
      };
    }

    return {
      meetingId,
      status: "ready",
      downloadUrl:
        `/meetings/${meetingId}/pdf/download`,
    };
  }
}