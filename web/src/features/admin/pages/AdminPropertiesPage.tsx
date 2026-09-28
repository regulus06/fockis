import PropertyTable from "../components/PropertyTable";
import { useAdminProperties } from "../hooks/useAdminProperties";
import * as api from "../services/adminRealEstateApi";

export default function AdminPropertiesPage(){

const{
properties,
loading,
refresh,
}=useAdminProperties();

if(loading){

return <p>Loading...</p>;

}

return(

<div>

<h1>Properties</h1>

<PropertyTable

properties={properties}

onApprove={async(id)=>{

await api.approveProperty(id);

refresh();

}}

onReject={async(id)=>{

await api.rejectProperty(id);

refresh();

}}

onFeature={async(id)=>{

await api.featureProperty(id);

refresh();

}}

onDelete={async(id)=>{

await api.deleteProperty(id);

refresh();

}}

/>

</div>

);

}