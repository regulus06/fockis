import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import PropertyGallery from "../components/PropertyGallery";
import PropertyInfoCard from "../components/PropertyInfoCard";
import PropertyStatsCard from "../components/PropertyStatsCard";
import PropertyLocationCard from "../components/PropertyLocationCard";
import PropertyContactCard from "../components/PropertyContactCard";
import PropertyModerationCard from "../components/PropertyModerationCard";
import PropertyActions from "../components/PropertyActions";

import "../styles/AdminPropertyDetails.scss";


interface Property {

  _id: string;

  title: string;
  description: string;
  price:number;

  location?:string;
  city?:string;
  state?:string;
  country?:string;
  zipCode?:string;

  type:string;

  bedrooms:number;
  bathrooms:number;

  images:string[];


  views?:number;
  favorites?:number;
  shares?:number;
  inquiries?:number;
  tourRequests?:number;


  contactName?:string;
  contactEmail?:string;
  contactPhone?:string;


  status?:string;
  featured?:boolean;
  verified?:boolean;

  reports?:number;

  rejectionReason?:string;

  approvedBy?:string;
  approvedAt?:string;

  suspendedAt?:string;
  suspensionReason?:string;


  latitude?:number;
  longitude?:number;


  squareFeet?:number;
  lotSize?:number;
  yearBuilt?:number;

}



export default function AdminPropertyDetailsPage() {


  const { id } = useParams();


  const [property,setProperty] =
    useState<Property | null>(null);


  const [loading,setLoading] =
    useState(true);



  useEffect(()=>{

    async function loadProperty(){

      try {


        const response =
          await fetch(
            `/api/realestate/properties/${id}`
          );


        const data =
          await response.json();


        setProperty(data);


      } catch(error){

        console.error(
          "Failed loading property",
          error
        );

      }
      finally{

        setLoading(false);

      }

    }


    loadProperty();


  },[id]);





  async function action(type:string){


    if(!id)
      return;


    await fetch(
      `/api/admin/realestate/${id}/${type}`,
      {
        method:"PATCH"
      }
    );


    window.location.reload();

  }





  if(loading){

    return (

      <div className="admin-property-loading">

        Loading property...

      </div>

    );

  }



  if(!property){

    return (

      <div>

        Property not found

      </div>

    );

  }





  return (

    <div className="admin-property-page">


      <h1>
        Property Review
      </h1>



      <PropertyActions

        propertyId={property._id}

        status={property.status}

        featured={property.featured}

        onApprove={()=>action("approve")}

        onReject={()=>action("reject")}

        onFeature={()=>action("feature")}

        onSuspend={()=>action("suspend")}

        onDelete={()=>action("delete")}

      />



      <PropertyGallery

        images={property.images}

      />



      <PropertyInfoCard

        property={property}

      />



      <PropertyStatsCard

        property={property}

      />



      <PropertyLocationCard

        property={property}

      />



      <PropertyContactCard

        property={property}

      />



      <PropertyModerationCard

        property={property}

      />



    </div>

  );

}