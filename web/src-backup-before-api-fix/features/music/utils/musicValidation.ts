export function validateUploadForm(input: {
  title: string;
  accessType: string;
  priceCents?: number;
}): string[] {
  const errors: string[] = [];
  if (!input.title.trim()) errors.push('Title is required.');
  if (input.title.length > 200) errors.push('Title must be under 200 characters.');
  if (input.accessType !== 'free' && (!input.priceCents || input.priceCents <= 0)) {
    errors.push('Paid content requires a price greater than $0.');
  }
  return errors;
}
