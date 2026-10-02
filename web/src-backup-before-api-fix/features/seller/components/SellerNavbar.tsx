import {
  Link,
  useLocation,
} from "react-router-dom";


import "../styles/SellerNavbar.scss";



type Props = {

  toggleSidebar?: () => void;

};





export default function SellerNavbar({
  toggleSidebar
}: Props) {



  const location =
    useLocation();




  const isActive = (
    path:string
  ) =>

    location.pathname.startsWith(path);






  return (


    <nav className="seller-navbar">





      <button

        className="seller-hamburger"

        onClick={toggleSidebar}

      >

        ☰

      </button>







      <div className="seller-navbar-links">






        <Link

          className={
            isActive("/seller")
            ? "active"
            : ""
          }

          to="/seller"

        >

          📊 Dashboard

        </Link>







        <Link

          className={
            isActive("/seller/products")
            ? "active"
            : ""
          }

          to="/seller/products"

        >

          📦 Products

        </Link>







        <Link

          className={
            isActive("/seller/orders")
            ? "active"
            : ""
          }

          to="/seller/orders"

        >

          🧾 Orders

        </Link>







        <Link

          className={
            isActive("/seller/messages")
            ? "active"
            : ""
          }

          to="/seller/messages"

        >

          💬 Messages

        </Link>







        <Link

          className={
            isActive("/seller/shipping")
            ? "active"
            : ""
          }

          to="/seller/shipping"

        >

          🚚 Shipping

        </Link>







        <Link

          className={
            isActive("/seller/analytics")
            ? "active"
            : ""
          }

          to="/seller/analytics"

        >

          📈 Analytics

        </Link>







        <Link

          className={
            isActive("/seller/stories")
            ? "active"
            : ""
          }

          to="/seller/stories"

        >

          📸 Stories

        </Link>







        <Link

          className={
            isActive("/seller/settings")
            ? "active"
            : ""
          }

          to="/seller/settings"

        >

          ⚙ Settings

        </Link>








        {/* 
          Opens seller checker:
          Login check + Store check
        */}

        <Link

          className="seller-center-button"

          to="/seller/entry"

        >

          🏪 Seller Center

        </Link>







        <Link

          className="marketplace-button"

          to="/marketplace"

        >

          🛍 Marketplace

        </Link>





      </div>





    </nav>


  );

}