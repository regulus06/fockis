import { useRef, useState, type ReactNode } from 'react';
import { employerApi } from '../../services/employerApi';
import { validateEmployerUpload } from '../../utils/employerFileValidation';
import { getErrorMessage } from '../../hooks/useEmployerQuery';

export interface ImageUploadProps {
  onUploaded: (url: string, file: File) => void;
  onError: (message: string) => void;
  className?: string;
  children: (state: { uploading: boolean }) => ReactNode;
  label: string;
  disabled?: boolean;
}

/** Button that uploads one image through the existing POST /uploads endpoint. */
export function ImageUpload({ onUploaded, onError, className, children, label, disabled }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const pick = async (file?: File) => {
    if (!file) return;
    try {
      validateEmployerUpload(file);
      setUploading(true);
      const url = await employerApi.uploadImage(file);
      onUploaded(url, file);
    } catch (err) {
      onError(getErrorMessage(err, 'Upload failed.'));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => inputRef.current?.click()}
        disabled={uploading || disabled}
        aria-label={label}
      >
        {children({ uploading })}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={(event) => void pick(event.target.files?.[0])}
      />
    </>
  );
}

export default ImageUpload;
