import { Types } from 'mongoose';
export function userIdFrom(req:any):Types.ObjectId { const id=req?.user?.sub ?? req?.user?.id ?? req?.user?._id; if(!id || !Types.ObjectId.isValid(id)) throw new Error('Authenticated user id is missing or invalid.'); return new Types.ObjectId(id); }
export function workspaceFrom(req:any):string { return String(req?.headers?.['x-fockis-mail-workspace'] ?? req?.user?.workspaceId ?? 'default'); }
