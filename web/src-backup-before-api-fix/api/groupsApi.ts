import api from "./api";




// CREATE GROUP

export const createGroup = async(data:any)=>{

return api.post(
"/groups",
data
);

};







// GET GROUPS

export const getGroups = async()=>{

return api.get(
"/groups"
);

};







// SEND MESSAGE

export const sendGroupMessage = async(data:any)=>{

return api.post(
"/groups/message",
data
);

};







// GET MESSAGES

export const getGroupMessages = async(id:string)=>{

return api.get(
`/groups/${id}/messages`
);

};








// JOIN GROUP

export const joinGroup = async(
id:string,
userId:string
)=>{


return api.post(
`/groups/${id}/join`,
{
userId
}
);


};








// LEAVE GROUP

export const leaveGroup = async(
id:string,
userId:string
)=>{


return api.post(
`/groups/${id}/leave`,
{
userId
}
);


};








// DELETE GROUP

export const deleteGroup = async(
id:string
)=>{


return api.delete(
`/groups/${id}`
);


};








// EDIT GROUP NAME

export const updateGroup = async(
id:string,
name:string
)=>{


return api.patch(
`/groups/${id}`,
{
name
}
);


};








// ACCEPT JOIN REQUEST

export const acceptJoin = async(
id:string,
userId:string
)=>{


return api.post(
`/groups/${id}/accept`,
{
userId
}
);


};