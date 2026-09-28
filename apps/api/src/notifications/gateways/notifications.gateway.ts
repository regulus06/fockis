import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  OnGatewayConnection,
} from "@nestjs/websockets";


import {
  Server,
  Socket,
} from "socket.io";




@WebSocketGateway({

  cors:{
    origin:"*",
  },

  namespace:"notifications",

})
export class NotificationsGateway
implements OnGatewayConnection {



  @WebSocketServer()
  server!: Server;






  handleConnection(
    client:Socket,
  ){


    const userId =
      client.handshake.auth?.userId
      ||
      client.handshake.query?.userId;



    if(userId){


      client.join(
        `user_${userId}`,
      );


      console.log(
        `Notification socket connected: user_${userId}`,
      );


    }


  }








  sendNotification(

    userId:string,

    notification:any,

  ){


    if(!this.server){

      return;

    }



    this.server
      .to(`user_${userId}`)
      .emit(

        "notification",

        notification,

      );


  }








  @SubscribeMessage("ping")
  ping(

    @ConnectedSocket()
    client:Socket,

  ){


    client.emit(

      "pong",

      {

        message:
        "notification server active",

      },

    );


  }



}