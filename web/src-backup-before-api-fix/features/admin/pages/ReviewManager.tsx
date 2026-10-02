import {
  useReviews
} from "../hooks/useReviews";


import "../styles/ReviewManager.scss";



export default function ReviewManager(){



const {

reviews,

loading,

approveReview,

deleteReview,

}=useReviews();






const handleApprove = async(
id:string
)=>{


try{


await approveReview(id);



}catch(error){


console.error(
"Approve review failed",
error
);


}


};







const handleDelete = async(
id:string
)=>{


try{


await deleteReview(id);



}catch(error){


console.error(
"Delete review failed",
error
);


}


};








return(


<div className="review-manager">





<div className="page-header">


<div>

<h1>
Review Management
</h1>


<p>
Manage marketplace customer reviews
</p>


</div>


</div>








{

loading ?


(

<div className="loading">

Loading reviews...

</div>

)


:


(


<table className="review-table">


<thead>

<tr>

<th>
Customer
</th>


<th>
Rating
</th>


<th>
Comment
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


reviews.map(review=>(


<tr
key={review._id}
>



<td>

Customer

</td>





<td>

{"⭐".repeat(
review.rating
)}

</td>





<td>

{review.comment}

</td>







<td>


<span
className={
review.approved
?
"status active"
:
"status pending"
}
>


{

review.approved
?

"Approved"

:

"Pending"

}


</span>


</td>









<td>




{

!review.approved &&

<button

onClick={()=>handleApprove(review._id)}

>

Approve

</button>

}






<button

className="danger"

onClick={()=>handleDelete(review._id)}

>

Delete

</button>






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