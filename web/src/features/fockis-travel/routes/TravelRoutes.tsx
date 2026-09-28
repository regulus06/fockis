import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import TravelHeader from "../components/TravelHeader";
import TravelFooter from "../components/TravelFooter";

import TravelHomePage from "../pages/TravelHomePage";
import TravelStaysPage from "../pages/TravelStaysPage";
import TravelStayDetailsPage from "../pages/TravelStayDetailsPage";
import TravelCarsPage from "../pages/TravelCarsPage";
import TravelExperiencesPage from "../pages/TravelExperiencesPage";
import TravelRestaurantsPage from "../pages/TravelRestaurantsPage";
import TravelTransfersPage from "../pages/TravelTransfersPage";
import TravelMeetingsPage from "../pages/TravelMeetingsPage";
import TravelDestinationsPage from "../pages/TravelDestinationsPage";
import TravelSearchPage from "../pages/TravelSearchPage";
import TravelTripPlannerPage from "../pages/TravelTripPlannerPage";
import TravelWishlistPage from "../pages/TravelWishlistPage";
import TravelPriceAlertsPage from "../pages/TravelPriceAlertsPage";
import TravelMyTripsPage from "../pages/TravelMyTripsPage";
import TravelBookingPage from "../pages/TravelBookingPage";

import TravelBusinessPage from "../pages/TravelBusinessPage";
import TravelBusinessDetailsPage from "../pages/TravelBusinessDetailsPage";

import TravelManagementPage from "../pages/TravelManagementPage";

import TravelPartnerPage from "../pages/TravelPartnerPage";
import TravelPartnerDashboardPage from "../pages/TravelPartnerDashboardPage";
import TravelPartnerManagementPage from "../pages/TravelPartnerManagementPage";
import TravelPartnerListingsPage from "../pages/TravelPartnerListingsPage";
import TravelPartnerReservationsPage from "../pages/TravelPartnerReservationsPage";
import TravelPartnerReservationDetailsPage from "../pages/TravelPartnerReservationDetailsPage";

import TravelListingCreatePage from "../pages/TravelListingCreatePage";
import TravelListingEditPage from "../pages/TravelListingEditPage";

import TravelSignInPage from "../pages/TravelSignInPage";

function TravelShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fockis-travel-app">
      <TravelHeader />

      <main className="fockis-travel-content">
        {children}
      </main>

      <TravelFooter />
    </div>
  );
}

export default function TravelRoutes() {
  return (
    <TravelShell>
      <Routes>
        {/* ============================================================
            TRAVEL HOME
        ============================================================ */}

        <Route
          index
          element={<TravelHomePage />}
        />

        <Route
          path="home"
          element={<TravelHomePage />}
        />

        {/* ============================================================
            DISCOVER
        ============================================================ */}

        <Route
          path="stays"
          element={<TravelStaysPage />}
        />

        <Route
          path="stays/:id"
          element={<TravelStayDetailsPage />}
        />

        <Route
          path="cars"
          element={<TravelCarsPage />}
        />

        <Route
          path="experiences"
          element={<TravelExperiencesPage />}
        />

        <Route
          path="restaurants"
          element={<TravelRestaurantsPage />}
        />

        <Route
          path="transfers"
          element={<TravelTransfersPage />}
        />

        <Route
          path="meetings"
          element={<TravelMeetingsPage />}
        />

        <Route
          path="destinations"
          element={<TravelDestinationsPage />}
        />

        <Route
          path="search"
          element={<TravelSearchPage />}
        />

        {/* ============================================================
            TRIP TOOLS
        ============================================================ */}

        <Route
          path="trip-planner"
          element={<TravelTripPlannerPage />}
        />

        <Route
          path="wishlist"
          element={<TravelWishlistPage />}
        />

        <Route
          path="price-alerts"
          element={<TravelPriceAlertsPage />}
        />

        <Route
          path="my-trips"
          element={<TravelMyTripsPage />}
        />

        {/* ============================================================
            BOOKINGS
        ============================================================ */}

        <Route
          path="booking"
          element={<TravelBookingPage />}
        />

        <Route
          path="booking/:id"
          element={<TravelBookingPage />}
        />

        {/* ============================================================
            BUSINESSES
        ============================================================ */}

        {/* Canonical business listing page */}
        <Route
          path="businesses"
          element={<TravelBusinessPage />}
        />

        {/* Canonical business details URL */}
        <Route
          path="businesses/:id"
          element={<TravelBusinessDetailsPage />}
        />

        {/* Backward-compatible singular business URL */}
        <Route
          path="business"
          element={<TravelBusinessPage />}
        />

        <Route
          path="business/:id"
          element={<TravelBusinessDetailsPage />}
        />

        {/* ============================================================
            TRAVEL MANAGEMENT
        ============================================================ */}

        <Route
          path="management"
          element={<TravelManagementPage />}
        />

        {/* ============================================================
            PARTNER
        ============================================================ */}

        <Route
          path="partner"
          element={<TravelPartnerPage />}
        />

        <Route
          path="partner/dashboard"
          element={<TravelPartnerDashboardPage />}
        />

        <Route
          path="partner/management"
          element={<TravelPartnerManagementPage />}
        />

        <Route
          path="partner/listings"
          element={<TravelPartnerListingsPage />}
        />

        {/* ============================================================
            PARTNER LISTING CREATION
        ============================================================ */}

        <Route
          path="partner/listings/new"
          element={<TravelListingCreatePage />}
        />

        <Route
          path="partner/listings/create"
          element={<TravelListingCreatePage />}
        />

        {/* ============================================================
            PARTNER LISTING EDIT
        ============================================================ */}

        <Route
          path="partner/listings/:id/edit"
          element={<TravelListingEditPage />}
        />

        {/* ============================================================
            PARTNER RESERVATIONS
        ============================================================ */}

        <Route
          path="partner/reservations"
          element={<TravelPartnerReservationsPage />}
        />

        <Route
          path="partner/reservations/:id"
          element={<TravelPartnerReservationDetailsPage />}
        />

        {/* ============================================================
            SIGN IN
        ============================================================ */}

        <Route
          path="signin"
          element={<TravelSignInPage />}
        />

        <Route
          path="sign-in"
          element={<TravelSignInPage />}
        />

        {/* ============================================================
            GLOBAL LISTING CREATION ALIAS
        ============================================================ */}

        <Route
          path="create-listing"
          element={<TravelListingCreatePage />}
        />

        <Route
          path="edit-listing/:id"
          element={<TravelListingEditPage />}
        />

        {/* ============================================================
            UNKNOWN TRAVEL ROUTES
        ============================================================ */}

        <Route
          path="*"
          element={
            <Navigate
              to="/travel"
              replace
            />
          }
        />
      </Routes>
    </TravelShell>
  );
}