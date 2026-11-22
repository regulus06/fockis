import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { promises as dns } from 'dns';
import { randomBytes } from 'crypto';
import { Model, Types } from 'mongoose';
import { RequestUser } from '../common/request-user';
import { wsConfig } from '../common/website-studio.config';
import { WS_MODEL, WebsiteDocument, WebsiteDomainDocument } from '../schemas/website-studio.schemas';
import { WebsitesService } from '../websites/websites.service';

const DOMAIN_RE = /^(?=.{4,253}$)(?!-)(?:[a-z0-9-]{1,63}(?<!-)\.)+[a-z]{2,63}$/;

@Injectable()
export class DomainsService {
  constructor(
    @InjectModel(WS_MODEL.domain) private readonly domains: Model<WebsiteDomainDocument>,
    @InjectModel(WS_MODEL.website) private readonly websites: Model<WebsiteDocument>,
    private readonly sites: WebsitesService,
  ) {}

  private view(d: any) {
    return {
      id: String(d._id),
      domain: d.domain,
      verificationStatus: d.verificationStatus,
      verificationToken: d.verificationToken,
      verificationRecord: { type: 'TXT', host: `_fockis-verification.${d.domain}`, value: `fockis-verify=${d.verificationToken}` },
      routingRecord: { type: 'CNAME', host: d.domain, value: wsConfig.cnameTarget },
      sslStatus: d.sslStatus,
      lastCheckedAt: d.lastCheckedAt,
      lastError: d.lastError,
      isPrimary: d.isPrimary,
    };
  }

  async list(user: RequestUser, websiteId: string) {
    const { website } = await this.sites.getAccessible(user, websiteId, 'view');
    const list = await this.domains.find({ websiteId: website._id }).sort({ createdAt: 1 }).lean();
    return list.map((d) => this.view(d));
  }

  async add(user: RequestUser, websiteId: string, rawDomain: string) {
    const { website } = await this.sites.getAccessible(user, websiteId, 'publish');
    const domain = String(rawDomain ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\.$/, '');
    if (!DOMAIN_RE.test(domain)) throw new BadRequestException('Enter a valid domain such as www.mybusiness.com.');
    if (domain === wsConfig.rootDomain || domain.endsWith(`.${wsConfig.rootDomain}`)) {
      throw new BadRequestException(`Fockis subdomains are automatic. Change your site address instead.`);
    }
    const count = await this.domains.countDocuments({ websiteId: website._id });
    if (count >= 5) throw new BadRequestException('A website can have up to 5 custom domains.');
    if (await this.domains.exists({ domain })) throw new ConflictException('This domain is already connected to a Fockis website.');
    const d = await this.domains.create({
      websiteId: website._id,
      domain,
      verificationToken: randomBytes(16).toString('hex'),
      verificationStatus: 'pending',
      sslStatus: 'pending',
      isPrimary: false,
    });
    return this.view(d.toObject());
  }

  /** Verifies ownership with a DNS TXT record, then checks routing (CNAME/A) to enable HTTPS. */
  async verify(user: RequestUser, websiteId: string, domainId: string) {
    const { website } = await this.sites.getAccessible(user, websiteId, 'publish');
    if (!Types.ObjectId.isValid(domainId)) throw new NotFoundException('Domain not found.');
    const d = await this.domains.findOne({ _id: domainId, websiteId: website._id });
    if (!d) throw new NotFoundException('Domain not found.');
    d.lastCheckedAt = new Date();
    try {
      const records = await dns.resolveTxt(`_fockis-verification.${d.domain}`);
      const flat = records.map((r) => r.join(''));
      if (!flat.includes(`fockis-verify=${d.verificationToken}`)) {
        d.verificationStatus = 'failed';
        d.lastError = 'The TXT record was found but its value does not match. DNS changes can take up to 48 hours.';
      } else {
        d.verificationStatus = 'verified';
        d.lastError = null;
      }
    } catch {
      d.verificationStatus = 'failed';
      d.lastError = 'No verification TXT record was found yet. DNS changes can take up to 48 hours.';
    }
    if (d.verificationStatus === 'verified') {
      d.sslStatus = (await this.routesToFockis(d.domain)) ? 'active' : 'pending';
      if (d.sslStatus === 'pending') d.lastError = `Ownership verified. Point ${d.domain} to ${wsConfig.cnameTarget} (CNAME) to finish HTTPS setup.`;
      const hasPrimary = await this.domains.exists({ websiteId: website._id, isPrimary: true, _id: { $ne: d._id } });
      if (!hasPrimary) {
        d.isPrimary = true;
        await this.websites.updateOne({ _id: website._id }, { $set: { domain: d.domain } });
      }
    }
    await d.save();
    return this.view(d.toObject());
  }

  private async routesToFockis(domain: string): Promise<boolean> {
    try {
      const cname = await dns.resolveCname(domain);
      if (cname.some((c) => c.toLowerCase().replace(/\.$/, '') === wsConfig.cnameTarget)) return true;
    } catch {
      /* no CNAME — try A records */
    }
    try {
      const [mine, target] = await Promise.all([dns.resolve4(domain), dns.resolve4(wsConfig.cnameTarget)]);
      return mine.some((ip) => target.includes(ip));
    } catch {
      return false;
    }
  }

  async remove(user: RequestUser, websiteId: string, domainId: string) {
    const { website } = await this.sites.getAccessible(user, websiteId, 'publish');
    if (!Types.ObjectId.isValid(domainId)) throw new NotFoundException('Domain not found.');
    const d = await this.domains.findOneAndDelete({ _id: domainId, websiteId: website._id });
    if (!d) throw new NotFoundException('Domain not found.');
    if (d.isPrimary) {
      const next = await this.domains.findOne({ websiteId: website._id, verificationStatus: 'verified' });
      if (next) {
        next.isPrimary = true;
        await next.save();
      }
      await this.websites.updateOne({ _id: website._id }, { $set: { domain: next?.domain ?? null } });
    }
    return { deleted: true };
  }
}
