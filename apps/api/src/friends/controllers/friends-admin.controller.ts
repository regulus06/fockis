import {
Controller,
Get,
Post,
Patch,
Delete,
Body,
Param,
Query,
Req,
UseGuards
}
from "@nestjs/common";


import {
FriendsService
}
from "../services/friends.service";


import {
SendFriendRequestDto
}
from "../dto/send-friend-request.dto";


import {
BlockFriendDto
}
from "../dto/block-friend.dto";


import {
JwtAuthGuard
}
from "../../auth/jwt-auth.guard";



@Controller("friends")

@UseGuards(JwtAuthGuard)

export class FriendsController {


constructor(

private readonly friendsService:
FriendsService

){}




@Get()

getFriends(
@Req() req:any
){

return this.friendsService
.getFriends(
req.user._id
);

}





@Get("requests")

getRequests(
@Req() req:any
){

return this.friendsService
.getRequests(
req.user._id
);

}





@Get("requests/sent")

getSentRequests(
@Req() req:any
){

return this.friendsService
.getSentRequests(
req.user._id
);

}





@Post("request")

sendRequest(

@Req() req:any,

@Body() body:SendFriendRequestDto

){

return this.friendsService
.sendRequest(

req.user._id,

body.userId

);

}






@Patch(
"request/:id/accept"
)

accept(

@Req() req:any,

@Param("id") id:string

){

return this.friendsService
.acceptRequest(

req.user._id,

id

);

}





@Patch(
"request/:id/reject"
)

reject(

@Req() req:any,

@Param("id") id:string

){

return this.friendsService
.rejectRequest(

req.user._id,

id

);

}






@Delete(
"remove/:userId"
)

remove(

@Req() req:any,

@Param("userId") userId:string

){

return this.friendsService
.removeFriend(

req.user._id,

userId

);

}





@Post("block")

block(

@Req() req:any,

@Body() body:BlockFriendDto

){

return this.friendsService
.blockUser(

req.user._id,

body.userId

);

}






@Get("search")

search(

@Query("q") q:string

){

return this.friendsService
.searchUsers(q);

}





@Get("suggestions")

suggestions(

@Req() req:any

){

return this.friendsService
.suggestions(
req.user._id
);

}



}