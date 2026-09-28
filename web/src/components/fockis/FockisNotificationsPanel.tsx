import React from "react";

import type {
  AppNotification,
} from "../../features/notifications/type/Notification";


import "../../styles/FockisNotificationsPanel.scss";



interface Props {

  notifications: AppNotification[];

  unreadCount:number;

  onRead:(id:string)=>void;

  onReadAll:()=>void;

  onDelete:(id:string)=>void;

}



export default function FockisNotificationsPanel({

notifications,

unreadCount,

onRead,

onReadAll,

onDelete,

}:Props){



return (

<div className="fk-notification-panel">


<div className="fk-notification-panel__header">

<h3>
Notifications
</h3>


{unreadCount > 0 && (

<button
onClick={onReadAll}
>
Mark all read
</button>

)}


</div>



<div className="fk-notification-panel__list">


{
notifications.length === 0 ? (

<div className="fk-notification-empty">

No notifications

</div>


)

:

notifications.map(notification=>(


<div

key={
notification._id
}

className={

notification.read

?

"fk-notification-item"

:

"fk-notification-item unread"

}



onClick={()=>{

if(!notification.read){

onRead(
notification._id
);

}

}}

>



<div className="fk-notification-content">


<strong>

{
notification.title ||
"Fockis"
}

</strong>


<p>

{
notification.message
}

</p>


<span>

{
notification.createdAt
?
new Date(
notification.createdAt
).toLocaleString()
:
""
}

</span>



</div>




<button

className="delete"

onClick={(e)=>{

e.stopPropagation();

onDelete(
notification._id
);

}}

>

×


</button>



</div>


))


}



</div>



</div>


);


}