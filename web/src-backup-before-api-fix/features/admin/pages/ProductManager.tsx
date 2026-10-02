import {
  useState
} from "react";


import {
  useProducts,
  Product
} from "../hooks/useProducts";


import "../styles/ProductManager.scss";



export default function ProductManager(){



const {


products,

loading,

deleteProduct,

featureProduct,

hideProduct


}=useProducts();




const [activeTab,setActiveTab] =
useState("all");






const handleDelete = async(
id:string
)=>{


try{


await deleteProduct(id);



}catch(error){


console.error(
"Delete product failed",
error
);


}



};








const handleFeature = async(
id:string
)=>{


try{


await featureProduct(id);



}catch(error){


console.error(
"Feature product failed",
error
);


}


};








const handleHide = async(
id:string
)=>{


try{


await hideProduct(id);



}catch(error){


console.error(
"Hide product failed",
error
);


}


};







const filteredProducts =

products.filter((product)=>{


if(activeTab==="hidden"){

return product.status==="hidden";

}


if(activeTab==="pending"){

return product.status==="pending";

}


return true;


});








return(


<div className="product-manager">





<div className="page-header">


<div>

<h1>
Product Management
</h1>


<p>
Manage all marketplace products
</p>


</div>




<button className="primary-btn">

+ Add Product

</button>



</div>








<div className="product-actions">



<button

onClick={()=>setActiveTab("all")}

>

All Products

</button>



<button

onClick={()=>setActiveTab("pending")}

>

Pending Approval

</button>



<button

onClick={()=>setActiveTab("hidden")}

>

Hidden Products

</button>




<button>

Reported Products

</button>



</div>









{

loading ?


(

<div className="loading">

Loading products...

</div>


)


:


(



<table className="products-table">


<thead>

<tr>


<th>
Product
</th>


<th>
Category
</th>


<th>
Price
</th>


<th>
Stock
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


filteredProducts.map(
(product:Product)=>(


<tr
key={product._id}
>



<td>


<div className="product-name">



{

product.images?.[0] &&

<img

src={product.images[0]}

alt={product.name}

/>

}




<span>

{product.name}

</span>



</div>


</td>






<td>


{

typeof product.category === "object"

?

product.category.name

:

product.category || "N/A"


}



</td>






<td>

${product.price}

</td>





<td>

{product.stock ?? 0}

</td>






<td>


<span className="status">

{product.status ?? "active"}

</span>


</td>







<td>



<button>

View

</button>




<button>

Edit

</button>





<button

onClick={()=>handleFeature(product._id)}

>

Feature

</button>





<button

onClick={()=>handleHide(product._id)}

>

Hide

</button>






<button

className="danger"

onClick={()=>handleDelete(product._id)}

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