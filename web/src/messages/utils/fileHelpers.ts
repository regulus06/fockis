export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

export function getFileExtension(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE';
}

const objectUrls = new Set<string>();

export function createTrackedObjectUrl(file: File | Blob): string {
  const url = URL.createObjectURL(file);
  objectUrls.add(url);
  return url;
}

export function revokeTrackedObjectUrl(url: string): void {
  if (objectUrls.has(url)) {
    URL.revokeObjectURL(url);
    objectUrls.delete(url);
  }
}

export function revokeAllTrackedObjectUrls(): void {
  objectUrls.forEach((url) => URL.revokeObjectURL(url));
  objectUrls.clear();
}

export function documentColor(extension: string): string {
  const map: Record<string, string> = {
    PDF: '#e5484d',
    DOC: '#2f6fed',
    DOCX: '#2f6fed',
    XLS: '#1c8a5f',
    XLSX: '#1c8a5f',
    PPT: '#d9730d',
    PPTX: '#d9730d',
    TXT: '#6b7280',
    CSV: '#1c8a5f',
  };
  return map[extension] ?? '#6b7280';
}
