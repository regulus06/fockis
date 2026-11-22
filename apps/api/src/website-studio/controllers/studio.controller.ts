import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { Public } from '../../auth/public.decorator';
import { getRequestUser } from '../common/request-user';
import {
  AddDomainDto,
  AddManagerDto,
  AiAssistDto,
  AiGenerateDto,
  CreateVersionDto,
  CreateWebsiteDto,
  RegisterAssetDto,
  SaveCouponsDto,
  SaveDraftDto,
  SaveSectionDto,
  SwitchTemplateDto,
  UpdateAssetDto,
  UpdateOrderDto,
  UpdateSubmissionDto,
  UpdateWebsiteDto,
} from '../dto/website-studio.dto';
import { TemplatesService } from '../templates/templates.service';
import { WebsitesService } from '../websites/websites.service';
import { DomainsService } from '../domains/domains.service';
import { MediaService } from '../media/media.service';
import { CommerceService } from '../business/commerce.service';
import { SubmissionsService } from '../business/submissions.service';
import { WebsiteAiService } from '../ai/website-ai.service';

/* ========================================================================== */
/* PUBLIC TEMPLATE CATALOG                                                    */
/* ========================================================================== */
@Controller('website-studio')
export class WebsiteStudioCatalogController {
  constructor(
    private readonly templates: TemplatesService,
    private readonly media: MediaService,
    private readonly ai: WebsiteAiService,
  ) {}

  @Public()
  @Get('categories')
  categories() {
    return this.templates.listCategories();
  }

  @Public()
  @Get('templates')
  list(@Query('category') category?: string, @Query('q') q?: string, @Query('featured') featured?: string) {
    return this.templates.listPublic({ category, q, featured });
  }

  @Public()
  @Get('templates/:slug')
  get(@Param('slug') slug: string) {
    return this.templates.getPublic(slug);
  }

  /* ---------------- reusable sections (per user) ---------------- */
  @Get('saved-sections')
  saved(@Req() req: any) {
    return this.media.listSaved(getRequestUser(req)!);
  }

  @Post('saved-sections')
  saveSection(@Req() req: any, @Body() dto: SaveSectionDto) {
    return this.media.addSaved(getRequestUser(req)!, dto.name, dto.section);
  }

  @Delete('saved-sections/:id')
  deleteSection(@Req() req: any, @Param('id') id: string) {
    return this.media.removeSaved(getRequestUser(req)!, id);
  }

  /* ---------------- AI ---------------- */
  @Post('ai/generate')
  generate(@Req() req: any, @Body() dto: AiGenerateDto) {
    return this.ai.generate(getRequestUser(req)!, dto.prompt, dto.organizationId);
  }

  @Post('ai/assist')
  assist(@Req() req: any, @Body() dto: AiAssistDto) {
    return this.ai.assist(getRequestUser(req)!, dto);
  }
}

/* ========================================================================== */
/* MY WEBSITES (authenticated; ownership enforced in services)               */
/* ========================================================================== */
@Controller('website-studio/websites')
export class WebsitesController {
  constructor(
    private readonly websites: WebsitesService,
    private readonly domains: DomainsService,
    private readonly media: MediaService,
    private readonly commerce: CommerceService,
    private readonly submissions: SubmissionsService,
  ) {}

  @Get()
  mine(@Req() req: any) {
    return this.websites.listMine(getRequestUser(req)!);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateWebsiteDto) {
    return this.websites.create(getRequestUser(req)!, req.user, dto);
  }

