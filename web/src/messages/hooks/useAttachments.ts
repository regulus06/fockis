import { useCallback, useState } from 'react';
import type { UploadState } from '../types';
import { classifyAndValidateFile } from '../utils/fileValidation';
import { createTrackedObjectUrl, revokeTrackedObjectUrl } from '../utils/fileHelpers';
import { generateLocalId } from '../utils/messageHelpers';
import { messageUploadApi } from '../services/messageUploadApi';

export function useAttachments() {
  const [pending, setPending] = useState<UploadState[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    setError(null);
    const uploads: UploadState[] = [];
    Array.from(files).forEach((file) => {
      const result = classifyAndValidateFile(file);
      if (!result.valid || !result.kind) {
        setError(result.error ?? 'Unsupported file');
        return;
      }
      uploads.push({
        id: generateLocalId('upload'),
        file,
        previewUrl: createTrackedObjectUrl(file),
        progress: 0,
        stage: 'idle',
        kind: result.kind,
      });
    });
    if (uploads.length) setPending((prev) => [...prev, ...uploads]);
    return uploads;
  }, []);

  const removeFile = useCallback((id: string) => {
    setPending((prev) => {
      const target = prev.find((u) => u.id === id);
      if (target) revokeTrackedObjectUrl(target.previewUrl);
      return prev.filter((u) => u.id !== id);
    });
  }, []);

  const clear = useCallback(() => {
    setPending((prev) => {
      prev.forEach((u) => revokeTrackedObjectUrl(u.previewUrl));
      return [];
    });
  }, []);

  const uploadAll = useCallback(async () => {
    const results = [];
    for (const item of pending) {
      setPending((prev) => prev.map((u) => (u.id === item.id ? { ...u, stage: 'uploading' } : u)));
      // eslint-disable-next-line no-await-in-loop
      const attachment = await messageUploadApi.upload(item.file, item.kind, {
        onProgress: (progress) =>
          setPending((prev) => prev.map((u) => (u.id === item.id ? { ...u, progress } : u))),
      });
      setPending((prev) => prev.map((u) => (u.id === item.id ? { ...u, stage: 'done', progress: 100 } : u)));
      results.push(attachment);
    }
    return results;
  }, [pending]);

  return { pending, error, addFiles, removeFile, clear, uploadAll, setError };
}
