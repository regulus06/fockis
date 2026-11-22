/**
 * news.controller.ts — Fockis News & Media HTTP API.
 *
 *   /news/public/*   readers (anonymous allowed; signed-in users get follow/like state)
 *   /news/*          signed-in readers: likes, bookmarks, comments, follows, donations
 *   /news/newsroom/* Media Administration Center (membership + permission checked per call)
 */

import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { Public } from '../auth/public.decorator';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { getRequestUser } from '../website-studio/common/request-user';
import { NewsPublicService, type NewsFilters } from './news-public.service';
import { NewsroomService } from './newsroom.service';
import { NewsSupportService } from './news-support.service';

type Payload = Record<string, unknown>;

const uid = (req: Request) => getRequestUser(req, true)!.id;
const maybeUid = (req: Request) => getRequestUser(req, false)?.id ?? null;
const filters = (q: Record<string, string | undefined>): NewsFilters => ({
  country: q.country,
  city: q.city,
  language: q.language,
  category: q.category,
  mediaType: q.mediaType,
  outlet: q.outlet,
  from: q.from,
  to: q.to,
  q: q.q,
});

@Controller('news/public')
@Public()
@UseGuards(OptionalJwtAuthGuard)
export class NewsPublicController {
  constructor(
    private readonly pub: NewsPublicService,
    private readonly support: NewsSupportService,
  ) {}

  @Get('home')
  home(@Req() req: Request, @Query() q: Record<string, string>) {
    return this.pub.home(maybeUid(req), filters(q));
  }

  @Get('articles')
  articles(@Query() q: Record<string, string>) {
    return this.pub.list({ ...filters(q), section: q.section, page: Number(q.page) });
  }

  @Get('media/:kind')
  media(@Param('kind') kind: string, @Query('page') page?: string, @Query('outlet') outlet?: string) {
    return this.pub.mediaItems(kind, Number(page), outlet);
  }

  @Get('live')
  live() {
    return this.pub.liveNow(24);
  }

  @Get('top-media')
  topMedia(@Req() req: Request) {
    return this.pub.topMedia(maybeUid(req), 10);
  }

  @Get('outlets')
  directory(@Req() req: Request, @Query() q: Record<string, string>) {
    return this.pub.directory(maybeUid(req), { ...q, page: Number(q.page) });
  }

  @Get('outlets/:slug')
  profile(@Req() req: Request, @Param('slug') slug: string) {
    return this.pub.profile(maybeUid(req), slug);
  }

  @Get('outlets/:slug/articles')
  outletArticles(@Param('slug') slug: string, @Query() q: Record<string, string>) {
    return this.pub.outletArticles(slug, { category: q.category, page: Number(q.page) });
  }

  @Get('outlets/:slug/support')
  supportPage(@Req() req: Request, @Param('slug') slug: string) {
    return this.support.supportPage(slug, maybeUid(req));
  }

  @Get('read/:slug/:articleSlug')
  read(@Req() req: Request, @Param('slug') slug: string, @Param('articleSlug') articleSlug: string) {
    return this.pub.article(maybeUid(req), slug, articleSlug, {
      ip: req.ip,
      ua: String(req.headers['user-agent'] ?? ''),
      ref: String(req.headers['referer'] ?? ''),
      lang: String(req.headers['accept-language'] ?? ''),
    });
  }

  @Get('articles/:id/comments')
  comments(@Param('id') id: string) {
    return this.pub.listComments(id);
  }

  @Post('outlets/:slug/requests')
  @Throttle({ default: { limit: 6, ttl: 3_600_000 } })
  submitRequest(@Req() req: Request, @Param('slug') slug: string, @Body() body: Payload) {
    return this.support.submitRequest(maybeUid(req), slug, body, { ip: req.ip });
  }

  @Post('requests/track')
  @Throttle({ default: { limit: 30, ttl: 3_600_000 } })
  track(@Req() req: Request, @Body() body: Payload) {
    return this.support.trackRequest(String(body.reference ?? ''), String(body.code ?? ''), maybeUid(req));
  }

