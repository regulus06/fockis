import "./ProductStory.scss";

type Props = {
  story:any;
};


export default function ProductStory({
  story
}:Props){


const imageUrl = story.media?.startsWith("http")
?
story.media
:
`http://localhost:3000${story.media}`;



const openProduct = ()=>{

if(story.shopLink){

window.location.href = story.shopLink;

}

};



return (

<div 
className="product-story"
onClick={openProduct}
>


<img
src={imageUrl}
className="product-story-image"
/>



<div className="product-story-info">


<div className="product-story-user">

<img

src={
story.avatar ||
"https://via.placeholder.com/40"
}

/>

<span>
{story.username}
</span>

</div>



<h4>
{story.productName}
</h4>


<p>
${story.price}
</p>



<button>
View Product
</button>


</div>


</div>

);

}