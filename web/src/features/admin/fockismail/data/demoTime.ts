// Shared clock for all demo data so dates line up across files.
export const DEMO_NOW = new Date("2026-10-03T09:00:00Z");
export const daysAgo = (d: number): string => new Date(DEMO_NOW.getTime() - d * 86400000).toISOString();
export const daysAhead = (d: number): string => new Date(DEMO_NOW.getTime() + d * 86400000).toISOString();
