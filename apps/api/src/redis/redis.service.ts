import { Injectable } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisService {
  public client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
  }

  publish(channel: string, message: any) {
    this.client.publish(channel, JSON.stringify(message));
  }

  subscribe(channel: string, callback: (msg: any) => void) {
    this.client.subscribe(channel);
    this.client.on("message", (ch, msg) => {
      if (ch === channel) callback(JSON.parse(msg));
    });
  }
}