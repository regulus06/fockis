import {

  BadRequestException,

  ForbiddenException,

  Injectable,

  NotFoundException,

} from "@nestjs/common";

import { InjectConnection } from "@nestjs/mongoose";

import { Connection } from "mongoose";

import {

  Collection,

  Document,

  Filter,

  ObjectId,

  UpdateFilter,

} from "mongodb";

import {

  ACTION_PERMISSION,

  AD_ACTIONS,

  CAMPAIGN_ACTIONS,

  DEFAULT_MARKETING_WORKFLOW,

  MARKETING_ADMIN_PERMISSIONS,

  MARKETING_STATUSES,

  MarketingActionName,

  MarketingStatus,

  MarketingWorkflowSettings,

} from "./constants/marketing-admin.constants";

import { MarketingActionDto } from "./dto/marketing-action.dto";

import { MarketingWorkflowDto } from "./dto/marketing-workflow.dto";

/**

 * Raw MongoDB document used by the Marketing Admin control center.

 *

 * This service intentionally uses the native MongoDB driver rather than

 * replacing the existing advertiser-facing marketing services/schemas.

 */

type MarketingDocument = Document & {

  _id: ObjectId;

  id?: string;

  status?: string;

  name?: string;

  title?: string;

  advertiserId?: ObjectId | string;

  advertiserName?: string;

  advertiserTrusted?: boolean;

  campaignId?: ObjectId | string;

  campaignName?: string;

  storeId?: ObjectId | string;

  headline?: string;

  description?: string;

  placement?: string;

  budget?: number;

  dailyBudget?: number;

  totalBudget?: number;

  spent?: number;

  spend?: number;

  impressions?: number;

  clicks?: number;

  conversions?: number;

  createdAt?: Date | string;

  updatedAt?: Date | string;

  isActive?: boolean;

  deliveryBlocked?: boolean;

  marketingApprovalActors?: string[];

  [key: string]: unknown;

};

type MarketingAuditDocument = Document & {

  _id?: ObjectId;

  actorId?: string;

  actorName?: string;

  action?: string;

  resourceType?: string;

  resourceId?: string;

  reason?: string;

  note?: string;

  previousStatus?: string;

  newStatus?: string;

  previousWorkflow?: MarketingWorkflowSettings;

  newWorkflow?: MarketingWorkflowSettings;

  createdAt?: Date;

};

type MarketingWorkflowDocument = Document & {

  _id: ObjectId;

  key: string;

  settings?: Partial<MarketingWorkflowSettings>;

  createdAt?: Date;

  updatedAt?: Date;

};

@Injectable()

export class MarketingAdminService {

  private readonly campaignsName =

    process.env.MARKETING_CAMPAIGNS_COLLECTION || "marketing_campaigns";

  private readonly adsName =

    process.env.MARKETING_ADS_COLLECTION || "marketing_advertisements";

  private readonly auditName =

    process.env.MARKETING_AUDIT_COLLECTION || "marketingauditevents";

  private readonly workflowName =

    process.env.MARKETING_WORKFLOW_COLLECTION ||

    "marketingworkflowsettings";

  constructor(

    @InjectConnection()

    private readonly connection: Connection,

  ) {}

  /**

   * Native MongoDB database.

   *

   * Mongoose Connection.db is used only as the database handle.

   * All ObjectIds below come from the mongodb package.

   */

  private get db() {

    if (!this.connection.db) {

      throw new Error("MongoDB connection is not initialized.");

    }

    return this.connection.db;

  }

  private campaigns(): Collection<MarketingDocument> {

    return this.db.collection<MarketingDocument>(this.campaignsName);

  }

  private ads(): Collection<MarketingDocument> {

    return this.db.collection<MarketingDocument>(this.adsName);

  }

  private audit(): Collection<MarketingAuditDocument> {

    return this.db.collection<MarketingAuditDocument>(this.auditName);

  }

  private workflow(): Collection<MarketingWorkflowDocument> {

    return this.db.collection<MarketingWorkflowDocument>(

      this.workflowName,

    );

  }

  /**

   * Convert an incoming HTTP id into a native MongoDB ObjectId.

   *

   * IMPORTANT:

   * Never return string | ObjectId here.

   *

   * The admin routes require MongoDB ObjectIds and the native MongoDB

   * collection typings expect ObjectId for _id.

   */

  private oid(id: string): ObjectId {

    if (!ObjectId.isValid(id)) {

      throw new BadRequestException("Invalid resource ID.");

    }

    return new ObjectId(id);

  }

