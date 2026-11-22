import { Section, SitePage } from '../content/content.types';
import { IdFactory, page, section } from './template-builder';

/** Shared building blocks reused by several official templates. */

export function heading(
  ids: IdFactory,
  eyebrow: string,
  title: string,
  body = '',
  style: Record<string, any> = {},
): Section {
  return section(
    ids,
    'text-block',
    { eyebrow, title, body, headingStyle: 'lines', buttons: [] },
    { paddingTop: 64, paddingBottom: 24, align: 'center', ...style },
  );
}

export function contactSection(
  ids: IdFactory,
  title: string,
  text: string,
  style: Record<string, any> = {},
): Section {
  return section(
    ids,
    'contact-form',
    {
      eyebrow: 'Get in touch',
      title,
      text,
      showInfo: true,
      showHours: true,
      submitLabel: 'Send Message',
      formType: 'contact',
      fields: ['name', 'email', 'phone', 'message'],
    },
    { paddingTop: 72, paddingBottom: 72, ...style },
  );
}

export function mapSection(ids: IdFactory): Section {
  return section(ids, 'map', { address: '', height: 360 }, { paddingTop: 0, paddingBottom: 0, fullWidth: true });
}

export function cartPage(ids: IdFactory, order: number, style: Record<string, any> = {}): SitePage {
  return page(
    ids,
    {
      title: 'Cart',
      slug: 'cart',
      showInNav: false,
      sections: [
        section(ids, 'cart', { title: 'Your Cart', emptyText: 'Your cart is empty.', continueLabel: 'Continue Shopping', continueHref: 'page:home' }, { paddingTop: 56, paddingBottom: 72, ...style }),
      ],
    },
    order,
  );
}

export function accountPage(ids: IdFactory, order: number, style: Record<string, any> = {}): SitePage {
  return page(
    ids,
    {
      title: 'My Account',
      slug: 'account',
      showInNav: false,
      sections: [
        section(ids, 'account', { title: 'My Account', text: 'Sign in with your Fockis account to view your orders, bookings and order tracking.' }, { paddingTop: 56, paddingBottom: 72, ...style }),
      ],
    },
    order,
  );
}

export function galleryPage(
  ids: IdFactory,
  order: number,
  images: string[],
  title = 'Gallery',
  style: Record<string, any> = {},
  showInNav = true,
): SitePage {
  return page(
    ids,
    {
      title,
      slug: 'gallery',
      showInNav,
      sections: [
        heading(ids, 'Our work', title, 'A look at what we create every day.', style),
        section(
          ids,
          'gallery',
          { images: images.map((src, i) => ({ src, alt: `${title} image ${i + 1}` })), lightbox: true },
          { paddingTop: 16, paddingBottom: 80, columns: 4, responsive: { tablet: { columns: 3 }, mobile: { columns: 2 } }, ...style },
        ),
      ],
    },
    order,
  );
}
