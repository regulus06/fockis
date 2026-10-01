import { FOCKIS_API_URL } from "../../config/fockisConfig";

// LOCATION:
// web/src/socket/events/createSocket.ts


import {
  io,
  Socket,
} from "socket.io-client";



const BASE_URL =
  FOCKIS_API_URL;





export function createSocket(
  namespace:string = ""
):Socket {


  const userId =
    localStorage.getItem("userId") || "";



  const socketUrl =
    namespace
      ? `${BASE_URL}/${namespace.replace("/", "")}`
      : BASE_URL;





  return io(
    socketUrl,
    {


      transports:[
        "websocket",
      ],



      autoConnect:false,



      reconnection:true,



      auth:{

        userId,

      },


    },
  );

}