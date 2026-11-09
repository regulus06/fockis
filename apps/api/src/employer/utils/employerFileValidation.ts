const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
export function validateEmployerUpload(file: File, maxBytes = 10 * 1024 * 1024): void {
  if (!ALLOWED_MIME_TYPES.has(file.type)) throw new Error('Only PDF, JPEG, and PNG files are allowed.');
  if (file.size <= 0 || file.size > maxBytes) throw new Error('File is empty or exceeds the upload size limit.');
}
// MIME checks in browsers are advisory. Enforce file signatures, malware scanning and access controls server-side.
