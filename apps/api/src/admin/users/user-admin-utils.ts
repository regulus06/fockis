import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';

export function bool(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true' || value === '1' || value === 1) return true;
  if (value === false || value === 'false' || value === '0' || value === 0) return false;
  return undefined;
}

export function pageValue(value: unknown, fallback = 1) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(1, Math.floor(n)) : fallback;
}

export function limitValue(value: unknown, fallback = 50) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(100, Math.max(1, Math.floor(n))) : fallback;
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function idFilter(model: Model<any>, id: string) {
  if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid user id');
  return { _id: id };
}

export function requireUser<T>(user: T | null | undefined): T {
  if (!user) throw new NotFoundException('User not found');
  return user;
}

export function hasPath(model: Model<any>, path: string) {
  return Boolean(model.schema.path(path));
}

export function setIfPresent(model: Model<any>, target: Record<string, any>, path: string, value: any) {
  if (hasPath(model, path) && value !== undefined) target[path] = value;
}

export function userIdString(user: any) {
  return String(user?._id ?? user?.id ?? '');
}

export function normalizeUser(user: any): any {
  if (!user) return null;
  const firstName = String(user.firstName ?? '');
  const lastName = String(user.lastName ?? '');
  const displayName = String(user.displayName ?? user.name ?? [firstName, lastName].filter(Boolean).join(' ') ?? '').trim();
  const lockedUntil = user.lockedUntil ? new Date(user.lockedUntil) : null;
  const locked = Boolean(lockedUntil && !Number.isNaN(lockedUntil.getTime()) && lockedUntil.getTime() > Date.now());
  const followers = Array.isArray(user.followers) ? user.followers.length : Number(user.followersCount ?? 0);
  const following = Array.isArray(user.following) ? user.following.length : Number(user.followingCount ?? 0);
  return {
    ...user,
    id: userIdString(user),
    _id: userIdString(user),
    username: String(user.username ?? ''),
    email: String(user.email ?? ''),
    firstName,
    lastName,
    displayName: displayName || String(user.username ?? user.email ?? ''),
    role: user.role ?? 'user',
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
    accountType: user.accountType ?? (user.sellerApproved ? 'seller' : 'user'),
    verified: Boolean(user.verified ?? user.isVerified),
    isActive: user.isActive !== false,
    fockisIdAccessPaid: Boolean(user.fockisIdAccessPaid),
    sellerApproved: Boolean(user.sellerApproved),
    premium: Boolean(user.premium ?? user.isPremium),
    online: Boolean(user.online),
    failedLoginAttempts: Number(user.failedLoginAttempts ?? 0),
    lockoutCount: Number(user.lockoutCount ?? 0),
    mustChangePassword: Boolean(user.mustChangePassword),
    passwordResetByAdmin: Boolean(user.passwordResetByAdmin),
    followersCount: followers,
    followingCount: following,
    friendsCount: Array.isArray(user.friends) ? user.friends.length : Number(user.friendsCount ?? 0),
    postsCount: Number(user.postsCount ?? 0),
    likesReceived: Number(user.likesReceived ?? 0),
    locked,
  };
}