  @Post('requests/track/reply')
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  trackReply(@Req() req: Request, @Body() body: Payload) {
    return this.support.replyAsSubmitter(String(body.reference ?? ''), String(body.code ?? ''), maybeUid(req), String(body.text ?? ''));
  }
}

@Controller('news')
export class NewsReaderController {
  constructor(
    private readonly pub: NewsPublicService,
    private readonly support: NewsSupportService,
  ) {}

  @Post('articles/:id/like')
  like(@Req() req: Request, @Param('id') id: string, @Body() body: Payload) {
    return this.pub.react(uid(req), id, 'like', body.on !== false);
  }

  @Post('articles/:id/bookmark')
  bookmark(@Req() req: Request, @Param('id') id: string, @Body() body: Payload) {
    return this.pub.react(uid(req), id, 'bookmark', body.on !== false);
  }

  @Get('me/bookmarks')
  bookmarks(@Req() req: Request, @Query('page') page?: string) {
    return this.pub.bookmarks(uid(req), Number(page));
  }

  @Post('articles/:id/comments')
  @Throttle({ default: { limit: 20, ttl: 600_000 } })
  comment(@Req() req: Request, @Param('id') id: string, @Body() body: Payload) {
    return this.pub.addComment(uid(req), id, String(body.body ?? ''));
  }

  @Delete('comments/:id')
  deleteComment(@Req() req: Request, @Param('id') id: string) {
    return this.pub.deleteOwnComment(uid(req), id);
  }

  @Post('outlets/:id/follow')
  follow(@Req() req: Request, @Param('id') id: string) {
    return this.pub.follow(uid(req), id);
  }

  @Delete('outlets/:id/follow')
  unfollow(@Req() req: Request, @Param('id') id: string) {
    return this.pub.unfollow(uid(req), id);
  }

  @Put('outlets/:id/follow')
  prefs(@Req() req: Request, @Param('id') id: string, @Body() body: Payload) {
    return this.pub.setPrefs(uid(req), id, { prefs: body.prefs as Record<string, unknown>, muted: typeof body.muted === 'boolean' ? body.muted : undefined, all: typeof body.all === 'boolean' ? body.all : undefined });
  }

  @Get('me/follows')
  myFollows(@Req() req: Request) {
    return this.pub.myFollows(uid(req));
  }

  @Post('outlets/:slug/donations')
  @Throttle({ default: { limit: 12, ttl: 3_600_000 } })
  donate(@Req() req: Request, @Param('slug') slug: string, @Body() body: Payload) {
    return this.support.startDonation(uid(req), slug, body);
  }

  @Post('donations/:id/confirm')
  confirmDonation(@Req() req: Request, @Param('id') id: string, @Body() body: Payload) {
    return this.support.confirmDonation(uid(req), id, String(body.paymentIntentId ?? ''));
  }

  @Get('me/donations')
  myDonations(@Req() req: Request) {
    return this.support.myDonations(uid(req));
  }

  @Post('me/pledges/:id/cancel')
  cancelPledge(@Req() req: Request, @Param('id') id: string) {
    return this.support.cancelPledge(uid(req), id);
  }
}

@Controller('news/newsroom')
export class NewsroomController {
  constructor(
    private readonly room: NewsroomService,
    private readonly support: NewsSupportService,
  ) {}

  /* ---- media organizations ---- */

  @Get('mine')
  mine(@Req() req: Request) {
    return this.room.myOutlets(uid(req));
  }

  @Get('organizations')
  organizations(@Req() req: Request) {
    return this.room.linkableOrganizations(uid(req));
  }

  @Get('slug-available')
  slug(@Query('slug') slug: string) {
    return this.room.slugAvailable(String(slug ?? ''));
  }

  @Post('outlets')
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  create(@Req() req: Request, @Body() body: Payload) {
    return this.room.createOutlet(getRequestUser(req, true)!, req.user, body);
  }

  @Get('outlets/:id')
  outlet(@Req() req: Request, @Param('id') id: string) {
    return this.room.getOutlet(id, uid(req));
  }

  @Patch('outlets/:id')
  update(@Req() req: Request, @Param('id') id: string, @Body() body: Payload) {
    return this.room.updateOutlet(id, uid(req), body);
  }

