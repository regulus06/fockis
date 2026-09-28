import React from "react";
import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import AdminUsersLayout from "../layouts/AdminUsersLayout";

import UsersPage from "../pages/UsersPage";
import UserDetailsPage from "../pages/UserDetailsPage";
import UserBookingsPage from "../pages/UserBookingsPage";
import UserPaymentsPage from "../pages/UserPaymentsPage";
import UserReportsPage from "../pages/UserReportsPage";
import UserMessagesPage from "../pages/UserMessagesPage";
import UserActivityPage from "../pages/UserActivityPage";

const UserAdminRoutes: React.FC = () => {
  return (
    <Routes>
      <Route element={<AdminUsersLayout />}>
        {/* =====================================================
            USERS DIRECTORY
            /admin/users
        ===================================================== */}

        <Route
          index
          element={<UsersPage />}
        />

        {/* =====================================================
            USER OVERVIEW
            /admin/users/:id
        ===================================================== */}

        <Route
          path=":id"
          element={<UserDetailsPage />}
        />

        {/* =====================================================
            USER ACTIVITY
            /admin/users/:id/activity
        ===================================================== */}

        <Route
          path=":id/activity"
          element={<UserActivityPage />}
        />

        {/* =====================================================
            USER MESSAGES
            /admin/users/:id/messages
        ===================================================== */}

        <Route
          path=":id/messages"
          element={<UserMessagesPage />}
        />

        {/* =====================================================
            USER BOOKINGS
            /admin/users/:id/bookings
        ===================================================== */}

        <Route
          path=":id/bookings"
          element={<UserBookingsPage />}
        />

        {/* =====================================================
            USER PAYMENTS
            /admin/users/:id/payments
        ===================================================== */}

        <Route
          path=":id/payments"
          element={<UserPaymentsPage />}
        />

        {/* =====================================================
            USER REPORTS
            /admin/users/:id/reports
        ===================================================== */}

        <Route
          path=":id/reports"
          element={<UserReportsPage />}
        />

        {/* =====================================================
            UNKNOWN USERS ADMIN ROUTE
            Return to the Users directory.
        ===================================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/admin/users"
              replace
            />
          }
        />
      </Route>
    </Routes>
  );
};

export default UserAdminRoutes;