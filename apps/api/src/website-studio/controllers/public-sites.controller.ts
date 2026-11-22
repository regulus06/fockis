import { Body, Controller, Get, Header, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../auth/public.decorator';
import { OptionalJwtAuthGuard } from '../../auth/optional-jwt-auth.guard';
import { getRequestUser } from '../common/request-user';
import { websiteUrl } from '../common/website-studio.config';
import { SiteContent } from '../content/content.types';
import { CheckoutDto, ConfirmOrderDto, PublicSubmissionDto, QuoteDto, ReportWebsiteDto, TrackViewDto } from '../dto/website-studio.dto';
import { WebsitesService } from '../websites/websites.service';
import { CommerceService } from '../business/commerce.service';
import { SubmissionsService } from '../business/submissions.service';
import { MediaService } from '../media/media.service';

const xmlEscape = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

/**
 * Public website runtime. Published websites are served without the editor;
 * only published content is ever exposed here.
 */
@Controller('website-studio/public')
export class PublicSitesController {
  constructor(
    private readonly websites: WebsitesService,
    private readonly commerce: CommerceService,
    private readonly submissions: SubmissionsService,
    private readonly media: MediaService,
  ) {}

  @Public()
  @Get('sites/by-slug/:slug')
  bySlug(@Param('slug') slug: string) {
    return this.websites.publicBySlug(slug);
  }

  @Public()
  @Get('sites/by-host/:host')
  byHost(@Param('host') host: string) {
    return this.websites.publicByHost(host);
  }

  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get('sites/:id/availability')
  availability(@Param('id') id: string, @Query('type') type: string, @Query('date') date: string, @Query('serviceId') serviceId?: string, @Query('staffId') staffId?: string) {
    return this.submissions.availability(id, { type: type === 'reservation' ? 'reservation' : 'booking', date, serviceId, staffId });
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('sites/:id/submissions')
  submit(@Req() req: any, @Param('id') id: string, @Body() dto: PublicSubmissionDto) {
    return this.submissions.submit(id, getRequestUser(req, false), dto.type, dto.data);
  }

  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post('sites/:id/quote')
  quote(@Param('id') id: string, @Body() dto: QuoteDto) {
    return this.commerce.quote(id, dto);
  }

  /** Requires a Fockis login: payments are created with the existing Fockis payment system. */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('sites/:id/checkout')
  checkout(@Req() req: any, @Param('id') id: string, @Body() dto: CheckoutDto) {
    return this.commerce.checkout(id, getRequestUser(req)!, dto);
  }

  @Post('orders/:orderId/confirm')
  confirm(@Req() req: any, @Param('orderId') orderId: string, @Body() dto: ConfirmOrderDto) {
    return this.commerce.confirm(orderId, getRequestUser(req)!, dto.paymentIntentId);
  }

  @Get('sites/:id/my-orders')
  async myOrders(@Req() req: any, @Param('id') id: string) {
    const user = getRequestUser(req)!;
    const [orders, bookings] = await Promise.all([this.commerce.myOrders(id, user), this.submissions.mine(id, user)]);
    return { orders, bookings };
  }

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Post('sites/:id/view')
  async view(@Param('id') id: string, @Body() dto: TrackViewDto) {
    const w = await this.websites.publishedById(id);
    await this.media.trackView(w._id, dto.path ?? '/');
    return { ok: true };
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('sites/:id/report')
  report(@Req() req: any, @Param('id') id: string, @Body() dto: ReportWebsiteDto) {
    return this.submissions.report(id, getRequestUser(req, false), dto.reason);
  }

  @Public()
  @Get('sites/:slug/sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  async sitemap(@Param('slug') slug: string) {
    const site = await this.websites.publicBySlug(slug);
    const content = site.content as SiteContent;
    const base = websiteUrl(site.slug, site.primaryDomain);
    if (!content.settings.seo?.allowIndexing) return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>';
    const urls = content.pages
      .filter((p) => p.visibility === 'public' && !p.seo?.noindex && !['cart', 'account'].includes(p.slug))
      .map((p) => `<url><loc>${xmlEscape(`${base}/${p.isHomepage ? '' : p.slug}`)}</loc><lastmod>${new Date(site.publishedAt).toISOString().slice(0, 10)}</lastmod></url>`);
    return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`;
  }

  @Public()
  @Get('sites/:slug/robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  async robots(@Param('slug') slug: string) {
    const site = await this.websites.publicBySlug(slug);
    const content = site.content as SiteContent;
    const base = websiteUrl(site.slug, site.primaryDomain);
    if (!content.settings.seo?.allowIndexing) return 'User-agent: *\nDisallow: /\n';
    return `User-agent: *\nAllow: /\nDisallow: /cart\nDisallow: /account\nSitemap: ${base}/sitemap.xml\n`;
  }
}
