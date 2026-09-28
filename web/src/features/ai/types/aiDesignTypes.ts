export type AiDesignType =
  | "flyer"
  | "logo"
  | "badge"
  | "poster"
  | "thumbnail"
  | "banner"
  | "business-card"
  | "social-media";

export interface AiDesignInput extends Record<string, unknown> {
  prompt: string;

  type: AiDesignType;

  size?: string;

  brandName?: string;

  colors?: string[];

  model?: string;
}

export interface DesignResult {
  id: string;

  type: AiDesignType;

  imageUrl?: string;

  editableUrl?: string;
}