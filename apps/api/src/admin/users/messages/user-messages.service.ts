import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { limitValue, pageValue } from '../user-admin-utils';

@Injectable()
export class UserMessagesService {
  constructor(@InjectConnection() private readonly connection: Connection) {}
  async list(userId: string, q: any) {
    const candidates = ['Conversation','ChatConversation','MessageThread']; const limit = limitValue(q.limit); const skip = Number(q.skip ?? (pageValue(q.page)-1)*limit) || 0;
    for (const name of candidates) {
      const model = this.connection.models[name]; if (!model) continue;
      const filter: any = { $or: [{ participantIds: userId }, { participants: userId }, { userIds: userId }, { 'participants.userId': userId }] };
      const [docs,total] = await Promise.all([model.find(filter).sort({ updatedAt:-1, lastMessageAt:-1 }).skip(skip).limit(limit).lean().exec(), model.countDocuments(filter)]);
      const items = docs.map((d:any)=>({ conversationId:String(d._id), participantId:String((d.participantIds ?? d.participants ?? d.userIds ?? []).find((x:any)=>String(x)!==userId) ?? ''), participantName:d.participantName, participantFockisId:d.participantFockisId, lastMessage:d.lastMessage?.text ?? d.lastMessageText ?? d.lastMessage, lastMessageAt:d.lastMessageAt ?? d.updatedAt, messageCount:Number(d.messageCount ?? 0), unreadCount:Number(d.unreadCount ?? 0), status:d.status }));
      return { items, conversations:items, total, page:Math.floor(skip/limit)+1, limit, pages:Math.ceil(total/limit) };
    }
    return { items:[], conversations:[], total:0, page:1, limit, pages:0 };
  }
}
