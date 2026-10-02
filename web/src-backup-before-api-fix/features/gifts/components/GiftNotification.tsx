interface Props {


senderName:string;


giftName:string;


emoji:string;


}



export default function GiftNotification({

senderName,

giftName,

emoji

}:Props){



return (

<div className="gift-notification">


<span>

{emoji}

</span>



<p>

<strong>

{senderName}

</strong>


sent

<strong>

{giftName}

</strong>

🎁


</p>



</div>

);


}