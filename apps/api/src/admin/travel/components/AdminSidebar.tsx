import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/admin/travel", label: "Dashboard", icon: "📊", end: true },
  { to: "/admin/travel/applications", label: "Partner Applications", icon: "📝" },
  { to: "/admin/travel/partners", label: "Partners", icon: "🏨" },
  { to: "/admin/travel/listings", label: "Listings", icon: "🗺️" },
  { to: "/admin/travel/bookings", label: "Bookings", icon: "📅" },
] as const;

export default function AdminSidebar() {
  return (
    <aside className="travel-admin-sidebar">
      <div className="travel-admin-sidebar-header">
        <span className="logo-mark">✈️</span>
        <span className="logo-text">Fockis Travel Admin</span>
      </div>

      <nav>
        <ul>
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={"end" in item ? item.end : false}
                className={({ isActive }) =>
                  `travel-admin-nav-link${isActive ? " active" : ""}`
                }
              >
                <span className="icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
