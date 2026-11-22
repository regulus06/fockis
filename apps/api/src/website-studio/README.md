# Fockis Website Studio

Universal website builder: one content model, one renderer, one editor for every template and industry.

## Where things live

| Area | Path |
|---|---|
| Backend module | `apps/api/src/website-studio/` (registered in `app.module.ts`) |
| Content model (shared) | `content/content.types.ts` — mirrored in `web/src/features/website-studio/types/content.ts` |
| Official templates (5 + universal + blank) | `seed/official-templates.ts` |
| Alternative designs (30) | `seed/alternative-templates.ts` |
| Categories (60+) | `seed/categories.seed.ts` |
| Frontend feature | `web/src/features/website-studio/` |
| Template images (cut from the reference designs) | `web/public/website-studio/<template>/` |

Seeding runs automatically on API start (`TemplatesService.onModuleInit`). It only inserts missing categories/templates and never overwrites anything an administrator edited.

## Routes

Frontend: `/website-studio` (home), `/website-studio/templates`, `/website-studio/ai`, `/website-studio/my-websites`,
`/website-studio/editor/:id`, `/website-studio/websites/:id/settings`, `/website-studio/admin`, published sites at `/s/:slug`.

API: `/website-studio/*` (catalog, websites, admin) and `/website-studio/public/*` (published sites, forms, checkout).

## Payments

Website orders are paid with the existing **UniversalPaymentService** (Stripe) using the new purpose
`website_order`. The server re-prices every cart from the published catalog; customers sign in with
their Fockis account to pay. Orders are marked paid after the backend verifies the PaymentIntent
(`/website-studio/public/orders/:id/confirm`) and also from the Stripe webhook via the
`payments.succeeded` event emitted by `payment.service.ts`.

Note: money is collected into the Fockis Stripe account. Paying out website owners should be connected
to the existing payouts/wallet module (not done here).

## Environment variables (all optional)

API:
- `WEBSITE_STUDIO_PUBLIC_BASE_URL` — web app URL used for `/s/<slug>` links (default `https://fockis.com`)
- `WEBSITE_STUDIO_ROOT_DOMAIN` — root for subdomains (default `fockis.com`)
- `WEBSITE_STUDIO_SUBDOMAINS_ENABLED=true` — once wildcard DNS `*.fockis.com` points to the web app
- `WEBSITE_STUDIO_CNAME_TARGET` — where customers point custom domains (default `sites.fockis.com`)
- `WEBSITE_STUDIO_ENFORCE_PREMIUM=true` — block premium templates for non-premium users
- `WEBSITE_STUDIO_MAX_WEBSITES_PER_USER` (default 50), `WEBSITE_STUDIO_RESERVATIONS_PER_SLOT` (default 6)
- `OPENAI_API_KEY` (+ `WEBSITE_STUDIO_AI_MODEL`) or `GEMINI_API_KEY` (+ `WEBSITE_STUDIO_GEMINI_MODEL`) — AI copywriting.
  Without a key, AI generation still picks the category/design and builds the site; rewrite/description actions are disabled.

Web (Vite):
- `VITE_WEBSITE_STUDIO_ROOT_DOMAIN` (default `fockis.com`)
- `VITE_WEBSITE_STUDIO_SUBDOMAINS=true` — render customer sites on `<slug>.fockis.com`
- `VITE_WEBSITE_STUDIO_CUSTOM_DOMAINS=true` — render customer sites on any other hostname
- `VITE_FOCKIS_APP_HOSTS` — comma-separated hostnames that are always the Fockis app

## Hosting custom domains / subdomains

The published site is rendered by the same web app. To serve `mybusiness.fockis.com` and customer domains:
1. Add a wildcard domain `*.fockis.com` and the CNAME target (e.g. `sites.fockis.com`) to the Vercel project.
2. Customers add the TXT record (ownership) and CNAME (routing) shown in Settings → Domains, then click Verify.
3. Add each verified custom domain to the Vercel project so HTTPS certificates are issued (Vercel API can automate this).

## Known limits

- Published pages are client-rendered (SPA). Titles, descriptions, Open Graph and robots tags are set in the browser;
  `sitemap.xml` / `robots.txt` are served by the API at `/website-studio/public/sites/:slug/sitemap.xml|robots.txt`.
  For best SEO, add server-side rendering or a prerender service later.
- Editing is section-based (like Squarespace): sections can be dragged/reordered and resized in height;
  free-form absolute positioning of individual elements is not supported.
