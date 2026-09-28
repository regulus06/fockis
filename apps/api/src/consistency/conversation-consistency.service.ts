import { Injectable } from '@nestjs/common';

@Injectable()
export class ConversationConsistencyService {
  private messageVersions: Map<string, number> = new Map();

  checkConsistency(conversationId: string, version: number) {
    const lastVersion = this.messageVersions.get(conversationId) || 0;

    const isConsistent = version >= lastVersion;

    return {
      conversationId,
      isConsistent,
      lastVersion,
      incomingVersion: version,
    };
  }

  updateVersion(conversationId: string, version: number) {
    const current = this.messageVersions.get(conversationId) || 0;

    if (version > current) {
      this.messageVersions.set(conversationId, version);
    }

    return {
      conversationId,
      updated: version > current,
      currentVersion: this.messageVersions.get(conversationId),
    };
  }

  resetConversation(conversationId: string) {
    this.messageVersions.delete(conversationId);

    return {
      conversationId,
      reset: true,
    };
  }
}