  private requireValidId(id: string): void {

    if (!ObjectId.isValid(id)) {

      throw new BadRequestException("Invalid resource ID.");

    }

  }

  private actorId(actor: any): string {

    return String(

      actor?.id ??

        actor?._id ??

        actor?.userId ??

        actor?.sub ??

        "unknown",

    );

  }

  private actorName(actor: any): string | undefined {

    return (

      actor?.name ??

      actor?.email ??

      actor?.username ??

      actor?.displayName

    );

  }

  // ---------------------------------------------------------------------------

  // OVERVIEW

  // ---------------------------------------------------------------------------

  async overview() {

    return {

      success: true,

      service: "marketing-admin",

      status: "READY",

      capabilities: [

        "campaigns",

        "ads",

        "advertisers",

        "audiences",

        "placements",

        "creatives",

        "notifications",

        "promotions",

        "automation",

        "ab-experiments",

        "calendar",

        "analytics",

        "billing",

        "enforcement",

        "audit",

      ],

      workflow: await this.getWorkflow(),

      campaignStatuses: [...MARKETING_STATUSES],

      permissions: Object.values(MARKETING_ADMIN_PERMISSIONS),

    };

  }

  // ---------------------------------------------------------------------------

  // CAMPAIGNS

  // ---------------------------------------------------------------------------

  async listCampaigns(query: {

    status?: string;

    search?: string;

  }) {

    const filter: Filter<MarketingDocument> = {};

    if (query?.status) {

      filter.status = query.status;

    }

    if (query?.search?.trim()) {

      const regex = new RegExp(

        this.escapeRegex(query.search.trim()),

        "i",

      );

      filter.$or = [

        { name: regex },

        { title: regex },

        { advertiserName: regex },

        { advertiserId: regex },

        { headline: regex },

      ];

    }

    const docs = await this.campaigns()

      .find(filter)

      .sort({ updatedAt: -1 })

      .limit(500)

      .toArray();

    return docs.map((doc) => this.campaignView(doc));

  }

  async getCampaign(id: string) {

    this.requireValidId(id);

    const doc = await this.campaigns().findOne({

      _id: this.oid(id),

    });

    if (!doc) {

      throw new NotFoundException("Campaign not found.");

    }

    return this.campaignView(doc);

  }

  // ---------------------------------------------------------------------------

  // ADS

  // ---------------------------------------------------------------------------

  async listAds(query: {

    status?: string;

    search?: string;

  }) {

    const filter: Filter<MarketingDocument> = {};

    if (query?.status) {

      filter.status = query.status;

    }

    if (query?.search?.trim()) {

      const search = query.search.trim();

      const regex = new RegExp(

        this.escapeRegex(search),

        "i",

      );

      const ors: Filter<MarketingDocument>[] = [

        { campaignName: regex },

        { advertiserName: regex },

        { placement: regex },

      ];

      if (ObjectId.isValid(search)) {

        ors.push({

          _id: this.oid(search),

        });

      }

      filter.$or = ors;

    }

    const docs = await this.ads()

      .find(filter)

      .sort({ updatedAt: -1 })

      .limit(500)

      .toArray();

    return docs.map((doc) => this.adView(doc));

  }

  async getAd(id: string) {

    this.requireValidId(id);

    const doc = await this.ads().findOne({

      _id: this.oid(id),

    });

    if (!doc) {

      throw new NotFoundException("Ad not found.");

    }

    return this.adView(doc);

  }

  // ---------------------------------------------------------------------------

  // CAMPAIGN / AD ACTIONS

  // ---------------------------------------------------------------------------

