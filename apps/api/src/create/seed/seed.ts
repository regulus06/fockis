/**
 * Idempotent seed script for Fockis Create.
 *
 * Run with:
 *   npm run seed:create
 *
 * Upserts categories by slug and templates by slug, so it is safe to
 * re-run at any time without duplicating data.
 *
 * Existing templates are intentionally left untouched so admin edits
 * are not overwritten by a later seed.
 */

import 'reflect-metadata';

import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';

import { CategorySchema } from '../schemas/create-category.schema';
import { TemplateSchema } from '../schemas/create-template.schema';
import { TemplateVersionSchema } from '../schemas/create-template-version.schema';

import {
  CreateToolType,
  FieldType,
  ElementType,
} from '../interfaces/editor.interfaces';

import { slugify } from '../utils/slugify.util';

dotenv.config();

// ---------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------

const CategoryModel = mongoose.model(
  'Category',
  CategorySchema,
  'create_categories',
);

const TemplateModel = mongoose.model(
  'Template',
  TemplateSchema,
  'create_templates',
);

const TemplateVersionModel = mongoose.model(
  'TemplateVersion',
  TemplateVersionSchema,
  'create_template_versions',
);

// ---------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------

const CATEGORIES: {
  name: string;
  icon: string;
  sortOrder: number;
}[] = [
  { name: 'Business', icon: 'briefcase', sortOrder: 1 },
  { name: 'Marketing', icon: 'megaphone', sortOrder: 2 },
  { name: 'Events', icon: 'calendar', sortOrder: 3 },
  { name: 'Social Media', icon: 'share', sortOrder: 4 },
  { name: 'Restaurants', icon: 'utensils', sortOrder: 5 },
  { name: 'Real Estate', icon: 'home', sortOrder: 6 },
  { name: 'Beauty', icon: 'sparkles', sortOrder: 7 },
  { name: 'Education', icon: 'graduation-cap', sortOrder: 8 },
  { name: 'Sports', icon: 'trophy', sortOrder: 9 },
  { name: 'Technology', icon: 'cpu', sortOrder: 10 },

  { name: 'Finance', icon: 'bank', sortOrder: 11 },
  { name: 'Healthcare', icon: 'heart-pulse', sortOrder: 12 },
  { name: 'Legal', icon: 'scale', sortOrder: 13 },
  { name: 'Personal', icon: 'user', sortOrder: 14 },
  { name: 'Travel', icon: 'plane', sortOrder: 15 },
  { name: 'Nonprofit', icon: 'hand-heart', sortOrder: 16 },
  { name: 'Church', icon: 'church', sortOrder: 17 },
  { name: 'Government', icon: 'landmark', sortOrder: 18 },
  { name: 'Wedding', icon: 'rings', sortOrder: 19 },
  { name: 'Photography', icon: 'camera', sortOrder: 20 },
  { name: 'Construction', icon: 'hard-hat', sortOrder: 21 },
  { name: 'Automotive', icon: 'car', sortOrder: 22 },
  { name: 'Fitness', icon: 'dumbbell', sortOrder: 23 },
];

// ---------------------------------------------------------------------
// Canvas presets
// ---------------------------------------------------------------------

