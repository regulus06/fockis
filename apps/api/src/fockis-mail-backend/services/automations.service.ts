import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import {
  Model,
  Types,
} from 'mongoose';

import {
  Automation,
  AutomationDocument,
} from '../schemas/automation.schema';

import {
  Journey,
  JourneyDocument,
} from '../schemas/journey.schema';

import {
  CreateAutomationDto,
} from '../dto/fockis-mail.dto';

import {
  AutomationStatus,
  JourneyStatus,
} from '../enums/fockis-mail.enums';

@Injectable()
export class AutomationsService {
  constructor(
    @InjectModel(Automation.name)
    private readonly automationModel:
      Model<AutomationDocument>,

    @InjectModel(Journey.name)
    private readonly journeyModel:
      Model<JourneyDocument>,
  ) {}

  private validateId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        'Invalid automation id',
      );
    }
  }

  private normalizeStatus(
    status?: string,
  ): AutomationStatus | undefined {
    if (
      status === undefined ||
      status === null
    ) {
      return undefined;
    }

    const normalized =
      String(status).toUpperCase();

    const values =
      Object.values(
        AutomationStatus,
      ) as string[];

    if (
      !values.includes(normalized)
    ) {
      throw new BadRequestException(
        `Invalid automation status: ${status}`,
      );
    }

    return normalized as AutomationStatus;
  }

  private countEmailNodes(
    nodes: any[],
  ): number {
    if (!Array.isArray(nodes)) {
      return 0;
    }

    return nodes.filter(
      (node) =>
        node &&
        typeof node === 'object' &&
        (
          String(
            node.kind ??
              node.type ??
              '',
          ).toLowerCase() === 'email' ||
          String(
            node.type ??
              '',
          ).toLowerCase() ===
            'send_email'
        ),
    ).length;
  }

  private serialize(
    automation: any,
  ): Record<string, any> {
    if (!automation) {
      return automation;
    }

    const id = automation._id
      ? String(automation._id)
      : String(automation.id);

    const contacts = Number(
      automation.contacts ??
        automation.enrolled ??
        0,
    );

    const nodes = Array.isArray(
      automation.nodes,
    )
      ? automation.nodes
      : [];

    const emails =
      automation.emails !== undefined
        ? Number(automation.emails)
        : this.countEmailNodes(nodes);

    return {
      id,

      businessId:
        automation.ownerId
          ? String(
              automation.ownerId,
            )
          : '',

      name:
        automation.name,

      trigger:
        automation.trigger,

      status:
        String(
          automation.status ??
            AutomationStatus.DRAFT,
        ).toLowerCase(),

      contacts,

      enrolled: Number(
        automation.enrolled ??
          contacts,
      ),

      emails,

      conversionRate: Number(
        automation.conversionRate ??
          0,
      ),

      revenue: Number(
        automation.revenue ??
          0,
      ),

      nodes,

      edges: Array.isArray(
        automation.edges,
      )
        ? automation.edges
        : [],

      journeyId:
        automation.journeyId
          ? String(
              automation.journeyId,
            )
          : undefined,

      ownerId:
        automation.ownerId
          ? String(
              automation.ownerId,
            )
          : undefined,

      workspaceId:
        automation.workspaceId,

      createdAt:
        automation.createdAt
          ? new Date(
              automation.createdAt,
            ).toISOString()
          : undefined,

      updatedAt:
        automation.updatedAt
          ? new Date(
              automation.updatedAt,
            ).toISOString()
          : new Date().toISOString(),
    };
  }

  async list(
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    const automations =
      await this.automationModel
        .find({
          ownerId,
          workspaceId,
        })
        .sort({
          createdAt: -1,
        })
        .lean();

    return automations.map(
      (automation) =>
        this.serialize(
          automation,
        ),
    );
  }

  async get(
    id: string,
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    this.validateId(id);

    const automation =
      await this.automationModel
        .findOne({
          _id: id,
          ownerId,
          workspaceId,
        })
        .lean();

    if (!automation) {
      throw new NotFoundException(
        'Automation not found',
      );
    }

    return this.serialize(
      automation,
    );
  }

  async create(
    dto: CreateAutomationDto,
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    const status =
      this.normalizeStatus(
        (dto as any).status,
      ) ??
      AutomationStatus.DRAFT;

    const nodes =
      Array.isArray(
        (dto as any).nodes,
      )
        ? (dto as any).nodes
        : [];

    const edges =
      Array.isArray(
        (dto as any).edges,
      )
        ? (dto as any).edges
        : [];

    const contacts = 0;

    const automation =
      await this.automationModel.create({
        name: String(
          dto.name,
        ).trim(),

        trigger: String(
          dto.trigger,
        ).trim(),

        status,

        nodes,

        edges,

        enrolled: contacts,

        contacts,

        emails:
          this.countEmailNodes(
            nodes,
          ),

        conversionRate: 0,

        revenue: 0,

        journeyId:
          (dto as any).journeyId
            ? new Types.ObjectId(
                String(
                  (dto as any)
                    .journeyId,
                ),
              )
            : null,

        ownerId,

        workspaceId,
      });

    return this.serialize(
      automation.toObject(),
    );
  }

  async update(
    id: string,
    dto: Partial<CreateAutomationDto>,
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    this.validateId(id);

    const update: Record<
      string,
      any
    > = {};

    if (
      dto.name !== undefined
    ) {
      const name = String(
        dto.name,
      ).trim();

      if (!name) {
        throw new BadRequestException(
          'Automation name cannot be empty',
        );
      }

      update.name = name;
    }

    if (
      dto.trigger !== undefined
    ) {
      update.trigger =
        String(
          dto.trigger,
        ).trim();
    }

    if (
      (dto as any).status !==
      undefined
    ) {
      update.status =
        this.normalizeStatus(
          (dto as any).status,
        );
    }

    if (
      (dto as any).nodes !==
      undefined
    ) {
      if (
        !Array.isArray(
          (dto as any).nodes,
        )
      ) {
        throw new BadRequestException(
          'Automation nodes must be an array',
        );
      }

      update.nodes =
        (dto as any).nodes;

      update.emails =
        this.countEmailNodes(
          (dto as any).nodes,
        );
    }

    if (
      (dto as any).edges !==
      undefined
    ) {
      if (
        !Array.isArray(
          (dto as any).edges,
        )
      ) {
        throw new BadRequestException(
          'Automation edges must be an array',
        );
      }

      update.edges =
        (dto as any).edges;
    }

    if (
      (dto as any).journeyId !==
      undefined
    ) {
      if (
        (dto as any).journeyId ===
        null
      ) {
        update.journeyId = null;
      } else {
        const journeyId =
          String(
            (dto as any)
              .journeyId,
          );

        if (
          !Types.ObjectId.isValid(
            journeyId,
          )
        ) {
          throw new BadRequestException(
            'Invalid journey id',
          );
        }

        update.journeyId =
          new Types.ObjectId(
            journeyId,
          );
      }
    }

    const automation =
      await this.automationModel
        .findOneAndUpdate(
          {
            _id: id,
            ownerId,
            workspaceId,
          },
          {
            $set: update,
          },
          {
            new: true,
            runValidators: true,
          },
        );

    if (!automation) {
      throw new NotFoundException(
        'Automation not found',
      );
    }

    return this.serialize(
      automation.toObject(),
    );
  }

  async remove(
    id: string,
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    this.validateId(id);

    const automation =
      await this.automationModel
        .findOneAndDelete({
          _id: id,
          ownerId,
          workspaceId,
        });

    if (!automation) {
      throw new NotFoundException(
        'Automation not found',
      );
    }

    return {
      success: true,
      id,
    };
  }

  /**
   * Creates a persistent Journey and Automation
   * from the selected Fockis Mail automation template.
   */
  async createFromTemplate(
    body: {
      templateId?: string;
      name: string;
      trigger: string;
      steps?: any[];
      nodes?: any[];
      edges?: any[];
    },
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    const name = String(
      body.name ?? '',
    ).trim();

    const trigger = String(
      body.trigger ?? '',
    ).trim();

    if (!name) {
      throw new BadRequestException(
        'Automation name is required',
      );
    }

    if (!trigger) {
      throw new BadRequestException(
        'Automation trigger is required',
      );
    }

    const sourceNodes =
      Array.isArray(body.nodes)
        ? body.nodes
        : Array.isArray(body.steps)
          ? body.steps
          : [];

    const nodes = JSON.parse(
      JSON.stringify(
        sourceNodes,
      ),
    );

    const edges = Array.isArray(
      body.edges,
    )
      ? JSON.parse(
          JSON.stringify(
            body.edges,
          ),
        )
      : [];

    const nodeIdMap =
      new Map<string, string>();

    for (const node of nodes) {
      if (
        node &&
        typeof node === 'object' &&
        node.id
      ) {
        const oldId = String(
          node.id,
        );

        const newId =
          new Types.ObjectId().toString();

        nodeIdMap.set(
          oldId,
          newId,
        );

        node.id = newId;
      } else if (
        node &&
        typeof node === 'object'
      ) {
        node.id =
          new Types.ObjectId().toString();
      }
    }

    for (const edge of edges) {
      if (
        edge &&
        typeof edge === 'object'
      ) {
        if (
          edge.source &&
          nodeIdMap.has(
            String(
              edge.source,
            ),
          )
        ) {
          edge.source =
            nodeIdMap.get(
              String(
                edge.source,
              ),
            );
        }

        if (
          edge.target &&
          nodeIdMap.has(
            String(
              edge.target,
            ),
          )
        ) {
          edge.target =
            nodeIdMap.get(
              String(
                edge.target,
              ),
            );
        }
      }
    }

    const journey =
      await this.journeyModel.create({
        name,

        status:
          JourneyStatus.DRAFT,

        nodes,

        edges,

        participants: 0,

        ownerId,

        workspaceId,
      });

    try {
      const emails =
        this.countEmailNodes(
          nodes,
        );

      const automation =
        await this.automationModel.create({
          name,

          trigger,

          status:
            AutomationStatus.DRAFT,

          nodes,

          edges,

          enrolled: 0,

          contacts: 0,

          emails,

          conversionRate: 0,

          revenue: 0,

          journeyId:
            journey._id,

          ownerId,

          workspaceId,
        });

      return {
        automation:
          this.serialize(
            automation.toObject(),
          ),

        journey: {
          id: String(
            journey._id,
          ),

          businessId:
            String(ownerId),

          name:
            journey.name,

          status:
            String(
              journey.status,
            ).toLowerCase(),

          entered: 0,

          completed: 0,

          participants: 0,

          nodes:
            journey.nodes,

          edges:
            journey.edges,

          workspaceId,

          ownerId:
            String(ownerId),

          createdAt:
            journey.createdAt
              ? new Date(
                  journey.createdAt,
                ).toISOString()
              : undefined,

          updatedAt:
            journey.updatedAt
              ? new Date(
                  journey.updatedAt,
                ).toISOString()
              : new Date().toISOString(),
        },
      };
    } catch (error) {
      await this.journeyModel.deleteOne({
        _id: journey._id,
        ownerId,
        workspaceId,
      });

      throw error;
    }
  }

  async duplicate(
    id: string,
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    this.validateId(id);

    const source =
      await this.automationModel
        .findOne({
          _id: id,
          ownerId,
          workspaceId,
        });

    if (!source) {
      throw new NotFoundException(
        'Automation not found',
      );
    }

    const sourceObject =
      source.toObject();

    let newJourneyId:
      | Types.ObjectId
      | null =
      null;

    let journeyCopy:
      | any
      | null =
      null;

    if (
      sourceObject.journeyId
    ) {
      const sourceJourney =
        await this.journeyModel.findOne(
          {
            _id:
              sourceObject.journeyId,
            ownerId,
            workspaceId,
          },
        );

      if (sourceJourney) {
        const nodes =
          Array.isArray(
            sourceJourney.nodes,
          )
            ? JSON.parse(
                JSON.stringify(
                  sourceJourney.nodes,
                ),
              )
            : [];

        const edges =
          Array.isArray(
            sourceJourney.edges,
          )
            ? JSON.parse(
                JSON.stringify(
                  sourceJourney.edges,
                ),
              )
            : [];

        const nodeIdMap =
          new Map<
            string,
            string
          >();

        for (
          const node of nodes
        ) {
          if (
            node &&
            typeof node ===
              'object' &&
            node.id
          ) {
            const oldId =
              String(
                node.id,
              );

            const newId =
              new Types.ObjectId().toString();

            nodeIdMap.set(
              oldId,
              newId,
            );

            node.id = newId;
          }
        }

        for (
          const edge of edges
        ) {
          if (
            edge &&
            typeof edge ===
              'object'
          ) {
            if (
              edge.source &&
              nodeIdMap.has(
                String(
                  edge.source,
                ),
              )
            ) {
              edge.source =
                nodeIdMap.get(
                  String(
                    edge.source,
                  ),
                );
            }

            if (
              edge.target &&
              nodeIdMap.has(
                String(
                  edge.target,
                ),
              )
            ) {
              edge.target =
                nodeIdMap.get(
                  String(
                    edge.target,
                  ),
                );
            }
          }
        }

        const createdJourney =
          await this.journeyModel.create(
            {
              name: `${sourceJourney.name} (copy)`,

              status:
                JourneyStatus.DRAFT,

              nodes,

              edges,

              participants: 0,

              ownerId,

              workspaceId,
            },
          );

        newJourneyId =
          createdJourney._id;

        journeyCopy =
          createdJourney.toObject();
      }
    }

    const automationNodes =
      Array.isArray(
        sourceObject.nodes,
      )
        ? JSON.parse(
            JSON.stringify(
              sourceObject.nodes,
            ),
          )
        : [];

    const automationEdges =
      Array.isArray(
        sourceObject.edges,
      )
        ? JSON.parse(
            JSON.stringify(
              sourceObject.edges,
            ),
          )
        : [];

    const automation =
      await this.automationModel.create(
        {
          name: `${sourceObject.name} (copy)`,

          trigger:
            sourceObject.trigger,

          status:
            AutomationStatus.DRAFT,

          nodes:
            automationNodes,

          edges:
            automationEdges,

          enrolled: 0,

          contacts: 0,

          emails:
            this.countEmailNodes(
              automationNodes,
            ),

          conversionRate: 0,

          revenue: 0,

          journeyId:
            newJourneyId,

          ownerId,

          workspaceId,
        },
      );

    return {
      automation:
        this.serialize(
          automation.toObject(),
        ),

      journey: journeyCopy
        ? {
            id: String(
              journeyCopy._id,
            ),
            businessId:
              String(ownerId),
            name:
              journeyCopy.name,
            status:
              String(
                journeyCopy.status,
              ).toLowerCase(),
            entered:
              Number(
                journeyCopy.participants ??
                  0,
              ),
            completed: 0,
            participants:
              Number(
                journeyCopy.participants ??
                  0,
              ),
            nodes:
              journeyCopy.nodes ??
              [],
            edges:
              journeyCopy.edges ??
              [],
            ownerId:
              String(ownerId),
            workspaceId,
            createdAt:
              journeyCopy.createdAt
                ? new Date(
                    journeyCopy.createdAt,
                  ).toISOString()
                : undefined,
            updatedAt:
              journeyCopy.updatedAt
                ? new Date(
                    journeyCopy.updatedAt,
                  ).toISOString()
                : new Date().toISOString(),
          }
        : undefined,
    };
  }
}