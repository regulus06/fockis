import {
Controller,
Get,
Post,
Delete,
Body,
Req,
Param,
UseGuards,
} from "@nestjs/common";

import { SavedService } from "./saved.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";


@Controller("saved")
@UseGuards(JwtAuthGuard)
export class SavedController{


constructor(
private readonly savedService:SavedService
){}



/*
GET SAVED
*/

@Get()
findAll(
@Req() req:any
){

return this.savedService.findAll(
req.user.id
);

}



/*
SAVE
*/

@Post()
save(
@Req() req:any,
@Body() body:{
postId:string
}
){

return this.savedService.save(
req.user.id,
body.postId
);

}




/*
REMOVE
*/

@Delete(":postId")
remove(
@Req() req:any,
@Param("postId") postId:string
){

return this.savedService.remove(
req.user.id,
postId
);

}



@Get(":postId/check")
check(
@Req() req:any,
@Param("postId") postId:string
){

return this.savedService.check(
req.user.id,
postId
);

}


}