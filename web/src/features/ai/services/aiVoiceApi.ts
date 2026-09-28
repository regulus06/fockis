import { aiApi } from "./aiApi";

export interface AiVoiceInput extends Record<string, unknown> {
  text: string;
  voice?: string;
  language?: string;
  speed?: number;
  model?: string;
}

export const aiVoiceApi = {
  generate: (input: AiVoiceInput) =>
    aiApi.createJob({
      type: "voice",
      prompt: input.text,
      model: input.model as string | undefined,
      options: input,
    }),
};

export default aiVoiceApi;