const CANVAS_PRESETS: Record<CreateToolType, any> = {
  [CreateToolType.LOGO]: {
    width: 800,
    height: 800,
    unit: 'px',
    orientation: 'portrait',
    background: '#FFFFFF',
  },

  [CreateToolType.FLYER]: {
    width: 1275,
    height: 1650,
    unit: 'px',
    orientation: 'portrait',
    background: '#FFFFFF',
  },

  [CreateToolType.BANNER]: {
    width: 1920,
    height: 640,
    unit: 'px',
    orientation: 'landscape',
    background: '#FFFFFF',
  },

  [CreateToolType.BADGE]: {
    width: 600,
    height: 900,
    unit: 'px',
    orientation: 'portrait',
    background: '#FFFFFF',
  },

  [CreateToolType.BUSINESS_CARD]: {
    width: 1050,
    height: 600,
    unit: 'px',
    orientation: 'landscape',
    background: '#FFFFFF',
  },

  [CreateToolType.POSTER]: {
    width: 1650,
    height: 2550,
    unit: 'px',
    orientation: 'portrait',
    background: '#FFFFFF',
  },

  [CreateToolType.INVITATION]: {
    width: 1240,
    height: 1748,
    unit: 'px',
    orientation: 'portrait',
    background: '#FFFFFF',
  },

  [CreateToolType.CERTIFICATE]: {
    width: 2200,
    height: 1700,
    unit: 'px',
    orientation: 'landscape',
    background: '#FFFFFF',
  },

  [CreateToolType.SOCIAL_MEDIA_POST]: {
    width: 1080,
    height: 1080,
    unit: 'px',
    orientation: 'portrait',
    background: '#FFFFFF',
  },

  [CreateToolType.MENU]: {
    width: 1275,
    height: 1650,
    unit: 'px',
    orientation: 'portrait',
    background: '#FFFFFF',
  },

  [CreateToolType.LETTERHEAD]: {
    width: 1275,
    height: 1650,
    unit: 'px',
    orientation: 'portrait',
    background: '#FFFFFF',
  },

  [CreateToolType.BROCHURE]: {
    width: 2550,
    height: 1650,
    unit: 'px',
    orientation: 'landscape',
    background: '#FFFFFF',
  },

  [CreateToolType.RESUME]: {
    width: 1275,
    height: 1650,
    unit: 'px',
    orientation: 'portrait',
    background: '#FFFFFF',
  },

  [CreateToolType.REPORT]: {
    width: 1275,
    height: 1650,
    unit: 'px',
    orientation: 'portrait',
    background: '#FFFFFF',
  },

  [CreateToolType.OTHER]: {
    width: 1275,
    height: 1650,
    unit: 'px',
    orientation: 'portrait',
    background: '#FFFFFF',
  },
};

// ---------------------------------------------------------------------
// Field helpers
// ---------------------------------------------------------------------

function field(
  key: string,
  label: string,
  type: FieldType,
  extra: Record<string, any> = {},
) {
  return {
    id: `fld_${key}`,
    key,
    label,
    type,
    required: false,
    editable: true,

    defaultValue:
      extra.defaultValue ??
      (type === FieldType.REPEATER || type === FieldType.ARRAY
        ? []
        : ''),

    ...extra,
  };
}

// ---------------------------------------------------------------------
// Field presets
// ---------------------------------------------------------------------

