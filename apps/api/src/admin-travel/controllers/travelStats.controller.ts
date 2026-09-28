// backend/admin-travel/controllers/travelStats.controller.ts

import type { Request, Response } from "express";

import { TravelBooking } from "../models/TravelBooking.model";
import { TravelListing } from "../models/TravelListing.model";
import { TravelPartner } from "../models/TravelPartner.model";
import { TravelPartnerApplication } from "../models/TravelPartnerApplication.model";

export async function getStats(_req: Request, res: Response) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    totalPartners,
    activePartners,
    pendingApplications,
    totalListings,
    publishedListings,
    pendingReviewListings,
    flaggedListings,
    bookingsThisMonth,
  ] = await Promise.all([
    TravelPartner.countDocuments(),
    TravelPartner.countDocuments({ status: "active" }),
    TravelPartnerApplication.countDocuments({
      status: { $in: ["pending", "under_review", "more_info_requested"] },
    }),
    TravelListing.countDocuments(),
    TravelListing.countDocuments({ status: "published" }),
    TravelListing.countDocuments({ status: "pending_review" }),
    TravelListing.countDocuments({ flagged: true }),
    TravelBooking.find({ createdAt: { $gte: startOfMonth } }).lean(),
  ]);

  const revenueThisMonth = bookingsThisMonth
    .filter((booking) =>
      ["confirmed", "completed"].includes(booking.status as string),
    )
    .reduce((sum, booking) => sum + (booking.amount ?? 0), 0);

  res.json({
    totalPartners,
    activePartners,
    pendingApplications,
    totalListings,
    publishedListings,
    pendingReviewListings,
    flaggedListings,
    totalBookingsThisMonth: bookingsThisMonth.length,
    revenueThisMonth,
    currency: "USD",
  });
}