  async action(

    kind: "campaign" | "ad",

    id: string,

    action: MarketingActionName,

    body: MarketingActionDto = {},

    actor: any,

  ) {

    this.requireValidId(id);

    const permission = ACTION_PERMISSION[kind][action];

    this.requirePermission(actor, permission);

    const collection =

      kind === "campaign"

        ? this.campaigns()

        : this.ads();

    const resourceId = this.oid(id);

    const current = await collection.findOne({

      _id: resourceId,

    });

    if (!current) {

      throw new NotFoundException(

        kind === "campaign"

          ? "Campaign not found."

          : "Advertisement not found.",

      );

    }

    const previousStatus =

      String(current.status || "DRAFT") as MarketingStatus;

    const rules =

      kind === "campaign"

        ? CAMPAIGN_ACTIONS[action]

        : AD_ACTIONS[action];

    if (!rules) {

      throw new BadRequestException(

        `Unsupported marketing action: ${action}.`,

      );

    }

    if (

      !(rules.from as readonly string[]).includes(

        previousStatus,

      )

    ) {

      throw new BadRequestException(

        `Action ${action} is not valid when the ${kind} status is ${previousStatus}.`,

      );

    }

    const workflow = await this.getWorkflow();

    let nextStatus = rules.to as MarketingStatus;

    // -----------------------------------------------------------------------

    // APPROVAL WORKFLOW

    // -----------------------------------------------------------------------

    if (action === "APPROVE") {

      const approvalMode =

        kind === "campaign"

          ? workflow.campaignApprovalMode

          : workflow.adApprovalMode;

      const currentApprovers = Array.isArray(

        current.marketingApprovalActors,

      )

        ? current.marketingApprovalActors.map(String)

        : [];

      const currentActor = this.actorId(actor);

      if (

        approvalMode ===

        "REQUIRE_TWO_ADMIN_APPROVALS"

      ) {

        if (!currentApprovers.includes(currentActor)) {

          currentApprovers.push(currentActor);

        }

        if (currentApprovers.length < 2) {

          const approvalUpdate: UpdateFilter<MarketingDocument> =

            {

              $set: {

                marketingApprovalActors:

                  currentApprovers,

                updatedAt: new Date(),

              },

            };

          await collection.updateOne(

            {

              _id: current._id,

              status: previousStatus,

            },

            approvalUpdate,

          );

          await this.writeAudit({

            actor,

            action: "APPROVE_PENDING",

            kind,

            resource: current,

            previousStatus,

            newStatus: previousStatus,

            body,

            note:

              "First approval recorded; a second administrator approval is required.",

          });

          return kind === "campaign"

            ? this.getCampaign(id)

            : this.getAd(id);

        }

      }

      // APPROVE normally becomes APPROVED.

      //

      // AUTO_PUBLISH can instead move it directly to ACTIVE.

      //

      // Trusted advertiser auto-publish is also supported.

      if (

        approvalMode === "AUTO_PUBLISH" ||

        (workflow.autoPublishTrustedAdvertisers === true &&

          current.advertiserTrusted === true)

      ) {

        nextStatus = "ACTIVE";

      }

    }

    // -----------------------------------------------------------------------

    // UNBLOCK

    // -----------------------------------------------------------------------

    /**

     * The supplied transition matrix explicitly requires:

     *

     * BLOCKED -> PAUSED

     *

     * Workflow settings must not override the authoritative transition

     * matrix.

     */

    if (action === "UNBLOCK") {

      nextStatus = "PAUSED";

    }

    // -----------------------------------------------------------------------

    // UPDATE

    // -----------------------------------------------------------------------

    const now = new Date();

    const update: UpdateFilter<MarketingDocument> = {

      $set: {

        status: nextStatus,

        updatedAt: now,

        isActive: nextStatus === "ACTIVE",

      },

      $unset: {

        marketingApprovalActors: "",

      },

    };

    /**

     * Optimistic concurrency check:

     *

     * The update only succeeds if the resource still has the status we read

     * before the action. This prevents two administrators from overwriting

     * each other's state changes.

     */

    const result = await collection.updateOne(

      {

        _id: current._id,

        status: previousStatus,

      },

      update,

    );

    if (result.matchedCount !== 1) {

      throw new BadRequestException(

        "The resource changed before this action could be applied. Refresh and try again.",

      );

    }

    // -----------------------------------------------------------------------

    // CAMPAIGN BLOCK CASCADE

    // -----------------------------------------------------------------------

    if (

      kind === "campaign" &&

      action === "BLOCK"

    ) {

      await this.enforceBlockedCampaign(

        current._id,

        workflow,

        actor,

        body,

      );

    }

    // -----------------------------------------------------------------------

    // AUDIT

    // -----------------------------------------------------------------------

    await this.writeAudit({

      actor,

      action,

      kind,

      resource: current,

      previousStatus,

      newStatus: nextStatus,

      body,

      note:

        action === "BLOCK" &&

        workflow.notifyAdvertiserOnBlock

          ? "Advertiser notification requested by workflow."

          : body?.note,

    });

    return kind === "campaign"

      ? this.getCampaign(id)

      : this.getAd(id);

  }

  // ---------------------------------------------------------------------------

  // CAMPAIGN BLOCK ENFORCEMENT

  // ---------------------------------------------------------------------------

