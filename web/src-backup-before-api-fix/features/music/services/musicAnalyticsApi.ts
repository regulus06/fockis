import { apiClient } from '../../careers/services/apiClient';

export const musicAnalyticsApi = {
  /**
   * Get the producer music analytics dashboard.
   */
  dashboard: (
    range: '7d' | '30d' | '90d' | '1y' | 'all' = '30d',
  ) =>
    apiClient.get(
      `/music/analytics/dashboard?range=${range}`,
    ),

  /**
   * Get analytics for a specific music content item.
   */
  content: (
    contentId: string,
  ) =>
    apiClient.get(
      `/music/analytics/content/${contentId}`,
    ),
};