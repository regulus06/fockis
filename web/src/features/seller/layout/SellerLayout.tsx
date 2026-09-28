import { Outlet } from "react-router-dom";

import SellerSidebar from "../components/SellerSidebar";
import SellerFooter from "../components/SellerFooter";

import "../styles/SellerLayout.scss";

function SellerLayout() {
return ( <div className="seller-layout"> <div className="seller-layout__body"> <SellerSidebar />

    <div className="seller-layout__main">
      <main className="seller-layout__content">
        <Outlet />
      </main>

      <SellerFooter />
    </div>
  </div>
</div>

);
}

export default SellerLayout;
