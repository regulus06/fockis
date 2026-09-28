import {
WebSocketGateway,
SubscribeMessage,
MessageBody,
ConnectedSocket
} from "@nestjs/websockets";


import { Socket } from "socket.io";



@WebSocketGateway({
cors:true
})
export class GroupsGateway {



@SubscribeMessage("joinGroup")

joinGroup(
@MessageBody() groupId:string,
@ConnectedSocket() socket:Socket
){


socket.join(groupId);


}






@SubscribeMessage("sendMessage")

sendMessage(

@MessageBody() data:any,

@ConnectedSocket() socket:Socket

){


socket.to(data.groupId)
.emit(
"receiveMessage",
data
);


}





}