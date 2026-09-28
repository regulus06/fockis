import { Injectable } from '@nestjs/common';

@Injectable()
export class ConversationShardService {
  shardConversation(conversationId: string): string {
    // simple deterministic sharding strategy
    const shardCount = 10;

    let hash = 0;
    for (let i = 0; i < conversationId.length; i++) {
      hash = (hash * 31 + conversationId.charCodeAt(i)) >>> 0;
    }

    const shardId = hash % shardCount;

    return `shard-${shardId}`;
  }

  getShardForUser(userId: string): string {
    // optional user-based routing
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = (hash * 17 + userId.charCodeAt(i)) >>> 0;
    }

    const shardId = hash % 10;

    return `user-shard-${shardId}`;
  }
}