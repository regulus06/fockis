import type { PermissionValue } from './permission.constants';

export function hasPermission(
  granted: PermissionValue[],
  required: PermissionValue,
): boolean {
  return granted.includes(required);
}

export function hasAnyPermission(
  granted: PermissionValue[],
  required: PermissionValue[],
): boolean {
  if (required.length === 0) return true;
  return required.some((p) => granted.includes(p));
}

export function hasAllPermissions(
  granted: PermissionValue[],
  required: PermissionValue[],
): boolean {
  if (required.length === 0) return true;
  return required.every((p) => granted.includes(p));
}
