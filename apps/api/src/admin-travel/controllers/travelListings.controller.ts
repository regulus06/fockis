// backend/admin-travel/controllers/travelListings.controller.ts

import type { Request, Response } from "express";

import { TravelListing } from "../models/TravelListing.model";
import {
  buildSearchClause,
  paginatedResponse,
  parsePagination,
} from "../utils/pagination";

export async function listListings(req: Request, res: Response) {
  const pagination = parsePagination(req);
  const { status, type, partnerId, flaggedOnly } = req.query;

  const filter: Record<string, unknown> = {};

  if (status && status !== "all") filter.status = status;
  if (type && type !== "all") filter.type = type;
  if (partnerId) filter.partnerId = partnerId;
  if (flaggedOnly === "true") filter.flagged = true;

  const search = buildSearchClause(req.query.search, ["name", "partnerName"]);
  if (search) Object.assign(filter, search);

  const [items, total] = await Promise.all([
    TravelListing.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    TravelListing.countDocuments(filter),
  ]);

  res.json(
    paginatedResponse(
      items.map((listing) => ({ ...listing, id: String(listing._id) })),
      total,
      pagination,
    ),
  );
}

export async function getListing(req: Request, res: Response) {
  const listing = await TravelListing.findById(req.params.id).lean();

  if (!listing) {
    res.status(404).json({ message: "Listing not found." });
    return;
  }

  res.json({ ...listing, id: String(listing._id) });
}

/**
 * PATCH /admin/travel/listings/:id/status
 * body: { status, reason? }
 */
export async function updateListingStatus(req: Request, res: Response) {
  const { status, reason } = req.body ?? {};

  const update: Record<string, unknown> = { status };

  if (status === "published") {
    update.publishedAt = new Date();
    update.flagged = false;
  }

  if (status === "suspended" || status === "rejected") {
    update.flagged = true;
    update.flagReason = reason;
  }

  const listing = await TravelListing.findByIdAndUpdate(
    req.params.id,
    update,
    { new: true },
  ).lean();

  if (!listing) {
    res.status(404).json({ message: "Listing not found." });
    return;
  }

  res.json({ ...listing, id: String(listing._id) });
}

export async function deleteListing(req: Request, res: Response) {
  const deleted = await TravelListing.findByIdAndDelete(req.params.id);

  if (!deleted) {
    res.status(404).json({ message: "Listing not found." });
    return;
  }

  res.status(204).end();
}
