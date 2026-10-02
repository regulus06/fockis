import { aiApi } from "./aiApi";
import type { AiDesignInput } from "../types/aiDesignTypes";

export const aiDesignApi = {
  generate: (input: AiDesignInput) =>
    aiApi.createJob({
      type: "design",
      prompt: input.prompt,
      model: input.model,
      options: input,
    }),
};
export default aiDesignApi;
