const API_URL =
  "http://localhost:3000";


export const groupsApi = {


  async getPendingInviteCount(): Promise<number> {


    try {


      const token =
        localStorage.getItem("token");



      const response =
        await fetch(
          `${API_URL}/groups/invites/count`,
          {
            headers:{
              Authorization:
                `Bearer ${token}`,
            },
          },
        );



      if(!response.ok){

        return 0;

      }



      const data =
        await response.json();



      return data.count ?? 0;



    } catch(error){


      console.error(
        "Groups count error:",
        error,
      );


      return 0;


    }


  },


};