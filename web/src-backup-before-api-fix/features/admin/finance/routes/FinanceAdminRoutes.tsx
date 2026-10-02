import { Navigate, Route, Routes } from "react-router-dom";

import FinanceDashboardPage from "../pages/FinanceDashboardPage";
import TransactionsPage from "../pages/TransactionsPage";
import PaymentsPage from "../pages/PaymentsPage";
import PayoutsPage from "../pages/PayoutsPage";
import RefundsPage from "../pages/RefundsPage";
import SubscriptionsPage from "../pages/SubscriptionsPage";
import InvoicesPage from "../pages/InvoicesPage";
import RevenuePage from "../pages/RevenuePage";
import FeesPage from "../pages/FeesPage";
import WalletsPage from "../pages/WalletsPage";
import CoinsPage from "../pages/CoinsPage";
import FinancialReportsPage from "../pages/FinancialReportsPage";
import ShopOrderFinancePage from "../pages/ShopOrderFinancePage";

import { PermissionRouteGuard } from "../../routes/PermissionRouteGuard";
import { PERMISSIONS } from "../../permissions/permission.constants";

const P = PERMISSIONS;

function guarded(
  anyOf: Array<(typeof P)[keyof typeof P]>,
  element: React.ReactElement,
): React.ReactElement {
  return (
    <PermissionRouteGuard requireAny={anyOf}>
      {element}
    </PermissionRouteGuard>
  );
}

export default function FinanceAdminRoutes(): React.ReactElement {
  return (
    <Routes>
      {/* ============================================================
          FINANCE DASHBOARD
          ============================================================ */}

      <Route
        index
        element={guarded(
          [P.FINANCE_VIEW],
          <FinanceDashboardPage />,
        )}
      />

      {/* ============================================================
          TRANSACTIONS
          ============================================================ */}

      <Route
        path="transactions"
        element={guarded(
          [P.FINANCE_TRANSACTIONS],
          <TransactionsPage />,
        )}
      />

      {/* ============================================================
          PAYMENTS
          ============================================================ */}

      <Route
        path="payments"
        element={guarded(
          [P.PAYMENTS_VIEW, P.FINANCE_VIEW],
          <PaymentsPage />,
        )}
      />

      {/* ============================================================
          PAYOUTS
          ============================================================ */}

      <Route
        path="payouts"
        element={guarded(
          [P.FINANCE_PAYOUTS],
          <PayoutsPage />,
        )}
      />

      {/* ============================================================
          REFUNDS
          ============================================================ */}

      <Route
        path="refunds"
        element={guarded(
          [P.FINANCE_REFUNDS],
          <RefundsPage />,
        )}
      />

      {/* ============================================================
          SUBSCRIPTIONS
          ============================================================ */}

      <Route
        path="subscriptions"
        element={guarded(
          [P.SUBSCRIPTIONS_VIEW, P.FINANCE_VIEW],
          <SubscriptionsPage />,
        )}
      />

      {/* ============================================================
          INVOICES
          ============================================================ */}

      <Route
        path="invoices"
        element={guarded(
          [P.FINANCE_VIEW],
          <InvoicesPage />,
        )}
      />

      {/* ============================================================
          REVENUE
          ============================================================ */}

      <Route
        path="revenue"
        element={guarded(
          [P.FINANCE_EARNINGS, P.FINANCE_VIEW],
          <RevenuePage />,
        )}
      />

      {/* ============================================================
          FEES
          ============================================================ */}

      <Route
        path="fees"
        element={guarded(
          [P.FINANCE_VIEW],
          <FeesPage />,
        )}
      />

      {/* ============================================================
          WALLETS
          ============================================================ */}

      <Route
        path="wallets"
        element={guarded(
          [P.FINANCE_VIEW],
          <WalletsPage />,
        )}
      />

      {/* ============================================================
          COINS
          ============================================================ */}

      <Route
        path="coins"
        element={guarded(
          [P.FINANCE_VIEW],
          <CoinsPage />,
        )}
      />

      {/* ============================================================
          FINANCIAL REPORTS
          ============================================================ */}

      <Route
        path="reports"
        element={guarded(
          [P.FINANCE_VIEW, P.FINANCE_EARNINGS],
          <FinancialReportsPage />,
        )}
      />

      {/* ============================================================
          FOCKIS SHOP ORDER FINANCE
          ============================================================ */}

      <Route
        path="shop-orders/:orderId"
        element={guarded(
          [P.FINANCE_VIEW],
          <ShopOrderFinancePage />,
        )}
      />

      {/* ============================================================
          UNKNOWN FINANCE ROUTE
          ============================================================ */}

      <Route
        path="*"
        element={
          <Navigate
            to="/admin/finance"
            replace
          />
        }
      />
    </Routes>
  );
}