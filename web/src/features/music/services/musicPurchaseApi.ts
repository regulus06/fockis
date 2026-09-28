import { apiClient } from '../../careers/services/apiClient';
import type { InitiatePurchaseResponse } from '../types/music.types';

export const musicPurchaseApi = {
  /**
   * Initiate a music purchase.
   */
  initiate: (
    contentId: string,
  ): Promise<InitiatePurchaseResponse> =>
    apiClient.post<InitiatePurchaseResponse>(
      '/music/purchases',
      { contentId },
    ),

  /**
   * Get the current user's music purchases.
   */
  myPurchases: () =>
    apiClient.get(
      '/music/purchases',
    ),
};