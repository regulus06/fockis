export type DesignCategory =
  | 'logo'
  | 'flyer'
  | 'banner'
  | 'badge'
  | 'business-card'
  | 'poster'
  | 'invitation'
  | 'certificate'
  | 'social'
  | 'menu';

export type DesignElementType = 'text' | 'shape' | 'image' | 'icon' | 'line';

export interface DesignElement {
  id: string;
  type: DesignElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  zIndex?: number;
  locked?: boolean;
  visible?: boolean;
  content?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
  imageUrl?: string;
  iconName?: string;
  metadata?: Record<string, unknown>;
}

export interface DesignCanvas {
  width: number;
  height: number;
  background: string;
  backgroundImage?: string;
}

export interface DesignDocument {
  canvas: DesignCanvas;
  elements: DesignElement[];
  version: number;
}
