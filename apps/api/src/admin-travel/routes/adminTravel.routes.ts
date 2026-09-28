// backend/admin-travel/routes/adminTravel.routes.ts
//
// Mount this in your main app, e.g.:
//
//   import adminTravelRoutes from "./admin-travel/routes/adminTravel.routes";
//   app.use("/api/admin/travel", adminTravelRoutes);
//
// This must line up with the frontend's API_BASE + path convention in
// features/admin/travel/api/travelPartnerAdminApi.ts, which calls
// `${API_BASE}/admin/travel/...`. If your app mounts admin routes at a
// different prefix, update either side to match.

import { Router } from "express";

import { adminAuth } from "../middleware/adminAuth.middleware";
import { requirePermission } from "../middleware/requirePermission.middleware";

import {
  getApplication,
  listApplications,
  requestMoreInfo,
  updateApplicationStatus,
} from "../controllers/travelApplications.controller";

import { listBookings } from "../controllers/travelBookings.controller";

import {
  deleteListing,
  getListing,
  listListings,
  updateListingStatus,
} from "../controllers/travelListings.controller";

import {
  getPartner,
  getPartnerBookings,
  getPartnerListings,
  listPartners,
  updatePartnerStatus,
} from "../controllers/travelPartners.controller";

import { getStats } from "../controllers/travelStats.controller";

const router = Router();

// Every route below requires a valid admin session.
router.use(adminAuth);

// ---------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------

router.get(
  "/stats",
  requirePermission("travel.dashboard.view"),
  asyncHandler(getStats),
);

// ---------------------------------------------------------------------
// Partner applications
// ---------------------------------------------------------------------

router.get(
  "/partner-applications",
  requirePermission("travel.applications.view"),
  asyncHandler(listApplications),
);

router.get(
  "/partner-applications/:id",
  requirePermission("travel.applications.view"),
  asyncHandler(getApplication),
);

router.patch(
  "/partner-applications/:id/status",
  requirePermission("travel.applications.manage"),
  asyncHandler(updateApplicationStatus),
);

router.post(
  "/partner-applications/:id/request-info",
  requirePermission("travel.applications.manage"),
  asyncHandler(requestMoreInfo),
);

// ---------------------------------------------------------------------
// Partners
// ---------------------------------------------------------------------

router.get(
  "/partners",
  requirePermission("travel.partners.view"),
  asyncHandler(listPartners),
);

router.get(
  "/partners/:id",
  requirePermission("travel.partners.view"),
  asyncHandler(getPartner),
);

router.patch(
  "/partners/:id/status",
  requirePermission("travel.partners.manage"),
  asyncHandler(updatePartnerStatus),
);

router.get(
  "/partners/:id/listings",
  requirePermission("travel.partners.view"),
  asyncHandler(getPartnerListings),
);

router.get(
  "/partners/:id/bookings",
  requirePermission("travel.partners.view"),
  asyncHandler(getPartnerBookings),
);

// ---------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------

router.get(
  "/listings",
  requirePermission("travel.listings.view"),
  asyncHandler(listListings),
);

router.get(
  "/listings/:id",
  requirePermission("travel.listings.view"),
  asyncHandler(getListing),
);

router.patch(
  "/listings/:id/status",
  requirePermission("travel.listings.moderate"),
  asyncHandler(updateListingStatus),
);

router.delete(
  "/listings/:id",
  requirePermission("travel.listings.moderate"),
  asyncHandler(deleteListing),
);

// ---------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------

router.get(
  "/bookings",
  requirePermission("travel.bookings.view"),
  asyncHandler(listBookings),
);

// Small helper so every async controller doesn't need its own try/catch —
// forwards rejected promises to Express's error handler.
function asyncHandler(
  fn: (req: any, res: any) => Promise<unknown>,
) {
  return (req: any, res: any, next: (err?: unknown) => void) => {
    fn(req, res).catch(next);
  };
}

export default router;
