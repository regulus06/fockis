export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function requiredText(value: string, label: string): string {
  const result = value.trim();
  if (!result) throw new Error(`${label} is required.`);
  return result;
}

/** Collects field errors: { field: message }. Empty object means valid. */
export type FieldErrors<T extends string = string> = Partial<Record<T, string>>;

export const hasErrors = (errors: FieldErrors) => Object.values(errors).some(Boolean);
