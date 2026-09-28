export const MAP_PERMISSIONS = {
  ADDRESS_CREATE: "map.address.create",
  ADDRESS_UPDATE: "map.address.update",
  ADDRESS_DEACTIVATE: "map.address.deactivate",
  ADDRESS_MANAGE: "map.address.manage",

  UNIT_CREATE: "map.unit.create",
  UNIT_UPDATE: "map.unit.update",

  REQUEST_REVIEW: "map.request.review",
  REQUEST_APPROVE: "map.request.approve",
  REQUEST_REJECT: "map.request.reject",
  REQUEST_REVOKE: "map.request.revoke",
} as const;

export type MapPermission =
  (typeof MAP_PERMISSIONS)[keyof typeof MAP_PERMISSIONS];

export const MAP_ADDRESS_MANAGEMENT_PERMISSIONS = new Set<string>([
  MAP_PERMISSIONS.ADDRESS_MANAGE,
  MAP_PERMISSIONS.ADDRESS_CREATE,
  MAP_PERMISSIONS.ADDRESS_UPDATE,
  MAP_PERMISSIONS.ADDRESS_DEACTIVATE,
]);

export const MAP_UNIT_MANAGEMENT_PERMISSIONS = new Set<string>([
  MAP_PERMISSIONS.ADDRESS_MANAGE,
  MAP_PERMISSIONS.UNIT_CREATE,
  MAP_PERMISSIONS.UNIT_UPDATE,
]);