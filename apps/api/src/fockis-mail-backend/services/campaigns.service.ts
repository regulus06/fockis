import {



  BadRequestException,



  Injectable,



  NotFoundException,



} from '@nestjs/common';







import { InjectModel } from '@nestjs/mongoose';



import { Model, Types } from 'mongoose';







import {



  Campaign,



  CampaignDocument,



} from '../schemas/campaign.schema';







import {



  Contact,



  ContactDocument,



} from '../schemas/contact.schema';







import {



  CreateCampaignDto,



  ScheduleCampaignDto,



  UpdateCampaignDto,



} from '../dto/fockis-mail.dto';







import {



  CampaignStatus,



} from '../enums/fockis-mail.enums';







@Injectable()



export class CampaignsService {



  constructor(



    @InjectModel(Campaign.name)



    private readonly campaigns: Model<CampaignDocument>,







    @InjectModel(Contact.name)



    private readonly contacts: Model<ContactDocument>,



  ) {}







  /**



   * List campaigns for the current owner/workspace.



   */



  async list(



    ownerId: Types.ObjectId,



    workspaceId: string,



  ) {



    const campaigns = await this.campaigns



      .find({



        ownerId,



        workspaceId,



      })



      .sort({



        createdAt: -1,



      })



      .lean();







    return campaigns.map((campaign: any) =>



      this.serialize(campaign),



    );



  }







  /**



   * Get one campaign.



   */



  async get(



    id: string,



    ownerId: Types.ObjectId,



    workspaceId: string,



  ) {

    if (!Types.ObjectId.isValid(id)) {

      throw new BadRequestException('Invalid campaign ID.');

    }



    const campaign = await this.campaigns.findOne({



      _id: new Types.ObjectId(id),



      ownerId,



      workspaceId,



    });







    if (!campaign) {



      throw new NotFoundException('Campaign not found');



    }







    return this.serialize(campaign);



  }







  /**



   * Create campaign.



   *



   * Accepts both the existing backend contract and the



   * Fockis EmailCampaignComposer contract.



   */



  async create(



    dto: CreateCampaignDto,



    ownerId: Types.ObjectId,



    workspaceId: string,



  ) {



    const recipients = await this.resolveRecipients(



      dto.recipients,



      ownerId,



      workspaceId,



    );







    const audienceIds = this.mergeIds(



      dto.audienceIds,



      dto.audienceId,



    );







    const segmentIds = this.mergeIds(



      dto.segmentIds,



      dto.segmentId,



    );







    const campaignData: any = {



      name: dto.name,



      description: dto.description || '',



      type: dto.type,



      status: dto.status || CampaignStatus.DRAFT,







      fromName: dto.fromName || '',



      fromEmail: dto.fromEmail || '',



      replyTo: dto.replyTo || '',







      subject: dto.subject || '',



      previewText: dto.previewText || '',







      audienceId: dto.audienceId || '',



      audienceIds,







      segmentId: dto.segmentId || '',



      segmentIds,







      tagIds: dto.tagIds || [],



      fockisFilters: dto.fockisFilters || [],







      content: dto.content || null,







      html: dto.html || '',



      blocks: dto.blocks || [],







      recipients,







      stats: {



        sent: 0,



        delivered: 0,



        opens: 0,



        clicks: 0,



        bounces: 0,



        unsubscribes: 0,



      },







      scheduledAt: dto.scheduledAt



        ? new Date(dto.scheduledAt)



        : undefined,







      ownerId,



      workspaceId,



    };







    const campaign = await this.campaigns.create(



      campaignData,



    );







    return this.serialize(campaign);



  }







  /**



   * Update campaign.



   *



   * Supports partial updates such as:



   *



   * { content }



   *



   * which is what EmailBuilder uses.



   */



