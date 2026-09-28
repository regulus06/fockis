/**
 * Shared structural types for the Fockis Document Engine.
 * Used by both Templates (master designs) and Documents (user copies),
 * and stored as flexible (Mixed) sub-documents in Mongo so that new field/
 * element types can be added without a schema migration.
 */

export enum FieldType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  RICHTEXT = 'richtext',
  EMAIL = 'email',
  PHONE = 'phone',
  URL = 'url',
  DATE = 'date',
  NUMBER = 'number',
  IMAGE = 'image',
  COLOR = 'color',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
  CHECKBOX = 'checkbox',
  ARRAY = 'array',
  OBJECT = 'object',
  REPEATER = 'repeater',
}

export enum ElementType {
  TEXT = 'text',
  RICH_TEXT = 'rich_text',
  IMAGE = 'image',
  SHAPE = 'shape',
  LINE = 'line',
  ICON = 'icon',
  TABLE = 'table',
  GROUP = 'group',
  SECTION = 'section',
  HEADER = 'header',
  FOOTER = 'footer',
  PAGE_BREAK = 'page_break',
}

export enum CreateToolType {
  LOGO = 'logo',
  FLYER = 'flyer',
  BANNER = 'banner',
  BADGE = 'badge',
  BUSINESS_CARD = 'business-card',
  POSTER = 'poster',
  INVITATION = 'invitation',
  CERTIFICATE = 'certificate',
  SOCIAL_MEDIA_POST = 'social-media-post',
  MENU = 'menu',
  LETTERHEAD = 'letterhead',
  BROCHURE = 'brochure',
  RESUME = 'resume',
  REPORT = 'report',
  OTHER = 'other',
}

export interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export interface TextStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | string;
  lineHeight?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  color?: string;
  backgroundColor?: string;
  opacity?: number;
  zIndex?: number;
  border?: string;
  spacing?: number;
}

export interface TemplateField {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  defaultValue?: any;
  required?: boolean;
  editable?: boolean;
  multiline?: boolean;
  maxLength?: number;
  options?: { label: string; value: string }[]; // for select / multiselect
  itemSchema?: Record<string, FieldType | TemplateField>; // for repeater / array / object
  position?: Position;
  style?: TextStyle;
}

export interface TemplateElement {
  id: string;
  type: ElementType;
  fieldKey?: string;
  content?: any;
  position: Position;
  style?: TextStyle & Record<string, any>;
  children?: TemplateElement[]; // for group / section
}

export interface CanvasConfig {
  width: number;
  height: number;
  unit: 'px' | 'mm' | 'in';
  orientation: 'portrait' | 'landscape';
  background?: string;
  pages?: number;
}

export interface DocumentContent {
  fields: Record<string, any>;
  elements: TemplateElement[];
}
