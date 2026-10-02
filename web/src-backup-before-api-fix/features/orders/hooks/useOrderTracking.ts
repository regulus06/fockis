import {
  useEffect,
  useState,
} from "react";

import socket from "../../../socket";


export function useOrderTracking(
  orderId:string,
  initialStatus:string = "pending"
){

  const [
    status,
    setStatus
  ] = useState(initialStatus);



  useEffect(()=>{


    const handler = (
      data:any
    )=>{


      if(
        data.orderId === orderId
      ){

        setStatus(
          data.status
        );

      }


    };



    socket.on(
      "shipping:update",
      handler
    );



    return ()=>{


      socket.off(
        "shipping:update",
        handler
      );


    };


  },[
    orderId
  ]);



  return {
    status
  };

}