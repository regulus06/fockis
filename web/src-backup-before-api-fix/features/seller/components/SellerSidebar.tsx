import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  Home,
  Package,
  ShoppingBag,
  BarChart3,
  MessageSquare,
  Settings,
  Store,
  PlusCircle,
  LogOut,
  ExternalLink,
  Megaphone,
} from "lucide-react";

import "../styles/SellerSidebar.scss";

const MENU = [
  {
    label: "Dashboard",
    path: "/seller",
    icon: Home,
  },
  {
    label: "Products",
    path: "/seller/products",
    icon: Package,
  },
  {
    label: "Orders",
    path: "/seller/orders",
    icon: ShoppingBag,
  },
  {
    label: "Analytics",
    path: "/seller/analytics",
    icon: BarChart3,
  },
  {
    label: "Messages",
    path: "/seller/messages",
    icon: MessageSquare,
  },
  {
    label: "Marketing",
    path: "/marketing",
    icon: Megaphone,
  },
  {
    label: "Settings",
    path: "/seller/settings",
    icon: Settings,
  },
  {
    label: "Marketplace",
    path: "/marketplace.html",
    icon: ExternalLink,
    external: true,
  },
];

export default function SellerSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  function logoutSellerCenter() {
    localStorage.removeItem("activeStoreId");
    localStorage.removeItem("activeStore");

    navigate("/seller/stores", {
      replace: true,
    });
  }

  return (
    <header className="seller-sidebar">

      {/* BRAND */}
      <div className="sidebar-brand">
        <div className="brand-icon">
          <Store size={22} />
        </div>

        <div className="brand-text">
          <h2>Seller Center</h2>
          <span>Manage your business</span>
        </div>
      </div>

      {/* HORIZONTAL SCROLLABLE NAVIGATION */}
      <nav className="sidebar-menu">
        {MENU.map((item) => {
          const Icon = item.icon;

          const active =
            !item.external &&
            (
              location.pathname === item.path ||
              (
                item.path !== "/seller" &&
                location.pathname.startsWith(
                  item.path + "/"
                )
              )
            );

          return (
            <button
              key={item.path}
              type="button"
              className={active ? "active" : ""}
              onClick={() => {
                if (item.external) {
                  window.open(
                    item.path,
                    "_blank",
                    "noopener,noreferrer"
                  );

                  return;
                }

                navigate(item.path);
              }}
            >
              <Icon size={18} />

              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ADD PRODUCT */}
      <button
        type="button"
        className="create-product-btn"
        onClick={() =>
          navigate("/seller/products/add")
        }
      >
        <PlusCircle size={18} />
        <span>Add Product</span>
      </button>

      {/* LOGOUT */}
      <button
        type="button"
        className="seller-logout-btn"
        onClick={logoutSellerCenter}
        title="Logout Seller Center"
        aria-label="Logout Seller Center"
      >
        <LogOut size={18} />
        <span>Logout</span>
      </button>

    </header>
  );
}