import { Injectable } from "@nestjs/common";

@Injectable()
export class MessageWorker {

  async handleEvent(event: any) {

    switch (event.type) {

      case "MESSAGE_SENT":
        // persist message
        // update conversation
        // fanout to websocket
        break;

      case "MESSAGE_READ":
        // update read state
        break;

      case "MESSAGE_DELIVERED":
        // update delivery state
        break;
    }
  }
}