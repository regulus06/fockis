import {
  useState
} from "react";


import {
  useInventory,
  InventoryItem
} from "../hooks/useInventory";


import "../styles/InventoryManager.scss";



export default function InventoryManager() {


  const {

    inventory,

    loading,

    updateInventory,

  } = useInventory();




  const [editingId, setEditingId] =
    useState<string | null>(null);



  const [quantity, setQuantity] =
    useState<number>(0);



  const [saving, setSaving] =
    useState(false);






  const startEdit = (
    item: InventoryItem
  ) => {


    setEditingId(
      item._id
    );


    setQuantity(
      item.quantity
    );


  };







  const saveQuantity = async () => {


    if (!editingId)
      return;



    try {


      setSaving(true);



      await updateInventory(

        editingId,

        Math.max(
          0,
          quantity
        )

      );



      setEditingId(null);



    } catch(error) {


      console.error(
        "Inventory update failed",
        error
      );


    } finally {


      setSaving(false);


    }


  };








  return (

    <div className="inventory-manager">



      <div className="page-header">


        <div>

          <h1>
            Inventory Management
          </h1>


          <p>
            Monitor and update product stock
          </p>


        </div>


      </div>








      {
        loading ?


        (

          <div className="loading">

            Loading inventory...

          </div>

        )


        :


        inventory.length === 0 ?


        (

          <div className="empty-state">

            No inventory found.

          </div>

        )


        :


        (

          <table className="inventory-table">


            <thead>


              <tr>


                <th>
                  Product
                </th>


                <th>
                  Stock
                </th>


                <th>
                  Last Updated
                </th>


                <th>
                  Actions
                </th>


              </tr>


            </thead>





            <tbody>


              {

                inventory.map(
                  (item: InventoryItem)=>(


                    <tr
                      key={item._id}
                    >



                      <td>

                        {
                          item.product?.name ??
                          "N/A"
                        }

                      </td>






                      <td>


                        {
                          editingId === item._id ?


                          (

                            <input

                              type="number"

                              min="0"

                              value={quantity}


                              onChange={
                                (e)=>
                                  setQuantity(
                                    Number(
                                      e.target.value
                                    )
                                  )
                              }

                            />

                          )


                          :


                          (

                            item.quantity

                          )

                        }


                      </td>







                      <td>


                        {
                          item.updatedAt ?


                          new Date(
                            item.updatedAt
                          )
                          .toLocaleDateString()


                          :


                          "N/A"

                        }


                      </td>







                      <td>


                        {

                          editingId === item._id ?


                          (

                            <button

                              disabled={saving}

                              onClick={
                                saveQuantity
                              }

                            >

                              {
                                saving
                                ?
                                "Saving..."
                                :
                                "Save"
                              }


                            </button>

                          )


                          :


                          (

                            <button

                              onClick={
                                ()=>startEdit(item)
                              }

                            >

                              Edit

                            </button>

                          )

                        }


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