const FIELD_PRESETS: Partial<Record<CreateToolType, any[]>> = {
  [CreateToolType.BUSINESS_CARD]: [
    field('fullName', 'Full Name', FieldType.TEXT, {
      defaultValue: 'John Doe',
    }),

    field('jobTitle', 'Job Title', FieldType.TEXT, {
      defaultValue: 'Founder & CEO',
    }),

    field('company', 'Company', FieldType.TEXT, {
      defaultValue: 'Your Company',
    }),

    field('phone', 'Phone', FieldType.PHONE, {
      defaultValue: '(555) 555-5555',
    }),

    field('email', 'Email', FieldType.EMAIL, {
      defaultValue: 'you@company.com',
    }),

    field('website', 'Website', FieldType.URL, {
      defaultValue: 'www.company.com',
    }),
  ],

  [CreateToolType.LETTERHEAD]: [
    field('companyName', 'Company Name', FieldType.TEXT, {
      defaultValue: 'Your Company',
    }),

    field('address', 'Address', FieldType.TEXTAREA, {
      defaultValue: '123 Main St, City, ST 00000',
    }),

    field('phone', 'Phone', FieldType.PHONE, {
      defaultValue: '(555) 555-5555',
    }),

    field('email', 'Email', FieldType.EMAIL, {
      defaultValue: 'contact@company.com',
    }),
  ],

  [CreateToolType.REPORT]: [
    field('title', 'Title', FieldType.TEXT, {
      defaultValue: 'Business Report',
    }),

    field('subtitle', 'Subtitle', FieldType.TEXT, {
      defaultValue: '',
    }),

    field('author', 'Author', FieldType.TEXT, {
      defaultValue: '',
    }),

    field('date', 'Date', FieldType.DATE),

    field('summary', 'Summary', FieldType.RICHTEXT, {
      multiline: true,
    }),
  ],

  [CreateToolType.FLYER]: [
    field('headline', 'Headline', FieldType.TEXT, {
      defaultValue: 'Big Announcement',
    }),

    field('subheadline', 'Subheadline', FieldType.TEXT, {
      defaultValue: '',
    }),

    field('body', 'Body', FieldType.RICHTEXT, {
      multiline: true,
    }),

    field('date', 'Date', FieldType.DATE),

    field('location', 'Location', FieldType.TEXT),

    field('cta', 'Call To Action', FieldType.TEXT, {
      defaultValue: 'Learn More',
    }),
  ],

  [CreateToolType.BANNER]: [
    field('headline', 'Headline', FieldType.TEXT, {
      defaultValue: 'Your Headline Here',
    }),

    field('subtext', 'Subtext', FieldType.TEXT),

    field('cta', 'Call To Action', FieldType.TEXT, {
      defaultValue: 'Shop Now',
    }),
  ],

  [CreateToolType.INVITATION]: [
    field('eventName', 'Event Name', FieldType.TEXT, {
      defaultValue: "You're Invited",
    }),

    field('hostName', 'Host', FieldType.TEXT),

    field('date', 'Date', FieldType.DATE),

    field('time', 'Time', FieldType.TEXT),

    field('location', 'Location', FieldType.TEXT),

    field('rsvp', 'RSVP Info', FieldType.TEXT),
  ],

  [CreateToolType.POSTER]: [
    field('headline', 'Headline', FieldType.TEXT, {
      defaultValue: 'Headline',
    }),

    field('subheadline', 'Subheadline', FieldType.TEXT),

    field('date', 'Date', FieldType.DATE),

    field('location', 'Location', FieldType.TEXT),
  ],

  [CreateToolType.SOCIAL_MEDIA_POST]: [
    field('caption', 'Caption', FieldType.RICHTEXT, {
      multiline: true,
    }),

    field('hashtags', 'Hashtags', FieldType.TEXT),

    field('cta', 'Call To Action', FieldType.TEXT),
  ],

  [CreateToolType.MENU]: [
    field('restaurantName', 'Restaurant Name', FieldType.TEXT, {
      defaultValue: 'Restaurant Name',
    }),

    field('sections', 'Menu Sections', FieldType.REPEATER, {
      itemSchema: {
        sectionName: 'text',
        itemName: 'text',
        description: 'textarea',
        price: 'text',
      },
    }),
  ],

  [CreateToolType.BADGE]: [
    field('attendeeName', 'Attendee Name', FieldType.TEXT, {
      defaultValue: 'Attendee Name',
    }),

    field('title', 'Title / Role', FieldType.TEXT),

    field('company', 'Company', FieldType.TEXT),

    field('eventName', 'Event Name', FieldType.TEXT),
  ],

  [CreateToolType.CERTIFICATE]: [
    field('recipientName', 'Recipient Name', FieldType.TEXT, {
      defaultValue: 'Recipient Name',
    }),

    field('courseName', 'Course / Achievement', FieldType.TEXT, {
      defaultValue: 'Course Title',
    }),

    field('issueDate', 'Issue Date', FieldType.DATE),

    field('signatoryName', 'Signatory', FieldType.TEXT),
  ],

  [CreateToolType.LOGO]: [
    field('brandName', 'Brand Name', FieldType.TEXT, {
      defaultValue: 'Brand',
    }),

    field('tagline', 'Tagline', FieldType.TEXT),
  ],

  [CreateToolType.RESUME]: [
    field('fullName', 'Full Name', FieldType.TEXT, {
      defaultValue: 'Full Name',
    }),

    field('jobTitle', 'Job Title', FieldType.TEXT),

    field('email', 'Email', FieldType.EMAIL),

    field('phone', 'Phone', FieldType.PHONE),

    field('summary', 'Summary', FieldType.RICHTEXT, {
      multiline: true,
    }),

    field('experience', 'Experience', FieldType.REPEATER, {
      itemSchema: {
        company: 'text',
        title: 'text',
        startDate: 'date',
        endDate: 'date',
        description: 'richtext',
      },
    }),

    field('education', 'Education', FieldType.REPEATER, {
      itemSchema: {
        school: 'text',
        degree: 'text',
        field: 'text',
        startDate: 'date',
        endDate: 'date',
      },
    }),

    field('skills', 'Skills', FieldType.ARRAY),
  ],

  [CreateToolType.BROCHURE]: [
    field('title', 'Title', FieldType.TEXT, {
      defaultValue: 'Brochure Title',
    }),

    field('body', 'Body', FieldType.RICHTEXT, {
      multiline: true,
    }),
  ],
};

