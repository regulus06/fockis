// LOCATION:
// web/src/socket/events/createSocket.ts


import {
  io,
  Socket,
} from "socket.io-client";



const BASE_URL =
  "http://localhost:3000";





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