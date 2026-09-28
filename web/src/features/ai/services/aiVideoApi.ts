import { aiApi } from "./aiApi";

import type { AiVideoInput } from "../types/aiVideoTypes";

const MAX_VIDEO_PROMPT_LENGTH = 10_000;

export const aiVideoApi = {
  generate: (input: AiVideoInput) => {
    const prompt = input.prompt.trim();

    if (!prompt) {
      throw new Error("Please enter a video prompt.");
    }

    if (prompt.length > MAX_VIDEO_PROMPT_LENGTH) {
      throw new Error(
        `Video prompt must not be greater than ${MAX_VIDEO_PROMPT_LENGTH} characters.`,
      );
    }

    return aiApi.createJob({
      type: "video",
      prompt,
      model: input.model,

      options: {
        durationSeconds: input.durationSeconds,
        aspectRatio: input.aspectRatio === "9:16" ? "9:16" : "16:9",
        style: input.style,
        voiceover: input.voiceover,
        captions: input.captions,
        music: input.music,
      },
    });
  },

  getJob: (id: string) => aiApi.getJob(id),
};

export default aiVideoApi;