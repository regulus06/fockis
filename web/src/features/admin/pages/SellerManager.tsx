import {
  useState
} from "react";

import {
  useSellers
} from "../hooks/useSellers";


import "../styles/SellerManager.scss";



export default function SellerManager(){



  const {

    sellers,

    loading,

    verifySeller,

    suspendSeller,

    deleteSeller

  } = useSellers();




  const [actionLoading,setActionLoading] =
    useState<string | null>(null);






  const handleVerify = async(
    id:string
  )=>{


    try {


      setActionLoading(id);


      await verifySeller(id);



    } catch(error){


      console.error(
        "Verify seller failed",
        error
      );


    } finally {


      setActionLoading(null);


    }


  };









  const handleSuspend = async(
    id:string
  )=>{


    try {


      setActionLoading(id);


      await suspendSeller(id);



    } catch(error){


      console.error(
        "Suspend seller failed",
        error
      );


    } finally {


      setActionLoading(null);


    }


  };









  const handleDelete = async(
    id:string
  )=>{


    try {


      setActionLoading(id);


      await deleteSeller(id);



    } catch(error){


      console.error(
        "Delete seller failed",
        error
      );


    } finally {


      setActionLoading(null);


    }


  };









  return(


    <div className="seller-manager">






      <div className="page-header">


        <div>


          <h1>
            Seller Management
          </h1>


          <p>
            Manage marketplace sellers
          </p>


        </div>


      </div>









      {
        loading ?


        (

          <div className="loading">

            Loading sellers...

          </div>


        )


        : sellers.length === 0 ?


        (

          <div className="empty-state">

            No sellers found.

          </div>


        )


        :


        (



          <table className="seller-table">


            <thead>


              <tr>


                <th>
                  Seller
                </th>


                <th>
                  Email
                </th>


                <th>
                  Status
                </th>


                <th>
                  Actions
                </th>


              </tr>


            </thead>







            <tbody>



              {
                sellers.map(
                  seller=>(


                    <tr
                      key={seller._id}
                    >




                      <td>

                        {seller.name}

                      </td>






                      <td>

                        {seller.email}

                      </td>







                      <td>


                        <span

                          className={
                            seller.verified

                            ?

                            "status active"

                            :

                            "status pending"
                          }

                        >


                          {
                            seller.verified

                            ?

                            "Verified"

                            :

                            "Pending"
                          }


                        </span>


                      </td>








                      <td>




                        {
                          !seller.verified &&


                          <button

                            disabled={
                              actionLoading === seller._id
                            }

                            onClick={() =>
                              handleVerify(
                                seller._id
                              )
                            }

                          >

                            Verify

                          </button>

                        }









                        <button

                          disabled={
                            actionLoading === seller._id
                          }

                          onClick={() =>
                            handleSuspend(
                              seller._id
                            )
                          }

                        >

                          Suspend

                        </button>









                        <button

                          className="danger"

                          disabled={
                            actionLoading === seller._id
                          }

                          onClick={() =>
                            handleDelete(
                              seller._id
                            )
                          }

                        >

                          Delete

                        </button>






                      </td>






                    </tr>


                  )

                )

              }





            </tbody>





          </table>



        )

      }





    </div>


  );


}