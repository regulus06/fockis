export interface GiftEvent {


  giftId: string;


  giftName: string;


  emoji: string;


  senderId: string;


  senderName: string;


  receiverId: string;


  receiverName: string;



  /*
    LIVE session ID

    null if sent on profile
    or post
  */

  liveId?: string;



  /*
    Animation file

    Examples:

    super-train.webm
    royal-jet.webm
    volcano.webm

  */

  animation: string;



  sound?: string;



  duration: number;



  /*
    Controls large
    LIVE animation

  */

  fullScreenAnimation: boolean;



}