// ---------------------------------------------------------------------
// Element typing
// ---------------------------------------------------------------------

interface SeedElement {
  id: string;
  type: ElementType;
  fieldKey?: string;
  content?: any;

  position: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
  };

  style: {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    color: string;
  };
}

// ---------------------------------------------------------------------
// Element builder
// ---------------------------------------------------------------------

function buildElementsFromFields(
  fields: any[],
  canvas: any,
): SeedElement[] {
  const rowHeight = Math.max(
    40,
    Math.floor(canvas.height / (fields.length + 2)),
  );

  return fields
    .filter(
      (f) =>
        !['repeater', 'array', 'object'].includes(String(f.type)),
    )
    .map(
      (f, i): SeedElement => ({
        id: `el_${String(f.key)}`,

        // IMPORTANT:
        // Explicitly typed as ElementType instead of allowing
        // TypeScript to infer this as a generic string.
        type: 'text' as ElementType,

        fieldKey: String(f.key),

        content: f.defaultValue,

        position: {
          x: Math.round(canvas.width * 0.08),
          y: rowHeight * (i + 1),
          width: Math.round(canvas.width * 0.84),
          height: rowHeight - 8,
        },

        style: {
          fontFamily: 'Inter',
          fontSize: i === 0 ? 28 : 16,
          fontWeight: i === 0 ? 700 : 400,
          color: '#1a1a1a',
        },
      }),
    );
}

// ---------------------------------------------------------------------
// Template specifications
// ---------------------------------------------------------------------

interface SeedTemplateSpec {
  name: string;
  category: string;
  type: CreateToolType;
  isFeatured?: boolean;
  isPremium?: boolean;
}

