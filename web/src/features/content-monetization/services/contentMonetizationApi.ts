import type {
  ContentDownloadResponse,
  ContentPurchaseRequest,
  ContentUnlockResult,
  MonetizedContent,
} from "../types/contentMonetization.types";

const delay = (
  milliseconds: number,
): Promise<void> =>
  new Promise((resolve) =>
    setTimeout(resolve, milliseconds),
  );

export const contentMonetizationApi = {
  async getContent(
    contentId: string,
  ): Promise<MonetizedContent> {
    await delay(200);

    throw new Error(
      `Content ${contentId} must be loaded from the feed/post API.`,
    );
  },

  async purchaseContent(
    request: ContentPurchaseRequest,
  ): Promise<ContentUnlockResult> {
    await delay(500);

    return {
      success: true,

      contentId: request.contentId,

      purchaseType:
        request.purchaseType,

      paymentMethod: "coins",

      amount: 0,
    };
  },

  async getDownloadUrl(
    contentId: string,
  ): Promise<ContentDownloadResponse> {
    await delay(300);

    return {
      contentId,

      downloadUrl: `/api/content-monetization/${contentId}/download`,
    };
  },
};