import {
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";

import { Server } from "socket.io";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class ShippingGateway {

  @WebSocketServer()
  server: Server;

  // =========================
  // BROADCAST STATUS UPDATE
  // =========================
  emitStatusUpdate(orderId: string, status: string) {

    this.server.emit("shipping:update", {
      orderId,
      status,
      updatedAt: new Date(),
    });
  }

  // =========================
  // BROADCAST TRACKING UPDATE
  // =========================
  emitTrackingUpdate(orderId: string, trackingNumber: string) {

    this.server.emit("shipping:tracking", {
      orderId,
      trackingNumber,
    });
  }
}