  @Get(':id')
  async get(@Req() req: any, @Param('id') id: string) {
    const { website, role } = await this.websites.getAccessible(getRequestUser(req)!, id, 'view');
    return this.websites.detail(website, role);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateWebsiteDto) {
    return this.websites.update(getRequestUser(req)!, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.websites.remove(getRequestUser(req)!, id);
  }

  @Post(':id/duplicate')
  duplicate(@Req() req: any, @Param('id') id: string) {
    return this.websites.duplicate(getRequestUser(req)!, id);
  }

  @Put(':id/draft')
  saveDraft(@Req() req: any, @Param('id') id: string, @Body() dto: SaveDraftDto) {
    return this.websites.saveDraft(getRequestUser(req)!, id, dto.content, dto.revision);
  }

  @Get(':id/versions')
  versions(@Req() req: any, @Param('id') id: string) {
    return this.websites.listVersions(getRequestUser(req)!, id);
  }

  @Post(':id/versions')
  createVersion(@Req() req: any, @Param('id') id: string, @Body() dto: CreateVersionDto) {
    return this.websites.createVersion(getRequestUser(req)!, id, dto.label ?? '');
  }

  @Post(':id/versions/:versionId/restore')
  restore(@Req() req: any, @Param('id') id: string, @Param('versionId') versionId: string) {
    return this.websites.restoreVersion(getRequestUser(req)!, id, versionId);
  }

  @Post(':id/publish')
  publish(@Req() req: any, @Param('id') id: string) {
    return this.websites.publish(getRequestUser(req)!, id);
  }

  @Post(':id/unpublish')
  unpublish(@Req() req: any, @Param('id') id: string) {
    return this.websites.unpublish(getRequestUser(req)!, id);
  }

  @Post(':id/switch-template/preview')
  previewSwitch(@Req() req: any, @Param('id') id: string, @Body() dto: SwitchTemplateDto) {
    return this.websites.previewSwitch(getRequestUser(req)!, id, dto.templateSlug);
  }

  @Post(':id/switch-template')
  switchTemplate(@Req() req: any, @Param('id') id: string, @Body() dto: SwitchTemplateDto) {
    return this.websites.switchTemplate(getRequestUser(req)!, req.user, id, dto.templateSlug);
  }

  @Get(':id/export')
  exportSite(@Req() req: any, @Param('id') id: string) {
    return this.websites.exportWebsite(getRequestUser(req)!, id);
  }

  /* ---------------- domains ---------------- */
  @Get(':id/domains')
  listDomains(@Req() req: any, @Param('id') id: string) {
    return this.domains.list(getRequestUser(req)!, id);
  }

  @Post(':id/domains')
  addDomain(@Req() req: any, @Param('id') id: string, @Body() dto: AddDomainDto) {
    return this.domains.add(getRequestUser(req)!, id, dto.domain);
  }

  @Post(':id/domains/:domainId/verify')
  verifyDomain(@Req() req: any, @Param('id') id: string, @Param('domainId') domainId: string) {
    return this.domains.verify(getRequestUser(req)!, id, domainId);
  }

  @Delete(':id/domains/:domainId')
  removeDomain(@Req() req: any, @Param('id') id: string, @Param('domainId') domainId: string) {
    return this.domains.remove(getRequestUser(req)!, id, domainId);
  }

  /* ---------------- managers ---------------- */
  @Get(':id/managers')
  managers(@Req() req: any, @Param('id') id: string) {
    return this.websites.listManagers(getRequestUser(req)!, id);
  }

  @Post(':id/managers')
  addManager(@Req() req: any, @Param('id') id: string, @Body() dto: AddManagerDto) {
    return this.websites.addManager(getRequestUser(req)!, id, dto.identifier, dto.role);
  }

  @Delete(':id/managers/:userId')
  removeManager(@Req() req: any, @Param('id') id: string, @Param('userId') userId: string) {
    return this.websites.removeManager(getRequestUser(req)!, id, userId);
  }

  /* ---------------- media library ---------------- */
  @Get(':id/assets')
  assets(@Req() req: any, @Param('id') id: string, @Query('folder') folder?: string, @Query('q') q?: string) {
    return this.media.list(getRequestUser(req)!, id, folder, q);
  }

  @Post(':id/assets')
  addAsset(@Req() req: any, @Param('id') id: string, @Body() dto: RegisterAssetDto) {
    return this.media.register(getRequestUser(req)!, id, dto);
  }

  @Patch(':id/assets/:assetId')
  updateAsset(@Req() req: any, @Param('id') id: string, @Param('assetId') assetId: string, @Body() dto: UpdateAssetDto) {
    return this.media.update(getRequestUser(req)!, id, assetId, dto);
  }

  @Delete(':id/assets/:assetId')
  deleteAsset(@Req() req: any, @Param('id') id: string, @Param('assetId') assetId: string) {
    return this.media.remove(getRequestUser(req)!, id, assetId);
  }

  /* ---------------- business data ---------------- */
  @Get(':id/orders')
  orders(@Req() req: any, @Param('id') id: string) {
    return this.commerce.listForOwner(getRequestUser(req)!, id);
  }

  @Patch(':id/orders/:orderId')
  updateOrder(@Req() req: any, @Param('id') id: string, @Param('orderId') orderId: string, @Body() dto: UpdateOrderDto) {
    return this.commerce.updateForOwner(getRequestUser(req)!, id, orderId, dto);
  }

  @Get(':id/submissions')
  listSubmissions(@Req() req: any, @Param('id') id: string, @Query('type') type?: string) {
    return this.submissions.list(getRequestUser(req)!, id, type);
  }

  @Patch(':id/submissions/:sid')
  updateSubmission(@Req() req: any, @Param('id') id: string, @Param('sid') sid: string, @Body() dto: UpdateSubmissionDto) {
    return this.submissions.updateStatus(getRequestUser(req)!, id, sid, dto.status);
  }

  @Get(':id/coupons')
  coupons(@Req() req: any, @Param('id') id: string) {
    return this.commerce.coupons(getRequestUser(req)!, id);
  }

  @Put(':id/coupons')
  saveCoupons(@Req() req: any, @Param('id') id: string, @Body() dto: SaveCouponsDto) {
    return this.commerce.saveCoupons(getRequestUser(req)!, id, dto.coupons);
  }

  @Get(':id/analytics')
  analytics(@Req() req: any, @Param('id') id: string) {
    return this.media.summary(getRequestUser(req)!, id);
  }
}
