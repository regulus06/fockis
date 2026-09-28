import { aiApi } from "./aiApi";
import type { AiMusicInput } from "../types/aiMusicTypes";

export const aiMusicApi = {
  generate: (input: AiMusicInput) =>
    aiApi.createJob({
      type: "music",
      prompt: input.prompt,
      model: input.model,
      options: input,
    }),
};
export default aiMusicApi;
