// backend/admin-travel/utils/pagination.ts

import type { Request } from "express";

export interface ParsedPagination {
  page: number;
  limit: number;
  skip: number;
}

export function parsePagination(req: Request): ParsedPagination {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function buildSearchClause(
  search: unknown,
  fields: string[],
): Record<string, unknown> | null {
  if (typeof search !== "string" || !search.trim()) {
    return null;
  }

  const regex = new RegExp(search.trim(), "i");

  return { $or: fields.map((field) => ({ [field]: regex })) };
}

export function paginatedResponse<T>(
  items: T[],
  total: number,
  pagination: ParsedPagination,
) {
  return {
    items,
    total,
    page: pagination.page,
    limit: pagination.limit,
  };
}
