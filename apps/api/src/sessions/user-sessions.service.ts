import { Injectable } from "@nestjs/common";

@Injectable()
export class UserSessionsService {

  private sessions = new Map<string, Set<string>>();
  // userId → socketIds/devices

  addSession(userId: string, socketId: string) {
    if (!this.sessions.has(userId)) {
      this.sessions.set(userId, new Set());
    }
    this.sessions.get(userId)!.add(socketId);
  }

  removeSession(userId: string, socketId: string) {
    this.sessions.get(userId)?.delete(socketId);
  }

  getUserSessions(userId: string) {
    return this.sessions.get(userId) || new Set();
  }
}