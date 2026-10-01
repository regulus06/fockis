import "./ProductFeedCard.scss";

import { useNavigate } from "react-router-dom";


type Props = {
product:any;
};



export default function ProductFeedCard({
product
}:Props){


const navigate = useNavigate();



const image =
product.images?.[0];


const imageUrl =
image?.startsWith("http")
?
image
:
`${FOCKIS_API_URL}${image}`;




const finalPrice =
product.discount > 0
?
product.price -
(product.price * product.discount / 100)
:
product.price;





return (

<div className="product-feed-card">



<img

src={imageUrl}

className="product-feed-image"

/>




<div className="product-feed-info">



<h3>
{product.name}
</h3>




<div>


{
product.discount > 0 ? (

<>

<span className="text-red-600 font-bold">

${finalPrice.toFixed(2)}

</span>


<span className="line-through ml-2">

${product.price}

</span>


<span className="ml-2 text-green-600">

{product.discount}% OFF

</span>

</>

)

:(

<span>
${product.price}
</span>

)

}


</div>





<button

onClick={()=>{

navigate(
`/marketplace/product/${product._id}`
);

}}

>

Buy

</button>



</div>


</div>


);


}