import {
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";

import {
  InjectModel,
} from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import {
  Meeting,
} from "../schemas/meeting.schema";

import {
  UpdateSecretaryDto,
} from "../dto/update-secretary.dto";

import {
  MeetingSummaryService,
} from "./meeting-summary.service";

import {
  MeetingTranscriptService,
} from "./meeting-transcript.service";

@Injectable()
export class MeetingSecretaryService {
  constructor(
    @InjectModel(Meeting.name)
    private readonly meetingModel: Model<Meeting>,

    private readonly transcriptService: MeetingTranscriptService,

    private readonly summaryService: MeetingSummaryService,
  ) {}

  // ==========================================================================
  // GET SECRETARY CONFIGURATION
  // ==========================================================================

  async getConfig(
    meetingId: string,
  ) {
    const meeting =
      await this.meetingModel.findById(
        meetingId,
      );

    if (!meeting) {
      throw new ServiceUnavailableException(
        "Meeting not found",
      );
    }

    return meeting.secretary;
  }

  // ==========================================================================
  // UPDATE SECRETARY CONFIGURATION
  // ==========================================================================

  async updateConfig(
    meetingId: string,
    dto: UpdateSecretaryDto,
  ) {
    const meeting =
      await this.meetingModel.findById(
        meetingId,
      );

    if (!meeting) {
      throw new ServiceUnavailableException(
        "Meeting not found",
      );
    }

    meeting.secretary = {
      ...meeting.secretary,
      ...dto,
    };

    await meeting.save();

    return meeting.secretary;
  }

  // ==========================================================================
  // GET SECRETARY STATUS
  // ==========================================================================

  async getStatus(
    meetingId: string,
  ) {
    const meeting =
      await this.meetingModel.findById(
        meetingId,
      );

    if (!meeting) {
      throw new ServiceUnavailableException(
        "Meeting not found",
      );
    }

    const summary =
      await this.summaryService.get(
        meetingId,
      );

    if (!meeting.secretary?.enabled) {
      return "off";
    }

    if (summary) {
      return "complete";
    }

    if (meeting.status === "live") {
      return "listening";
    }

    return "off";
  }

  // ==========================================================================
  // GENERATE AI MEETING SUMMARY
  // ==========================================================================

  async generateSummary(
    meetingId: string,
    userId: string,
  ) {
    const meeting =
      await this.meetingModel.findById(
        meetingId,
      );

    if (!meeting) {
      throw new ServiceUnavailableException(
        "Meeting not found",
      );
    }

    if (!userId) {
      throw new ServiceUnavailableException(
        "User authentication is required",
      );
    }

    // ------------------------------------------------------------------------
    // Verify access
    // ------------------------------------------------------------------------

    if (
      meeting.hostId.toString() !==
      userId
    ) {
      const hasAccess =
        await this.meetingModel.exists({
          _id: new Types.ObjectId(
            meetingId,
          ),
        });

      if (!hasAccess) {
        throw new ServiceUnavailableException(
          "Meeting access denied",
        );
      }
    }

    // ------------------------------------------------------------------------
    // Verify secretary
    // ------------------------------------------------------------------------

    if (!meeting.secretary?.enabled) {
      throw new ServiceUnavailableException(
        "AI Secretary is disabled",
      );
    }

    // ------------------------------------------------------------------------
    // Get transcript
    // ------------------------------------------------------------------------

    const transcript =
      await this.transcriptService.getFullTranscript(
        meetingId,
        userId,
      );

    if (!transcript.length) {
      throw new ServiceUnavailableException(
        "No transcript is available for this meeting yet",
      );
    }

    // ------------------------------------------------------------------------
    // OpenAI API key
    // ------------------------------------------------------------------------

    const apiKey =
      process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new ServiceUnavailableException(
        "OPENAI_API_KEY is not configured",
      );
    }

    // ------------------------------------------------------------------------
    // Build transcript
    // ------------------------------------------------------------------------

    const transcriptText =
      transcript
        .map(
          (line) =>
            `${line.speakerName}: ${line.text}`,
        )
        .join("\n");

    // ------------------------------------------------------------------------
    // Generate summary
    // ------------------------------------------------------------------------

    const response =
      await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${apiKey}`,
          },

          body: JSON.stringify({
            model:
              process.env
                .OPENAI_MEETING_MODEL ||
              "gpt-4o-mini",

            temperature: 0.2,

            response_format: {
              type: "json_object",
            },

            messages: [
              {
                role: "system",

                content:
                  `You are Fockis Meeting Secretary.

Create a professional meeting summary.

Return valid JSON with these fields:

overview
mainPoints
decisions
actionItems
questions
nextSteps

decisions must contain:
id, text

actionItems must contain:
id, assigneeName, task, dueDate, completed

questions must contain:
id, text, answered

Do not invent information.

Use empty strings when an assignee or due date is unknown.`,
              },

              {
                role: "user",

                content:
                  `Meeting topic:
${meeting.topic}

Transcript:
${transcriptText}`,
              },
            ],
          }),
        },
      );

    // ------------------------------------------------------------------------
    // Check OpenAI response
    // ------------------------------------------------------------------------

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new ServiceUnavailableException(
        `AI provider failed: ${errorText.slice(
          0,
          500,
        )}`,
      );
    }

    // ------------------------------------------------------------------------
    // Parse response
    // ------------------------------------------------------------------------

    const json: any =
      await response.json();

    const content =
      json?.choices?.[0]?.message
        ?.content;

    if (!content) {
      throw new ServiceUnavailableException(
        "AI provider returned no summary",
      );
    }

    let summaryData: any;

    try {
      summaryData =
        JSON.parse(content);
    } catch {
      throw new ServiceUnavailableException(
        "AI provider returned invalid summary data",
      );
    }

    // ------------------------------------------------------------------------
    // Save summary
    // ------------------------------------------------------------------------

    return this.summaryService.save(
      meetingId,
      {
        overview:
          typeof summaryData.overview ===
          "string"
            ? summaryData.overview
            : "",

        mainPoints:
          Array.isArray(
            summaryData.mainPoints,
          )
            ? summaryData.mainPoints
            : [],

        decisions:
          Array.isArray(
            summaryData.decisions,
          )
            ? summaryData.decisions
            : [],

        actionItems:
          Array.isArray(
            summaryData.actionItems,
          )
            ? summaryData.actionItems
            : [],

        questions:
          Array.isArray(
            summaryData.questions,
          )
            ? summaryData.questions
            : [],

        nextSteps:
          Array.isArray(
            summaryData.nextSteps,
          )
            ? summaryData.nextSteps
            : [],
      },
    );
  }
}