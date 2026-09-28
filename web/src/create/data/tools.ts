import type { ToolItem } from '../types/createTypes';

const tools: ToolItem[] = [
  {
    icon: 'i-scan',
    title: 'Scan Document',
    desc: 'Scan documents, receipts, forms, IDs and papers.',
    label: 'Open Scan Document tool',
  },
  {
    icon: 'i-id',
    title: 'Passport & ID Photo',
    desc: 'Create correctly sized passport, visa and ID photos.',
    label: 'Open Passport and ID Photo tool',
  },
  {
    icon: 'i-bg',
    title: 'Remove Background',
    desc: 'Remove your photo background and replace it with another color.',
    label: 'Open Remove Background tool',
  },
  {
    icon: 'i-hand',
    title: 'Handwriting to Text',
    desc: 'Turn handwritten documents into editable text.',
    label: 'Open Handwriting to Text tool',
  },
  {
    icon: 'i-pdf',
    title: 'PDF Scanner',
    desc: 'Create, organize and export professional PDFs.',
    label: 'Open PDF Scanner tool',
  },
];

export default tools;
