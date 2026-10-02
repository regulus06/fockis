import AdminSidebar from "../components/AdminSidebar";
import AdminTopbar from "../components/AdminTopbar";
import StatCard from "../components/StatCard";

import {
  useMarketplaceDashboard
} from "../hooks/useMarketplaceDashboard";

import "../styles/AdminDashboard.scss";



export default function MarketplaceDashboard() {


  const {
    dashboard,
    loading,
  } = useMarketplaceDashboard();




  return (

    <div className="admin-layout">


      <AdminSidebar />


      <main className="admin-content">


        <AdminTopbar />



        <section className="stats">


          <StatCard
            title="Total Products"
            value={
              loading
                ? "..."
                : dashboard?.products ?? 0
            }
            icon="📦"
          />



          <StatCard
            title="Total Orders"
            value={
              loading
                ? "..."
                : dashboard?.orders ?? 0
            }
            icon="🛒"
          />



          <StatCard
            title="Revenue"
            value={
              loading
                ? "..."
                : `$${dashboard?.revenue ?? 0}`
            }
            icon="💰"
          />



          <StatCard
            title="Sellers"
            value={
              loading
                ? "..."
                : dashboard?.sellers ?? 0
            }
            icon="👥"
          />


        </section>





        <section className="dashboard-grid">


          <div className="dashboard-box">

            <h3>
              Marketplace Activity
            </h3>


            <p>
              Product sales, orders and customer activity will appear here.
            </p>


          </div>





          <div className="dashboard-box">

            <h3>
              Recent Orders
            </h3>


            <p>
              Latest marketplace orders will appear here.
            </p>


          </div>



        </section>



      </main>


    </div>

  );

}