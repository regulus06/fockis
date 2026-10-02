import {
  useCallback,
  useEffect,
  useState,
} from "react";


import {
  marketplaceAdminApi
} from "../service/marketplaceAdminApi";




export interface Seller {


  _id:string;


  name:string;


  email:string;


  verified:boolean;


  status?:
    | "active"
    | "pending"
    | "suspended";


  createdAt?:string;


}







export const useSellers = ()=>{



const [sellers,setSellers] =
useState<Seller[]>([]);



const [loading,setLoading] =
useState(false);







const loadSellers = useCallback(
async()=>{


try{


setLoading(true);



const response =
await marketplaceAdminApi.getSellers();




const data =

response.data?.sellers ??

response.data ??

[];





setSellers(data);



}catch(error){



console.error(
"Seller loading failed",
error
);



}finally{



setLoading(false);



}



},[]);










useEffect(()=>{


loadSellers();


},[loadSellers]);









const verifySeller = async(
id:string
)=>{


try{


await marketplaceAdminApi.verifySeller(
id
);


await loadSellers();



}catch(error){


console.error(
"Verify seller failed",
error
);


}


};









const suspendSeller = async(
id:string
)=>{


try{


await marketplaceAdminApi.suspendSeller(
id
);


await loadSellers();



}catch(error){


console.error(
"Suspend seller failed",
error
);


}


};









const deleteSeller = async(
id:string
)=>{


try{


await marketplaceAdminApi.deleteSeller(
id
);


await loadSellers();



}catch(error){


console.error(
"Delete seller failed",
error
);


}


};








return {


sellers,


loading,


loadSellers,


verifySeller,


suspendSeller,


deleteSeller,


};



};