import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { AdminDashboardService } from './admin-dashboard.service';

@Injectable()
@WebSocketGateway({
  namespace: '/admin',
  cors: {
    origin: '*',
  },
})
export class AdminDashboardGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(AdminDashboardGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly dashboardService: AdminDashboardService,
  ) {}

  afterInit() {
    this.logger.log('Admin dashboard gateway initialized');

    setInterval(async () => {
      const metrics = await this.dashboardService.getMetrics();

      this.server.emit('metrics', metrics);
    }, 5000);
  }

  handleConnection(client: Socket) {
    this.logger.log(`Admin connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Admin disconnected: ${client.id}`);
  }

  async broadcastMetrics() {
    const metrics = await this.dashboardService.getMetrics();
    this.server.emit('metrics', metrics);
  }
}