  async update(



    id: string,



    dto: UpdateCampaignDto,



    ownerId: Types.ObjectId,



    workspaceId: string,



  ) {

    if (!Types.ObjectId.isValid(id)) {

      throw new BadRequestException('Invalid campaign ID.');

    }



    const campaign = await this.campaigns.findOne({



      _id: new Types.ObjectId(id),



      ownerId,



      workspaceId,



    });







    if (!campaign) {



      throw new NotFoundException('Campaign not found');



    }







    const update: any = {};







    if (dto.name !== undefined) {



      update.name = dto.name;



    }







    if (dto.description !== undefined) {



      update.description = dto.description;



    }







    if (dto.type !== undefined) {



      update.type = dto.type;



    }







    if (dto.status !== undefined) {



      update.status = dto.status;



    }







    if (dto.fromName !== undefined) {



      update.fromName = dto.fromName;



    }







    if (dto.fromEmail !== undefined) {



      update.fromEmail = dto.fromEmail;



    }







    if (dto.replyTo !== undefined) {



      update.replyTo = dto.replyTo;



    }







    if (dto.subject !== undefined) {



      update.subject = dto.subject;



    }







    if (dto.previewText !== undefined) {



      update.previewText = dto.previewText;



    }







    if (dto.audienceId !== undefined) {



      update.audienceId = dto.audienceId;



    }







    if (



      dto.audienceIds !== undefined ||



      dto.audienceId !== undefined



    ) {



      update.audienceIds = this.mergeIds(



        dto.audienceIds,



        dto.audienceId,



      );



    }







    if (dto.segmentId !== undefined) {



      update.segmentId = dto.segmentId;



    }







    if (



      dto.segmentIds !== undefined ||



      dto.segmentId !== undefined



    ) {



      update.segmentIds = this.mergeIds(



        dto.segmentIds,



        dto.segmentId,



      );



    }







    if (dto.tagIds !== undefined) {



      update.tagIds = dto.tagIds;



    }







    if (dto.fockisFilters !== undefined) {



      update.fockisFilters = dto.fockisFilters;



    }







    /**



     * EmailBuilder sends only:



     *



     * { content }



     */



    if (dto.content !== undefined) {



      update.content = dto.content;



    }







    if (dto.html !== undefined) {



      update.html = dto.html;



    }







    if (dto.blocks !== undefined) {



      update.blocks = dto.blocks;



    }







    if (dto.scheduledAt !== undefined) {



      update.scheduledAt = dto.scheduledAt



        ? new Date(dto.scheduledAt)



        : undefined;



    }







    /**



     * Existing recipient/email support.



     */



    if (dto.recipients !== undefined) {



      update.recipients = await this.resolveRecipients(



        dto.recipients,



        ownerId,



        workspaceId,



      );



    }







    Object.assign(campaign, update);







    await campaign.save();







    return this.serialize(campaign);



  }







  /**



   * Delete campaign.



   */



  async remove(



    id: string,



    ownerId: Types.ObjectId,



    workspaceId: string,



  ) {

    if (!Types.ObjectId.isValid(id)) {

      throw new BadRequestException('Invalid campaign ID.');

    }



    const campaign = await this.campaigns.findOneAndDelete({



      _id: new Types.ObjectId(id),



      ownerId,



      workspaceId,



    });







    if (!campaign) {



      throw new NotFoundException('Campaign not found');



    }







    return {



      success: true,



      id,



    };



  }







  /**



   * Send campaign immediately.



   *



   * This preserves the existing mock/queue behavior.



   * A real Mailchimp/provider delivery layer can be connected later.



   */



  async send(



    id: string,



    ownerId: Types.ObjectId,



    workspaceId: string,



  ) {

    if (!Types.ObjectId.isValid(id)) {

      throw new BadRequestException('Invalid campaign ID.');

    }



    const campaign = await this.campaigns.findOne({



      _id: new Types.ObjectId(id),



      ownerId,



      workspaceId,



    });







    if (!campaign) {



      throw new NotFoundException('Campaign not found');



    }







    const hasContent =



      !!campaign.subject &&



      (



        !!campaign.html ||



        !!campaign.content ||



        !!campaign.blocks?.length



      );







    if (!hasContent) {



      throw new BadRequestException(



        'Campaign needs email content before sending.',



      );



    }







    const recipientCount =



      campaign.recipients?.length || 0;







    campaign.status = CampaignStatus.SENT;







    campaign.scheduledAt = undefined;







    campaign.stats = {



      ...(campaign.stats || {}),



      sent: recipientCount,



    };







    await campaign.save();







    return {



      success: true,



      id: String(campaign._id),



      campaign: this.serialize(campaign),



      message:



        'Campaign queued/sent. Configure an email provider for real delivery.',



    };



  }







  /**



   * Schedule campaign.



   */



