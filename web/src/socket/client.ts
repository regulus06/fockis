// LOCATION:
// web/src/socket/client.ts


import {
  io,
  Socket,
} from "socket.io-client";



let socket:Socket | null = null;





export const getSocket = ()=>{


if(!socket){


const userId =
localStorage.getItem("userId") || "";



socket = io(

  "http://localhost:3000/notifications",

  {


    transports:[
      "websocket",
    ],


    autoConnect:false,


    auth:{

      userId,

    },


  }

);





socket.on(
"connect",
()=>{


console.log(
"🟢 Notification socket connected:",
socket?.id
);


}

);






socket.on(
"disconnect",
()=>{


console.log(
"🔴 Notification socket disconnected"
);


}

);






socket.on(
"connect_error",
(error)=>{


console.error(
"❌ Notification socket error:",
error.message
);


}

);





}



return socket;


};





export const connectNotificationSocket = ()=>{


const socket =
getSocket();



if(!socket.connected){

 socket.connect();

}



return socket;


};






export const disconnectNotificationSocket = ()=>{


if(socket){

 socket.disconnect();

}


};