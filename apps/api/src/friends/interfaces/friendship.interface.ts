import { FriendshipStatusType } from "../types/friendship.types";


export interface IFriendship {


_id:string;


requester:string;


receiver:string;


status:FriendshipStatusType;


createdAt?:Date;


updatedAt?:Date;


}