const TEMPLATES: SeedTemplateSpec[] = [
  // Business
  {
    name: 'Luxury Business',
    category: 'Business',
    type: CreateToolType.FLYER,
    isFeatured: true,
  },

  {
    name: 'Modern Brand',
    category: 'Business',
    type: CreateToolType.LOGO,
  },

  {
    name: 'Professional Business Card',
    category: 'Business',
    type: CreateToolType.BUSINESS_CARD,
    isFeatured: true,
  },

  {
    name: 'Letterhead',
    category: 'Business',
    type: CreateToolType.LETTERHEAD,
  },

  {
    name: 'Business Proposal',
    category: 'Business',
    type: CreateToolType.REPORT,
  },

  {
    name: 'Business Report',
    category: 'Business',
    type: CreateToolType.REPORT,
  },

  // Marketing
  {
    name: 'Grand Opening',
    category: 'Marketing',
    type: CreateToolType.FLYER,
    isFeatured: true,
  },

  {
    name: 'Bold Sale',
    category: 'Marketing',
    type: CreateToolType.FLYER,
    isFeatured: true,
  },

  {
    name: 'Product Launch',
    category: 'Marketing',
    type: CreateToolType.SOCIAL_MEDIA_POST,
    isFeatured: true,
  },

  {
    name: 'Promotional Flyer',
    category: 'Marketing',
    type: CreateToolType.FLYER,
  },

  {
    name: 'Marketing Banner',
    category: 'Marketing',
    type: CreateToolType.BANNER,
  },

  // Events
  {
    name: 'Elegant Event',
    category: 'Events',
    type: CreateToolType.INVITATION,
    isFeatured: true,
  },

  {
    name: 'Festival Poster',
    category: 'Events',
    type: CreateToolType.POSTER,
    isFeatured: true,
  },

  {
    name: 'Event Invitation',
    category: 'Events',
    type: CreateToolType.INVITATION,
  },

  {
    name: 'Event Flyer',
    category: 'Events',
    type: CreateToolType.FLYER,
  },

  // Social Media
  {
    name: 'Quote Card',
    category: 'Social Media',
    type: CreateToolType.SOCIAL_MEDIA_POST,
    isFeatured: true,
  },

  {
    name: 'Social Announcement',
    category: 'Social Media',
    type: CreateToolType.SOCIAL_MEDIA_POST,
  },

  {
    name: 'Social Promotion',
    category: 'Social Media',
    type: CreateToolType.SOCIAL_MEDIA_POST,
  },

  // Restaurants
  {
    name: 'Fresh Menu',
    category: 'Restaurants',
    type: CreateToolType.MENU,
    isFeatured: true,
  },

  {
    name: 'Cafe Signage',
    category: 'Restaurants',
    type: CreateToolType.POSTER,
  },

  {
    name: 'Restaurant Promotion',
    category: 'Restaurants',
    type: CreateToolType.FLYER,
  },

  // Real Estate
  {
    name: 'Open House',
    category: 'Real Estate',
    type: CreateToolType.FLYER,
    isFeatured: true,
  },

  {
    name: 'Listing Sheet',
    category: 'Real Estate',
    type: CreateToolType.FLYER,
  },

  {
    name: 'Property Flyer',
    category: 'Real Estate',
    type: CreateToolType.FLYER,
  },

  // Beauty
  {
    name: 'Spa Promo',
    category: 'Beauty',
    type: CreateToolType.FLYER,
    isFeatured: true,
  },

  {
    name: 'Gift Card',
    category: 'Beauty',
    type: CreateToolType.BADGE,
  },

  {
    name: 'Beauty Promotion',
    category: 'Beauty',
    type: CreateToolType.FLYER,
  },

  // Education
  {
    name: 'Certificate of Completion',
    category: 'Education',
    type: CreateToolType.CERTIFICATE,
    isFeatured: true,
  },

  {
    name: 'Campus Event',
    category: 'Education',
    type: CreateToolType.FLYER,
  },

  {
    name: 'Academic Certificate',
    category: 'Education',
    type: CreateToolType.CERTIFICATE,
  },

  {
    name: 'Student Achievement',
    category: 'Education',
    type: CreateToolType.CERTIFICATE,
  },

  // Sports
  {
    name: 'Team Roster',
    category: 'Sports',
    type: CreateToolType.REPORT,
  },

  {
    name: 'Tournament Bracket',
    category: 'Sports',
    type: CreateToolType.POSTER,
    isFeatured: true,
  },

  {
    name: 'Game Announcement',
    category: 'Sports',
    type: CreateToolType.FLYER,
  },

  {
    name: 'Sports Poster',
    category: 'Sports',
    type: CreateToolType.POSTER,
  },

  // Technology
  {
    name: 'App Launch',
    category: 'Technology',
    type: CreateToolType.SOCIAL_MEDIA_POST,
    isFeatured: true,
  },

  {
    name: 'Conference Badge',
    category: 'Technology',
    type: CreateToolType.BADGE,
    isFeatured: true,
  },

  {
    name: 'Technology Event',
    category: 'Technology',
    type: CreateToolType.FLYER,
  },

  {
    name: 'Product Announcement',
    category: 'Technology',
    type: CreateToolType.SOCIAL_MEDIA_POST,
  },
];

