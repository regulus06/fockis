export class FanoutWorker {

  async sendToUsers(conversationId: string, message: any) {

    // 1. get participants
    // 2. push to websocket cluster
    // 3. push to notification service if offline

    console.log("Fanout message:", conversationId);
  }
}