import {
  useOrders
} from "../hooks/useOrders";


import "../styles/OrderManager.scss";



export default function OrderManager(){



const {

orders,

loading,

}=useOrders();






return(


<div className="order-manager">





<div className="page-header">


<div>

<h1>
Order Management
</h1>


<p>
Manage marketplace orders
</p>


</div>


</div>









{

loading ?


(

<div className="loading">

Loading orders...

</div>


)


:


(


<table className="order-table">


<thead>


<tr>


<th>
Order ID
</th>


<th>
Customer
</th>


<th>
Total
</th>


<th>
Status
</th>


<th>
Date
</th>


</tr>


</thead>







<tbody>


{


orders.map(order=>(


<tr
key={order._id}
>



<td>

{order._id}

</td>





<td>


{

order.customer?.name ??

"N/A"

}


</td>






<td>


${order.total}


</td>







<td>


<span
className="status"
>

{order.status}

</span>


</td>







<td>


{

order.createdAt

?

new Date(
order.createdAt
)
.toLocaleDateString()

:

"N/A"

}


</td>







</tr>


))


}





</tbody>




</table>


)


}




</div>


);



}