export interface PassportPhotoSpec {
  country: string;
  documentType: string;
  width: number;
  height: number;
  unit: 'mm' | 'in' | 'px';
  background: string; // hex color
  headHeightRatio?: number; // fraction of photo height the head should occupy
}

/**
 * Configuration-driven passport/ID photo requirements. Add new countries
 * here (or move this to the database) without touching the service logic.
 */
export const PASSPORT_PHOTO_SPECS: Record<string, PassportPhotoSpec> = {
  'US:passport': { country: 'US', documentType: 'passport', width: 2, height: 2, unit: 'in', background: '#FFFFFF', headHeightRatio: 0.6 },
  'US:visa': { country: 'US', documentType: 'visa', width: 2, height: 2, unit: 'in', background: '#FFFFFF', headHeightRatio: 0.6 },
  'UK:passport': { country: 'UK', documentType: 'passport', width: 35, height: 45, unit: 'mm', background: '#FFFFFF', headHeightRatio: 0.7 },
  'SCHENGEN:passport': { country: 'SCHENGEN', documentType: 'passport', width: 35, height: 45, unit: 'mm', background: '#FFFFFF', headHeightRatio: 0.7 },
  'INDIA:passport': { country: 'INDIA', documentType: 'passport', width: 2, height: 2, unit: 'in', background: '#FFFFFF', headHeightRatio: 0.65 },
  'CANADA:passport': { country: 'CANADA', documentType: 'passport', width: 50, height: 70, unit: 'mm', background: '#FFFFFF', headHeightRatio: 0.55 },
  'CHINA:visa': { country: 'CHINA', documentType: 'visa', width: 33, height: 48, unit: 'mm', background: '#FFFFFF', headHeightRatio: 0.6 },
};

export function resolvePassportSpec(country?: string, documentType?: string): PassportPhotoSpec {
  const key = `${(country || 'US').toUpperCase()}:${(documentType || 'passport').toLowerCase()}`;
  return PASSPORT_PHOTO_SPECS[key] || PASSPORT_PHOTO_SPECS['US:passport'];
}

/** Converts a spec's width/height into pixels at the given DPI (default 300, print-quality). */
export function specToPixels(spec: PassportPhotoSpec, dpi = 300): { width: number; height: number } {
  if (spec.unit === 'px') return { width: spec.width, height: spec.height };
  const inches = spec.unit === 'mm' ? { w: spec.width / 25.4, h: spec.height / 25.4 } : { w: spec.width, h: spec.height };
  return { width: Math.round(inches.w * dpi), height: Math.round(inches.h * dpi) };
}
