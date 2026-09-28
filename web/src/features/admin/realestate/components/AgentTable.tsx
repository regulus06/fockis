import React from "react";

interface Props {
    properties: any[];
    onApprove(id:string):void;
    onReject(id:string):void;
    onFeature(id:string):void;
    onDelete(id:string):void;
}

export default function PropertyTable({
    properties,
    onApprove,
    onReject,
    onFeature,
    onDelete,
}:Props){

return(

<table className="admin-table">

<thead>

<tr>

<th>Image</th>

<th>Address</th>

<th>Agent</th>

<th>Price</th>

<th>Status</th>

<th>Featured</th>

<th>Actions</th>

</tr>

</thead>

<tbody>

{properties.map(property=>(

<tr key={property._id}>

<td>

<img
src={property.images?.[0]}
width={80}
/>

</td>

<td>{property.address}</td>

<td>{property.agent?.name}</td>

<td>${property.price}</td>

<td>{property.status}</td>

<td>{property.featured ? "Yes":"No"}</td>

<td>

<button
onClick={()=>onApprove(property._id)}
>

Approve

</button>

<button
onClick={()=>onReject(property._id)}
>

Reject

</button>

<button
onClick={()=>onFeature(property._id)}
>

Feature

</button>

<button
onClick={()=>onDelete(property._id)}
>

Delete

</button>

</td>

</tr>

))}

</tbody>

</table>

);

}