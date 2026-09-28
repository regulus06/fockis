import {
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";

import { Server } from "socket.io";

@WebSocketGateway({
  cors: { origin: "*" },
})
export class RulesGateway {

  @WebSocketServer()
  server: Server;

  emitRulesUpdated(rules: any[]) {
    this.server.emit("rules.updated", rules);
  }

  emitStats(stats: any) {
    this.server.emit("rules.stats", stats);
  }
}