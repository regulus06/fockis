import { Outlet } from "react-router-dom";

import AdminSidebar from "../components/AdminSidebar";

export default function AdminLayout() {
  return (
    <div className="travel-admin-shell">
      <AdminSidebar />

      <div className="travel-admin-main">
        <header className="travel-admin-topbar">
          <div className="travel-admin-topbar-title">
            Fockis Travel — Admin
          </div>
        </header>

        <main className="travel-admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