  @Put('outlets/:id/live')
  live(@Req() req: Request, @Param('id') id: string, @Body() body: Payload) {
    return this.room.setLive(id, uid(req), body);
  }

  @Post('outlets/:id/website')
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  createWebsite(@Req() req: Request, @Param('id') id: string, @Body() body: Payload) {
    return this.room.createWebsiteFor(getRequestUser(req, true)!, req.user, id, body);
  }

  @Get('outlets/:id/website')
  website(@Req() req: Request, @Param('id') id: string) {
    return this.room.websiteInfo(id, uid(req));
  }

  @Get('outlets/:id/dashboard')
  dashboard(@Req() req: Request, @Param('id') id: string) {
    return this.room.dashboard(id, uid(req));
  }

  @Get('outlets/:id/analytics')
  analytics(@Req() req: Request, @Param('id') id: string, @Query() q: Record<string, string>) {
    return this.room.analytics(id, uid(req), q);
  }

  @Get('outlets/:id/followers')
  followers(@Req() req: Request, @Param('id') id: string, @Query('page') page?: string) {
    return this.room.followers(id, uid(req), Number(page) || 1);
  }

  @Get('outlets/:id/categories')
  categories(@Req() req: Request, @Param('id') id: string) {
    return this.room.categoryCounts(id, uid(req));
  }

  @Get('outlets/:id/audit')
  audit(@Req() req: Request, @Param('id') id: string) {
    return this.room.auditLog(id, uid(req));
  }

  /* ---- team ---- */

  @Get('outlets/:id/team')
  team(@Req() req: Request, @Param('id') id: string) {
    return this.room.team(id, uid(req));
  }

  @Post('outlets/:id/team')
  addMember(@Req() req: Request, @Param('id') id: string, @Body() body: Payload) {
    return this.room.addMember(id, uid(req), body);
  }

  @Patch('outlets/:id/team/:memberId')
  updateMember(@Req() req: Request, @Param('id') id: string, @Param('memberId') memberId: string, @Body() body: Payload) {
    return this.room.updateMember(id, uid(req), memberId, body);
  }

  @Delete('outlets/:id/team/:memberId')
  removeMember(@Req() req: Request, @Param('id') id: string, @Param('memberId') memberId: string) {
    return this.room.removeMember(id, uid(req), memberId);
  }

  @Put('outlets/:id/permissions')
  permissions(@Req() req: Request, @Param('id') id: string, @Body() body: Payload) {
    return this.room.saveRolePermissions(id, uid(req), body);
  }

  /* ---- articles ---- */

  @Get('outlets/:id/articles')
  articles(@Req() req: Request, @Param('id') id: string, @Query() q: Record<string, string>) {
    return this.room.listArticles(id, uid(req), { ...q, page: Number(q.page) });
  }

  @Post('outlets/:id/articles')
  createArticle(@Req() req: Request, @Param('id') id: string, @Body() body: Payload) {
    return this.room.createArticle(id, uid(req), body);
  }

  @Get('outlets/:id/articles/:aid')
  article(@Req() req: Request, @Param('id') id: string, @Param('aid') aid: string) {
    return this.room.getArticle(id, uid(req), aid);
  }

  @Patch('outlets/:id/articles/:aid')
  updateArticle(@Req() req: Request, @Param('id') id: string, @Param('aid') aid: string, @Body() body: Payload) {
    return this.room.updateArticle(id, uid(req), aid, body);
  }

  @Post('outlets/:id/articles/:aid/action')
  action(@Req() req: Request, @Param('id') id: string, @Param('aid') aid: string, @Body() body: Payload) {
    return this.room.articleAction(id, uid(req), aid, { action: String(body.action ?? ''), note: String(body.note ?? ''), scheduledAt: body.scheduledAt ? String(body.scheduledAt) : undefined, confirmAiReviewed: body.confirmAiReviewed === true });
  }

  @Delete('outlets/:id/articles/:aid')
  deleteArticle(@Req() req: Request, @Param('id') id: string, @Param('aid') aid: string) {
    return this.room.deleteArticle(id, uid(req), aid);
  }

  @Post('outlets/:id/ai')
  @Throttle({ default: { limit: 30, ttl: 3_600_000 } })
  ai(@Req() req: Request, @Param('id') id: string, @Body() body: Payload) {
    return this.room.aiAssist(id, uid(req), body);
  }