// ---------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------

async function run(): Promise<void> {
  const uri =
    process.env.MONGODB_URI ||
    'mongodb://localhost:27017/fockis';

  console.log(`Connecting to ${uri} ...`);

  await mongoose.connect(uri);

  // ---------------------------------------------------------------
  // Categories
  // ---------------------------------------------------------------

  const categoryIdByName = new Map<
    string,
    mongoose.Types.ObjectId
  >();

  for (const cat of CATEGORIES) {
    const slug = slugify(cat.name);

    const doc = await CategoryModel.findOneAndUpdate(
      { slug },

      {
        $set: {
          name: cat.name,
          icon: cat.icon,
          sortOrder: cat.sortOrder,
          isActive: true,
        },

        $setOnInsert: {
          slug,
        },
      },

      {
        upsert: true,
        new: true,
      },
    );

    if (!doc) {
      throw new Error(
        `Failed to create or retrieve category: ${cat.name}`,
      );
    }

    categoryIdByName.set(
      cat.name,
      doc._id as mongoose.Types.ObjectId,
    );

    console.log(`Category ready: ${cat.name}`);
  }

  // ---------------------------------------------------------------
  // Templates
  // ---------------------------------------------------------------

  let created = 0;
  let skipped = 0;

  for (const spec of TEMPLATES) {
    const slug = slugify(spec.name);

    const existing = await TemplateModel.findOne({ slug });

    if (existing) {
      skipped++;

      console.log(
        `Template exists, skipping structural seed: ${spec.name}`,
      );

      continue;
    }

    const canvas = CANVAS_PRESETS[spec.type];

    const fields =
      FIELD_PRESETS[spec.type] || [];

    const elements: SeedElement[] =
      buildElementsFromFields(fields, canvas);

    const categoryId =
      categoryIdByName.get(spec.category);

    if (!categoryId) {
      console.warn(
        `Skipping "${spec.name}" — unknown category "${spec.category}"`,
      );

      continue;
    }

    // -------------------------------------------------------------
    // Create template
    // -------------------------------------------------------------

    const template = await TemplateModel.create({
      name: spec.name,

      slug,

      description:
        `${spec.name} — a professional ${String(
          spec.type,
        ).replace('-', ' ')} template.`,

      categoryId,

      type: spec.type,

      isActive: true,

      isFeatured: !!spec.isFeatured,

      isPremium: !!spec.isPremium,

      isPublic: true,

      version: 1,

      canvas,

      fields,

      elements,
      
      tags: [
        spec.category.toLowerCase(),
        spec.type,
      ],
    });

    // -------------------------------------------------------------
    // Create initial version
    // -------------------------------------------------------------

    await TemplateVersionModel.create({
      templateId: template._id,

      version: 1,

      canvas,

      fields,

      elements,

      changeNote: 'Seed: initial version',
    });

    created++;

    console.log(
      `Created template: ${spec.name} (${spec.type})`,
    );
  }

  // ---------------------------------------------------------------
  // Done
  // ---------------------------------------------------------------

  console.log(
    `\nSeed complete. Categories: ${CATEGORIES.length}. ` +
      `Templates created: ${created}, ` +
      `skipped (already existed): ${skipped}.`,
  );

  await mongoose.disconnect();
}

// ---------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------

run().catch(async (err: unknown) => {
  console.error('Seed failed:', err);

  try {
    await mongoose.disconnect();
  } catch {
    // Ignore disconnect errors after a failed seed.
  }

  process.exit(1);
});