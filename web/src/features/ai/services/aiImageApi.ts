import { aiApi } from "./aiApi";
import type { AiImageInput } from "../types/aiImageTypes";

export const aiImageApi = {
  generate: (input: AiImageInput) =>
    aiApi.createJob({
      type: "image",
      prompt: input.prompt,
      model: input.model,
      options: input,
    }),
};
export default aiImageApi;
