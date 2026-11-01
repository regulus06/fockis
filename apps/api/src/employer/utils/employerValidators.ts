export function isValidHttpUrl(value: string): boolean {
  try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:'; }
  catch { return false; }
}
export function requiredText(value: string, label: string): string {
  const result = value.trim();
  if (!result) throw new Error(`${label} is required.`);
  return result;
}