  private async enforceBlockedCampaign(

    campaignId: ObjectId,

    workflow: MarketingWorkflowSettings,

    actor: any,

    body: MarketingActionDto,

  ): Promise<void> {

    if (

      !workflow.blockedCampaignStopsAds &&

      !workflow.blockedCampaignStopsScheduledAds

    ) {

      return;

    }

    const filter: Filter<MarketingDocument> = {

      campaignId,

    };

    if (

      workflow.blockedCampaignStopsScheduledAds &&

      !workflow.blockedCampaignStopsAds

    ) {

      filter.status = "SCHEDULED";

    } else if (

      workflow.blockedCampaignStopsAds

    ) {

      filter.status = {

        $in: [

          "DRAFT",

          "PENDING_REVIEW",

          "APPROVED",

          "SCHEDULED",

          "ACTIVE",

          "PAUSED",

        ],

      };

    }

    const affectedAds = await this.ads()

      .find(filter)

      .toArray();

    if (!affectedAds.length) {

      return;

    }

    const now = new Date();

    await this.ads().updateMany(

      {

        _id: {

          $in: affectedAds.map(

            (ad) => ad._id,

          ),

        },

      },

      {

        $set: {

          status: "BLOCKED",

          deliveryBlocked: true,

          updatedAt: now,

          isActive: false,

        },

      },

    );

    for (const ad of affectedAds) {

      await this.writeAudit({

        actor,

        action: "BLOCK_BY_CAMPAIGN",

        kind: "ad",

        resource: ad,

        previousStatus: String(

          ad.status || "DRAFT",

        ),

        newStatus: "BLOCKED",

        body,

        note:

          "Advertisement blocked because its campaign was blocked by an administrator.",

      });

    }

  }

  // ---------------------------------------------------------------------------

  // WORKFLOW

  // ---------------------------------------------------------------------------

  async updateWorkflow(

    dto: MarketingWorkflowDto,

    actor: any,

  ) {

    this.requirePermission(

      actor,

      MARKETING_ADMIN_PERMISSIONS.WORKFLOW_EDIT,

    );

    const current = await this.getWorkflow();

    const settings: MarketingWorkflowSettings = {

      ...current,

      ...this.pickWorkflowUpdates(dto),

    };

    const now = new Date();

    await this.workflow().updateOne(

      {

        key: "marketing",

      },

      {

        $set: {

          key: "marketing",

          settings,

          updatedAt: now,

        },

        $setOnInsert: {

          createdAt: now,

        },

      },

      {

        upsert: true,

      },

    );

    await this.audit().insertOne({

      actorId: this.actorId(actor),

      actorName: this.actorName(actor),

      action: "SET_WORKFLOW",

      resourceType: "WORKFLOW",

      resourceId: "marketing",

      previousStatus: undefined,

      newStatus: undefined,

      reason: undefined,

      note: "Marketing workflow settings updated.",

      previousWorkflow: current,

      newWorkflow: settings,

      createdAt: now,

    });

    return settings;

  }

  async getWorkflow(): Promise<MarketingWorkflowSettings> {

    const doc = await this.workflow().findOne({

      key: "marketing",

    });

    return {

      ...DEFAULT_MARKETING_WORKFLOW,

      ...(doc?.settings || {}),

    } as MarketingWorkflowSettings;

  }

  // ---------------------------------------------------------------------------

  // PERMISSIONS

  // ---------------------------------------------------------------------------

  async getPermissions() {

    return {

      success: true,

      permissions: Object.values(

        MARKETING_ADMIN_PERMISSIONS,

      ),

    };

  }

  // ---------------------------------------------------------------------------

  // STATUSES

  // ---------------------------------------------------------------------------

  async getStatuses() {

    return {

      success: true,

      statuses: [...MARKETING_STATUSES],

    };

  }

  // ---------------------------------------------------------------------------

  // AUDIT

  // ---------------------------------------------------------------------------

  async getAudit(

    resourceType?: string,

    resourceId?: string,

  ) {

    const query: Filter<MarketingAuditDocument> = {};

    if (resourceType) {

      query.resourceType =

        resourceType.toUpperCase();

    }

    if (resourceId) {

      query.resourceId = resourceId;

    }

    const docs = await this.audit()

      .find(query)

      .sort({ createdAt: -1 })

      .limit(500)

      .toArray();

    return docs.map((doc) => ({

      ...doc,

      id: String(doc._id),

      _id: undefined,

    }));

  }

  // ---------------------------------------------------------------------------

  // PERMISSION ENFORCEMENT

  // ---------------------------------------------------------------------------