  /* ---- videos, podcasts, programs ---- */

  @Get('outlets/:id/items')
  items(@Req() req: Request, @Param('id') id: string, @Query('kind') kind: string) {
    return this.room.listItems(id, uid(req), String(kind ?? ''));
  }

  @Post('outlets/:id/items')
  createItem(@Req() req: Request, @Param('id') id: string, @Body() body: Payload) {
    return this.room.saveItem(id, uid(req), null, body);
  }

  @Patch('outlets/:id/items/:iid')
  updateItem(@Req() req: Request, @Param('id') id: string, @Param('iid') iid: string, @Body() body: Payload) {
    return this.room.saveItem(id, uid(req), iid, body);
  }

  @Delete('outlets/:id/items/:iid')
  deleteItem(@Req() req: Request, @Param('id') id: string, @Param('iid') iid: string) {
    return this.room.deleteItem(id, uid(req), iid);
  }

  /* ---- comments ---- */

  @Get('outlets/:id/comments')
  comments(@Req() req: Request, @Param('id') id: string, @Query('status') status?: string) {
    return this.room.listComments(id, uid(req), status);
  }

  @Post('outlets/:id/comments/:cid/moderate')
  moderate(@Req() req: Request, @Param('id') id: string, @Param('cid') cid: string, @Body() body: Payload) {
    return this.room.moderateComment(id, uid(req), cid, body.hide !== false);
  }

  /* ---- donations & campaigns ---- */

  @Get('outlets/:id/donations')
  donations(@Req() req: Request, @Param('id') id: string, @Query() q: Record<string, string>) {
    return this.support.adminDonations(id, uid(req), { ...q, page: Number(q.page) });
  }

  @Get('outlets/:id/donations/export')
  exportDonations(@Req() req: Request, @Param('id') id: string) {
    return this.support.exportDonations(id, uid(req));
  }

  @Post('outlets/:id/donations/:did/refund')
  refund(@Req() req: Request, @Param('id') id: string, @Param('did') did: string) {
    return this.support.refund(id, uid(req), did);
  }

  @Get('outlets/:id/campaigns')
  campaigns(@Req() req: Request, @Param('id') id: string) {
    return this.support.adminCampaigns(id, uid(req));
  }

  @Post('outlets/:id/campaigns')
  createCampaign(@Req() req: Request, @Param('id') id: string, @Body() body: Payload) {
    return this.support.saveCampaign(id, uid(req), null, body);
  }

  @Patch('outlets/:id/campaigns/:cid')
  updateCampaign(@Req() req: Request, @Param('id') id: string, @Param('cid') cid: string, @Body() body: Payload) {
    return this.support.saveCampaign(id, uid(req), cid, body);
  }

  /* ---- requests ---- */

  @Get('outlets/:id/requests')
  requests(@Req() req: Request, @Param('id') id: string, @Query() q: Record<string, string>) {
    return this.support.adminRequests(id, uid(req), { ...q, page: Number(q.page) });
  }

  @Get('outlets/:id/requests/:rid')
  request(@Req() req: Request, @Param('id') id: string, @Param('rid') rid: string) {
    return this.support.getRequest(id, uid(req), rid);
  }

  @Patch('outlets/:id/requests/:rid')
  updateRequest(@Req() req: Request, @Param('id') id: string, @Param('rid') rid: string, @Body() body: Payload) {
    return this.support.updateRequest(id, uid(req), rid, body);
  }

  /* ---- Fockis staff ---- */

  @Post('staff/outlets/:id/verify')
  verify(@Req() req: Request, @Param('id') id: string, @Body() body: Payload) {
    return this.room.staffVerify(uid(req), id, body.verified !== false);
  }

  @Post('staff/articles/:id/feature')
  feature(@Req() req: Request, @Param('id') id: string, @Body() body: Payload) {
    return this.room.staffFeature(uid(req), id, body.featured !== false);
  }

  @Get('staff/feature-requests')
  featureRequests(@Req() req: Request) {
    return this.room.staffFeatureRequests(uid(req));
  }
}