  async schedule(



    id: string,



    dto: ScheduleCampaignDto,



    ownerId: Types.ObjectId,



    workspaceId: string,



  ) {

    if (!Types.ObjectId.isValid(id)) {

      throw new BadRequestException('Invalid campaign ID.');

    }



    const campaign = await this.campaigns.findOne({



      _id: new Types.ObjectId(id),



      ownerId,



      workspaceId,



    });







    if (!campaign) {



      throw new NotFoundException('Campaign not found');



    }







    if (!campaign.subject) {



      throw new BadRequestException(



        'Campaign subject is required before scheduling.',



      );



    }







    const hasContent =



      !!campaign.html ||



      !!campaign.content ||



      !!campaign.blocks?.length;







    if (!hasContent) {



      throw new BadRequestException(



        'Campaign needs email content before scheduling.',



      );



    }







    const scheduledAt = new Date(



      dto.scheduledAt,



    );







    if (Number.isNaN(scheduledAt.getTime())) {



      throw new BadRequestException(



        'Invalid scheduledAt date.',



      );



    }







    if (scheduledAt.getTime() <= Date.now()) {



      throw new BadRequestException(



        'Campaign must be scheduled for a future time.',



      );



    }







    campaign.scheduledAt = scheduledAt;







    /**



     * We intentionally keep this as a draft/scheduled campaign



     * rather than marking it SENT before the scheduled time.



     *



     * If CampaignStatus has a SCHEDULED enum, use it.



     * Otherwise DRAFT remains the safe fallback.



     */



    const statusValues = Object.values(



      CampaignStatus,



    ) as string[];







    if (statusValues.includes('SCHEDULED')) {



      campaign.status = (



        CampaignStatus as any



      ).SCHEDULED;



    }







    await campaign.save();







    return {



      success: true,



      id: String(campaign._id),



      scheduledAt: campaign.scheduledAt,



      campaign: this.serialize(campaign),



      message: 'Campaign scheduled.',



    };



  }







  /**



   * Resolve email addresses to Contact ObjectIds.



   */



  private async resolveRecipients(



    emails: string[] | undefined,



    ownerId: Types.ObjectId,



    workspaceId: string,



  ): Promise<Types.ObjectId[]> {



    if (!emails?.length) {



      return [];



    }







    const normalizedEmails = emails



      .filter(Boolean)



      .map((email) =>



        String(email)



          .trim()



          .toLowerCase(),



      );







    if (!normalizedEmails.length) {



      return [];



    }







    const contacts = await this.contacts



      .find({



        email: {



          $in: normalizedEmails,



        },



        ownerId,



        workspaceId,



      })



      .select('_id')



      .lean();







    return contacts.map(



      (contact: any) =>



        contact._id as Types.ObjectId,



    );



  }







  /**



   * Merge legacy array IDs with the composer's



   * single-ID representation.



   */



  private mergeIds(



    values?: string[],



    singleId?: string,



  ): string[] {



    const merged = [



      ...(values || []),



      ...(singleId ? [singleId] : []),



    ]



      .filter(Boolean)



      .map((value) => String(value));







    return [...new Set(merged)];



  }







  /**



   * Normalize Mongo document into the API shape expected



   * by the Fockis marketing frontend.



   */



  private serialize(campaign: any) {



    if (!campaign) {



      return campaign;



    }







    const raw =



      typeof campaign.toObject === 'function'



        ? campaign.toObject()



        : campaign;







    return {



      ...raw,







      id: String(raw._id),







      audienceId:



        raw.audienceId ||



        raw.audienceIds?.[0] ||



        '',







      audienceIds:



        raw.audienceIds || [],







      segmentId:



        raw.segmentId ||



        raw.segmentIds?.[0] ||



        '',







      segmentIds:



        raw.segmentIds || [],







      tagIds:



        raw.tagIds || [],







      fockisFilters:



        raw.fockisFilters || [],







      content:



        raw.content || null,







      html:



        raw.html || '',







      blocks:



        raw.blocks || [],







      recipients:



        raw.recipients || [],







      stats: {



        sent: 0,



        delivered: 0,



        opens: 0,



        clicks: 0,



        bounces: 0,



        unsubscribes: 0,



        ...(raw.stats || {}),



      },



    };



  }



}