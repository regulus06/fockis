// backend/admin-travel/controllers/travelPartners.controller.ts

import type { Request, Response } from "express";

import { TravelBooking } from "../models/TravelBooking.model";
import { TravelListing } from "../models/TravelListing.model";
import { TravelPartner } from "../models/TravelPartner.model";
import {
  buildSearchClause,
  paginatedResponse,
  parsePagination,
} from "../utils/pagination";

export async function listPartners(req: Request, res: Response) {
  const pagination = parsePagination(req);
  const { status, category } = req.query;

  const filter: Record<string, unknown> = {};

  if (status && status !== "all") filter.status = status;
  if (category && category !== "all") filter.categories = category;

  const search = buildSearchClause(req.query.search, [
    "businessName",
    "email",
  ]);

  if (search) Object.assign(filter, search);

  const [partners, total] = await Promise.all([
    TravelPartner.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    TravelPartner.countDocuments(filter),
  ]);

  const items = await Promise.all(partners.map(withPartnerCounts));

  res.json(paginatedResponse(items, total, pagination));
}

export async function getPartner(req: Request, res: Response) {
  const partner = await TravelPartner.findById(req.params.id).lean();

  if (!partner) {
    res.status(404).json({ message: "Partner not found." });
    return;
  }

  res.json(await withPartnerCounts(partner));
}

/**
 * PATCH /admin/travel/partners/:id/status
 * body: { status, reason? }
 */
export async function updatePartnerStatus(req: Request, res: Response) {
  const { status, reason } = req.body ?? {};

  const update: Record<string, unknown> = { status };

  if (status === "suspended") {
    update.suspendedAt = new Date();
    update.suspendedReason = reason;
    update.acceptingBookings = false;
  } else if (status === "active") {
    update.suspendedAt = undefined;
    update.suspendedReason = undefined;
    update.acceptingBookings = true;
  }

  const partner = await TravelPartner.findByIdAndUpdate(
    req.params.id,
    update,
    { new: true },
  ).lean();

  if (!partner) {
    res.status(404).json({ message: "Partner not found." });
    return;
  }

  // Suspending a partner also unpublishes its live listings so suspended
  // businesses don't keep taking bookings while under review.
  if (status === "suspended") {
    await TravelListing.updateMany(
      { partnerId: partner._id, status: "published" },
      { status: "suspended", flagged: false },
    );
  }

  res.json(await withPartnerCounts(partner));
}

export async function getPartnerListings(req: Request, res: Response) {
  const pagination = parsePagination(req);
  const filter = { partnerId: req.params.id };

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

export async function getPartnerBookings(req: Request, res: Response) {
  const pagination = parsePagination(req);
  const filter = { partnerId: req.params.id };

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

async function withPartnerCounts(partner: any) {
  const [listingCount, activeListingCount, totalBookings] = await Promise.all(
    [
      TravelListing.countDocuments({ partnerId: partner._id }),
      TravelListing.countDocuments({
        partnerId: partner._id,
        status: "published",
      }),
      TravelBooking.countDocuments({ partnerId: partner._id }),
    ],
  );

  return {
    id: String(partner._id),
    businessName: partner.businessName,
    categories: partner.categories ?? [],
    email: partner.email,
    phone: partner.phone,
    city: partner.city,
    country: partner.country,
    logo: partner.logo,
    status: partner.status,
    verified: partner.verified,
    acceptingBookings: partner.acceptingBookings,
    listingCount,
    activeListingCount,
    totalBookings,
    rating: partner.rating,
    createdAt: partner.createdAt,
    suspendedAt: partner.suspendedAt,
    suspendedReason: partner.suspendedReason,
  };
}
