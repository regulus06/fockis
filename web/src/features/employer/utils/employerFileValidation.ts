export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Client-side check before calling the existing /uploads endpoint,
 * which accepts images (not PDF). The server validates again.
 */
export function validateEmployerUpload(file: File, maxBytes = 10 * 1024 * 1024): void {
  if (!IMAGE_MIME_TYPES.includes(file.type)) {
    throw new Error('Please choose a JPG, PNG, WEBP or GIF image.');
  }
  if (file.size <= 0 || file.size > maxBytes) {
    throw new Error(`File is empty or larger than ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }
}
