// backend/admin-travel/controllers/travelBookings.controller.ts

import type { Request, Response } from "express";

import { TravelBooking } from "../models/TravelBooking.model";
import {
  buildSearchClause,
  paginatedResponse,
  parsePagination,
} from "../utils/pagination";

export async function listBookings(req: Request, res: Response) {
  const pagination = parsePagination(req);
  const { status, partnerId, listingType } = req.query;

  const filter: Record<string, unknown> = {};

  if (status && status !== "all") filter.status = status;
  if (partnerId) filter.partnerId = partnerId;
  if (listingType && listingType !== "all") filter.listingType = listingType;

  const search = buildSearchClause(req.query.search, [
    "customerName",
    "customerEmail",
    "listingName",
    "partnerName",
  ]);

  if (search) Object.assign(filter, search);

  const [items, total] = await Promise.all([
    TravelBooking.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    TravelBooking.countDocuments(filter),
  ]);

  res.json(
    paginatedResponse(
      items.map((booking) => ({ ...booking, id: String(booking._id) })),
      total,
      pagination,
    ),
  );
}
