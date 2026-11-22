import { UnauthorizedException } from '@nestjs/common';
import { Types } from 'mongoose';

export interface RequestUser {
  id: string;
  role: string;
  isSuperAdmin: boolean;
  name: string;
}

/** Reads the authenticated user populated by the existing Fockis JWT strategy. */
export function getRequestUser(req: any, required = true): RequestUser | null {
  const u = req?.user;
  const id = u?.id ?? u?._id ?? u?.userId ?? u?.sub;
  if (!id || !Types.ObjectId.isValid(String(id))) {
    if (required) throw new UnauthorizedException('Authentication required.');
    return null;
  }
  const role = String(u?.role ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return {
    id: String(id),
    role,
    isSuperAdmin: role === 'super_admin' || u?.isSuperAdmin === true,
    name: String(u?.name ?? u?.fullName ?? u?.displayName ?? u?.username ?? u?.email ?? 'User'),
  };
}

export function isPlatformAdmin(user: RequestUser | null): boolean {
  return !!user && (user.isSuperAdmin || user.role === 'admin' || user.role === 'super_admin');
}

export const oid = (v: string | Types.ObjectId) => new Types.ObjectId(String(v));
