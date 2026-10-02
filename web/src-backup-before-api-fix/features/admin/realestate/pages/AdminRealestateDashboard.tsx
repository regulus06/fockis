import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../styles/AdminRealEstateDashboard.scss";

import api from "../../../../api/api";


export default function AdminRealEstateDashboard(){

  const navigate = useNavigate();


  const [stats,setStats] = useState<any>({
    total:0,
    pending:0,
    approved:0,
    rejected:0,
    featured:0
  });


  const [properties,setProperties] = useState<any[]>([]);



  useEffect(()=>{

    loadDashboard();

    loadProperties();

  },[]);



  async function loadDashboard(){

    const res = await api.get(
      "/admin/realestate/dashboard"
    );

    setStats(res.data);

  }



  async function loadProperties(){

    const res = await api.get(
      "/admin/realestate/properties"
    );

    setProperties(res.data);

  }




  return (

    <div className="admin-realestate">


      <h1>
        Real Estate Administration
      </h1>



      <div className="stats-grid">


        <div className="card">
          <h3>Total</h3>
          <strong>
            {stats.total}
          </strong>
        </div>



        <div className="card pending">
          <h3>Pending</h3>
          <strong>
            {stats.pending}
          </strong>
        </div>



        <div className="card approved">
          <h3>Approved</h3>
          <strong>
            {stats.approved}
          </strong>
        </div>



        <div className="card rejected">
          <h3>Rejected</h3>
          <strong>
            {stats.rejected}
          </strong>
        </div>



        <div className="card featured">
          <h3>Featured</h3>
          <strong>
            {stats.featured}
          </strong>
        </div>


      </div>





      <section>


        <h2>
          Property Listings
        </h2>



        <table>


          <thead>

            <tr>

              <th>
                Title
              </th>

              <th>
                Price
              </th>

              <th>
                Status
              </th>

              <th>
                Views
              </th>

              <th>
                Action
              </th>

            </tr>

          </thead>



          <tbody>


          {
            properties.map((property)=>(
              
              <tr key={property._id}>


                <td>
                  {property.title}
                </td>


                <td>
                  ${property.price}
                </td>


                <td>
                  {property.status}
                </td>


                <td>
                  {property.views}
                </td>


                <td>

                  <button
                    onClick={()=>
                      navigate(
                        `/admin/realestate/property/${property._id}`
                      )
                    }
                  >
                    Review
                  </button>

                </td>


              </tr>

            ))
          }


          </tbody>


        </table>


      </section>


    </div>

  );

}