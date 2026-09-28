// backend/admin-travel/controllers/travelApplications.controller.ts

import type { Request, Response } from "express";

import { TravelPartner } from "../models/TravelPartner.model";
import { TravelPartnerApplication } from "../models/TravelPartnerApplication.model";
import {
  buildSearchClause,
  paginatedResponse,
  parsePagination,
} from "../utils/pagination";

export async function listApplications(req: Request, res: Response) {
  const pagination = parsePagination(req);
  const { status, category } = req.query;

  const filter: Record<string, unknown> = {};

  if (status && status !== "all") {
    filter.status = status;
  }

  if (category && category !== "all") {
    filter.$or = [{ primaryCategory: category }, { services: category }];
  }

  const search = buildSearchClause(req.query.search, [
    "businessName",
    "email",
  ]);

  if (search) {
    Object.assign(filter, search);
  }

  const [items, total] = await Promise.all([
    TravelPartnerApplication.find(filter)
      .sort({ submittedAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    TravelPartnerApplication.countDocuments(filter),
  ]);

  res.json(paginatedResponse(items.map(serializeApplication), total, pagination));
}

export async function getApplication(req: Request, res: Response) {
  const application = await TravelPartnerApplication.findById(
    req.params.id,
  ).lean();

  if (!application) {
    res.status(404).json({ message: "Application not found." });
    return;
  }

  res.json(serializeApplication(application));
}

/**
 * PATCH /admin/travel/partner-applications/:id/status
 * body: { status: "approved" | "rejected" | ..., notes?, rejectionReason? }
 *
 * Approving an application activates (or creates) the matching
 * TravelPartner record — this is the step that connects "approve" on the
 * admin side to the applicant seeing their status flip on
 * /travel/partner.
 */
export async function updateApplicationStatus(req: Request, res: Response) {
  const { status, notes, rejectionReason } = req.body ?? {};

  const application = await TravelPartnerApplication.findById(req.params.id);

  if (!application) {
    res.status(404).json({ message: "Application not found." });
    return;
  }

  application.status = status;
  application.reviewedAt = new Date();
  application.reviewedBy = req.admin?.email ?? req.admin?.id;

  if (notes) application.reviewNotes = notes;
  if (rejectionReason) application.rejectionReason = rejectionReason;

  if (status === "approved") {
    application.verificationStage = "verified";

    let partner = application.partnerId
      ? await TravelPartner.findById(application.partnerId)
      : await TravelPartner.findOne({ email: application.email });

    if (!partner) {
      partner = new TravelPartner({
        businessName: application.businessName,
        categories: application.services,
        email: application.email,
        phone: application.phone,
        city: application.city,
        country: application.country,
        applicationId: application._id,
      });
    } else {
      partner.categories = Array.from(
        new Set([...partner.categories, ...application.services]),
      );
    }

    partner.status = "active";
    partner.verified = true;
    partner.acceptingBookings = true;

    await partner.save();
    application.partnerId = partner._id;
  } else if (status === "rejected") {
    application.verificationStage = "submitted";
  } else if (status === "under_review") {
    application.verificationStage = "under_review";
  }

  await application.save();

  res.json(serializeApplication(application.toObject()));
}

/**
 * POST /admin/travel/partner-applications/:id/request-info
 * body: { message }
 */
export async function requestMoreInfo(req: Request, res: Response) {
  const { message } = req.body ?? {};

  if (!message || typeof message !== "string") {
    res.status(400).json({ message: "A message is required." });
    return;
  }

  const application = await TravelPartnerApplication.findByIdAndUpdate(
    req.params.id,
    {
      status: "more_info_requested",
      reviewNotes: message,
      reviewedAt: new Date(),
      reviewedBy: req.admin?.email ?? req.admin?.id,
    },
    { new: true },
  ).lean();

  if (!application) {
    res.status(404).json({ message: "Application not found." });
    return;
  }

  // TODO: send `message` to the applicant via email/notification service.

  res.json(serializeApplication(application));
}

function serializeApplication(doc: any) {
  return {
    id: String(doc._id),
    businessName: doc.businessName,
    contactName: doc.contactName,
    email: doc.email,
    phone: doc.phone,
    website: doc.website,
    description: doc.description,
    address: doc.address,
    city: doc.city,
    country: doc.country,
    primaryCategory: doc.primaryCategory,
    services: doc.services ?? [],
    message: doc.message,
    documents: doc.documents ?? [],
    status: doc.status,
    verificationStage: doc.verificationStage,
    submittedAt: doc.submittedAt,
    updatedAt: doc.updatedAt,
    reviewedAt: doc.reviewedAt,
    reviewedBy: doc.reviewedBy,
    reviewNotes: doc.reviewNotes,
    rejectionReason: doc.rejectionReason,
  };
}
