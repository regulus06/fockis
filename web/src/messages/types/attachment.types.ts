export type AttachmentKind = 'image' | 'video' | 'audio' | 'document';

export interface Attachment {
  id: string;
  kind: AttachmentKind;
  url: string;
  name: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
  waveform?: number[];
  thumbnailUrl?: string;
  caption?: string;
}

export type UploadStage = 'idle' | 'uploading' | 'done' | 'error';

export interface UploadState {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  stage: UploadStage;
  kind: AttachmentKind;
  error?: string;
}
