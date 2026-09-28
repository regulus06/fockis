import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

const CANDIDATES: Record<string, string[]> = {
  shop: ['Order','ShopOrder','ProductOrder','CartOrder'],
  live: ['LiveStream','Stream','GiftTransaction'],
  music: ['MusicPurchase','PlaylistPurchase','MusicTransaction'],
  travel: ['TravelBooking','Booking','TripBooking'],
  realestate: ['Property','RealEstateListing','RealEstateProperty'],
  ai: ['AiJob','AIJob','AiUsage','AICreditTransaction'],
  finance: ['Payment','Transaction','Refund','Payout'],
};

@Injectable()
export class UserDomainActivityService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async summary(userId: string) {
    const result: Record<string, any> = {};
    for (const [domain, names] of Object.entries(CANDIDATES)) {
      result[domain] = await this.countAcrossModels(names, userId);
    }
    return result;
  }

  async list(domain: string, userId: string, q: any = {}) {
    const names = CANDIDATES[domain] ?? [];
    const limit = Math.min(100, Math.max(1, Number(q.limit ?? 50)));
    const skip = Math.max(0, Number(q.skip ?? 0));
    for (const name of names) {
      const model = this.connection.models[name];
      if (!model) continue;
      const fields = ['$userId','$customerId','$buyerId','$ownerId','$sellerId'];
      const filter: any = { $or: fields.map(f => ({ [f.slice(1)]: userId })) };
      const [items, total] = await Promise.all([model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(), model.countDocuments(filter)]);
      return { items, total, page: Math.floor(skip / limit) + 1, limit, pages: Math.ceil(total / limit), source: name };
    }
    return { items: [], total: 0, page: Math.floor(skip / limit) + 1, limit, pages: 0, source: null };
  }

  private async countAcrossModels(names: string[], userId: string) {
    for (const name of names) {
      const model = this.connection.models[name];
      if (!model) continue;
      const filter = { $or: [{ userId }, { customerId: userId }, { buyerId: userId }, { ownerId: userId }, { sellerId: userId }] };
      return await model.countDocuments(filter);
    }
    return 0;
  }
}
