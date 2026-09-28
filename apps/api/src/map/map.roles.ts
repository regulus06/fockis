export const MAP_MANAGEMENT_ROLES = new Set([
  "super_admin",
  "SUPER_ADMIN",
  "admin",
  "MAP_ADMIN",
  "ADDRESS_ADMIN",
  "ADDRESS_MANAGER",
  "REGIONAL_MANAGER",
  "BUILDING_MANAGER",
]);

export function hasMapManagementRole(role?: string): boolean {
  return !!role && MAP_MANAGEMENT_ROLES.has(role);
}
