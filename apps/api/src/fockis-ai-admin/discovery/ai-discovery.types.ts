/**
 * ============================================================
 * FOCKIS AI ADMIN — DISCOVERY TYPES
 * ============================================================
 *
 * Shared types used by:
 *
 * - ai-discovery.controller.ts
 * - ai-discovery.service.ts
 * - vapi.service.ts
 *
 * IMPORTANT:
 * This file contains TYPES ONLY.
 * It must not import PostsService, JwtAuthGuard,
 * NestJS controllers, or other runtime services.
 */

/**
 * Discovery tools available to Fockis AI.
 *
 * The service/controller can also accept future tool names
 * because this is intentionally string-compatible.
 */
export type AiDiscoveryTool =
  | string;

/**
 * Generic discovery result item.
 *
 * Different discovery tools can return different fields,
 * so the item intentionally allows additional properties.
 */
export interface AiDiscoveryResultItem {
  id?: string;
  _id?: string;

  type?: string;
  category?: string;

  title?: string;
  name?: string;
  description?: string;
  content?: string;

  url?: string;
  image?: string;
  imageUrl?: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  media?: string;

  userId?: string;
  user?: unknown;

  price?: number;
  currency?: string;

  city?: string;
  state?: string;
  country?: string;
  address?: string;

  createdAt?: string | Date;
  updatedAt?: string | Date;

  [key: string]: unknown;
}

/**
 * Main query sent to the AI Discovery service.
 *
 * All filter fields are optional because the different
 * discovery tools do not require the same filters.
 */
export interface AiDiscoveryQuery {
  /**
   * Discovery tool to execute.
   */
  tool: AiDiscoveryTool;

  /**
   * Free-text search.
   */
  query?: string;

  /**
   * Generic content type.
   */
  type?: string;

  /**
   * Category filter.
   */
  category?: string;

  /**
   * Location filters.
   */
  city?: string;
  state?: string;
  country?: string;

  /**
   * Marketplace / product price filters.
   */
  minPrice?: number;
  maxPrice?: number;

  /**
   * Number of results requested.
   */
  limit?: number;

  /**
   * Pagination.
   */
  page?: number;

  /**
   * Optional authenticated user.
   */
  userId?: string;

  /**
   * Additional discovery parameters.
   */
  [key: string]: unknown;
}

/**
 * Result returned by the AI Discovery service.
 */
export interface AiDiscoveryResult {
  /**
   * Tool that handled the request.
   */
  tool: AiDiscoveryTool;

  /**
   * Free-text query used for this discovery request.
   *
   * Some discovery service methods return the original
   * query in the result object.
   */
  query?: string;

  /**
   * Number of matching results.
   */
  count: number;

  /**
   * Discovery records.
   */
  results: AiDiscoveryResultItem[];

  /**
   * Whether the live Fockis database was searched.
   */
  searchedLiveDatabase: boolean;

  /**
   * Optional error/message information.
   */
  message?: string;

  /**
   * Optional metadata.
   */
  metadata?: Record<string, unknown>;
}