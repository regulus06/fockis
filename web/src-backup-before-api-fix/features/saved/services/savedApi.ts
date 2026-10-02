import axios from "axios";

const API =
"http://localhost:3000";


export const savedApi={


async getSaved(){

const res =
await axios.get(
`${API}/saved`,
{
headers:{
Authorization:
`Bearer ${localStorage.getItem("token")}`
}
}
);

return res.data;

},



async save(postId:string){

return axios.post(
`${API}/saved`,
{
postId
},
{
headers:{
Authorization:
`Bearer ${localStorage.getItem("token")}`
}
}
);

},



async remove(postId:string){

return axios.delete(
`${API}/saved/${postId}`,
{
headers:{
Authorization:
`Bearer ${localStorage.getItem("token")}`
}
}
);

}

}