  private requirePermission(

    actor: any,

    permission: string,

  ): void {

    const permissions = Array.isArray(

      actor?.permissions,

    )

      ? actor.permissions

      : [];

    const isSuperAdmin =

      actor?.isSuperAdmin === true ||

      actor?.role === "SUPER_ADMIN" ||

      actor?.role === "super_admin" ||

      permissions.includes("*");

    if (isSuperAdmin) {

      return;

    }

    if (!permissions.includes(permission)) {

      throw new ForbiddenException(

        `Missing permission: ${permission}`,

      );

    }

  }

  // ---------------------------------------------------------------------------

  // AUDIT WRITER

  // ---------------------------------------------------------------------------

  private async writeAudit(input: {

    actor: any;

    action: string;

    kind: "campaign" | "ad";

    resource: MarketingDocument;

    previousStatus: string;

    newStatus: string;

    body: MarketingActionDto;

    note?: string;

  }): Promise<void> {

    await this.audit().insertOne({

      actorId: this.actorId(input.actor),

      actorName: this.actorName(input.actor),

      action: input.action,

      resourceType:

        input.kind.toUpperCase(),

      resourceId: String(

        input.resource._id,

      ),

      reason: input.body?.reason,

      note: input.note,

      previousStatus:

        input.previousStatus,

      newStatus:

        input.newStatus,

      createdAt: new Date(),

    });

  }

  // ---------------------------------------------------------------------------

  // FRONTEND CAMPAIGN VIEW

  // ---------------------------------------------------------------------------

  private campaignView(

    x: MarketingDocument,

  ) {

    return {

      id: String(x._id || x.id || ""),

      name:

        x.name ||

        x.title ||

        "Untitled campaign",

      advertiserId:

        x.advertiserId !== undefined

          ? String(x.advertiserId)

          : "",

      advertiserName:

        x.advertiserName ||

        "Unknown advertiser",

      status:

        x.status ||

        "DRAFT",

      budget: Number(

        x.budget ??

          x.totalBudget ??

          0,

      ),

      spent: Number(

        x.spent || 0,

      ),

      impressions: Number(

        x.impressions || 0,

      ),

      clicks: Number(

        x.clicks || 0,

      ),

      conversions: Number(

        x.conversions || 0,

      ),

      createdAt:

        this.iso(x.createdAt),

      updatedAt:

        this.iso(x.updatedAt),

    };

  }

  // ---------------------------------------------------------------------------

  // FRONTEND AD VIEW

  // ---------------------------------------------------------------------------

  private adView(

    x: MarketingDocument,

  ) {

    return {

      id: String(

        x._id || x.id || "",

      ),

      campaignId:

        x.campaignId !== undefined

          ? String(x.campaignId)

          : "",

      campaignName:

        x.campaignName || "",

      advertiserId:

        x.advertiserId !== undefined

          ? String(x.advertiserId)

          : "",

      advertiserName:

        x.advertiserName ||

        "Unknown advertiser",

      status:

        x.status ||

        "DRAFT",

      placement:

        x.placement ||

        "UNKNOWN",

      impressions: Number(

        x.impressions || 0,

      ),

      clicks: Number(

        x.clicks || 0,

      ),

      spend: Number(

        x.spend ??

          x.spent ??

          0,

      ),

      createdAt:

        this.iso(x.createdAt),

      updatedAt:

        this.iso(x.updatedAt),

    };

  }

  // ---------------------------------------------------------------------------

  // DATE

  // ---------------------------------------------------------------------------

  private iso(

    value: unknown,

  ): string {

    if (!value) {

      return new Date().toISOString();

    }

    const date =

      value instanceof Date

        ? value

        : new Date(value as string);

    return Number.isNaN(

      date.getTime(),

    )

      ? new Date().toISOString()

      : date.toISOString();

  }

  // ---------------------------------------------------------------------------

  // REGEX ESCAPING

  // ---------------------------------------------------------------------------

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private pickWorkflowUpdates(

    dto: MarketingWorkflowDto,

  ): Partial<MarketingWorkflowSettings> {

    const allowed: Array<keyof MarketingWorkflowSettings> = [

      "campaignApprovalMode",

      "adApprovalMode",

      "autoPublishTrustedAdvertisers",

      "blockedCampaignStopsAds",

      "blockedCampaignStopsScheduledAds",

      "blockedCampaignStopsNotifications",

      "notifyAdvertiserOnBlock",

      "requireReviewBeforeReactivation",

    ];

    const output: Partial<MarketingWorkflowSettings> = {};

    for (const key of allowed) {

      const value = dto[key];

      if (value !== undefined) {

        (output as Record<string, unknown>)[key] = value;

      }

    }

    return output;

  }

}
