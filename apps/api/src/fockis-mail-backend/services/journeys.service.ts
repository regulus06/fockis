import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Journey,
  JourneyDocument,
} from '../schemas/journey.schema';

import {
  CreateJourneyDto,
} from '../dto/fockis-mail.dto';

import {
  JourneyStatus,
} from '../enums/fockis-mail.enums';

@Injectable()
export class JourneysService {
  constructor(
    @InjectModel(Journey.name)
    private readonly model: Model<JourneyDocument>,
  ) {}

  private validateId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid journey id');
    }
  }

  private normalizeStatus(
    status?: string,
  ): JourneyStatus | undefined {
    if (status === undefined || status === null) {
      return undefined;
    }

    const normalized = String(status).toUpperCase();

    const values = Object.values(JourneyStatus) as string[];

    if (!values.includes(normalized)) {
      throw new BadRequestException(
        `Invalid journey status: ${status}`,
      );
    }

    return normalized as JourneyStatus;
  }

  private serialize(
    journey: any,
  ): Record<string, any> {
    if (!journey) {
      return journey;
    }

    const id = journey._id
      ? String(journey._id)
      : String(journey.id);

    const participants = Number(
      journey.participants ?? 0,
    );

    const nodes = Array.isArray(journey.nodes)
      ? journey.nodes
      : [];

    const edges = Array.isArray(journey.edges)
      ? journey.edges
      : [];

    return {
      id,

      businessId: journey.ownerId
        ? String(journey.ownerId)
        : '',

      name: journey.name,

      status: String(
        journey.status ?? JourneyStatus.DRAFT,
      ).toLowerCase(),

      entered: participants,

      completed: Number(
        journey.completed ?? 0,
      ),

      participants,

      nodes,

      edges,

      ownerId: journey.ownerId
        ? String(journey.ownerId)
        : undefined,

      workspaceId: journey.workspaceId,

      createdAt: journey.createdAt
        ? new Date(journey.createdAt).toISOString()
        : undefined,

      updatedAt: journey.updatedAt
        ? new Date(journey.updatedAt).toISOString()
        : new Date().toISOString(),
    };
  }

  async list(
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    const journeys = await this.model
      .find({
        ownerId,
        workspaceId,
      })
      .sort({
        createdAt: -1,
      })
      .lean();

    return journeys.map((journey) =>
      this.serialize(journey),
    );
  }

  async get(
    id: string,
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    this.validateId(id);

    const journey = await this.model
      .findOne({
        _id: id,
        ownerId,
        workspaceId,
      })
      .lean();

    if (!journey) {
      throw new NotFoundException(
        'Journey not found',
      );
    }

    return this.serialize(journey);
  }

  async create(
    dto: CreateJourneyDto,
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    const status =
      this.normalizeStatus(
        (dto as any).status,
      ) ?? JourneyStatus.DRAFT;

    const journey =
      await this.model.create({
        name: String(dto.name).trim(),

        status,

        nodes: Array.isArray(
          (dto as any).nodes,
        )
          ? (dto as any).nodes
          : [],

        edges: Array.isArray(
          (dto as any).edges,
        )
          ? (dto as any).edges
          : [],

        participants: 0,

        ownerId,

        workspaceId,
      });

    return this.serialize(
      journey.toObject(),
    );
  }

  async update(
    id: string,
    dto: Partial<CreateJourneyDto>,
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    this.validateId(id);

    const update: Record<string, any> = {};

    if (
      dto.name !== undefined
    ) {
      const name = String(dto.name).trim();

      if (!name) {
        throw new BadRequestException(
          'Journey name cannot be empty',
        );
      }

      update.name = name;
    }

    if (
      (dto as any).status !== undefined
    ) {
      update.status =
        this.normalizeStatus(
          (dto as any).status,
        );
    }

    if (
      (dto as any).nodes !== undefined
    ) {
      if (
        !Array.isArray(
          (dto as any).nodes,
        )
      ) {
        throw new BadRequestException(
          'Journey nodes must be an array',
        );
      }

      update.nodes = (
        dto as any
      ).nodes;
    }

    if (
      (dto as any).edges !== undefined
    ) {
      if (
        !Array.isArray(
          (dto as any).edges,
        )
      ) {
        throw new BadRequestException(
          'Journey edges must be an array',
        );
      }

      update.edges = (
        dto as any
      ).edges;
    }

    const journey =
      await this.model.findOneAndUpdate(
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

    if (!journey) {
      throw new NotFoundException(
        'Journey not found',
      );
    }

    return this.serialize(
      journey.toObject(),
    );
  }

  async remove(
    id: string,
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    this.validateId(id);

    const journey =
      await this.model.findOneAndDelete({
        _id: id,
        ownerId,
        workspaceId,
      });

    if (!journey) {
      throw new NotFoundException(
        'Journey not found',
      );
    }

    return {
      success: true,
      id,
    };
  }

  /**
   * Creates a copy of an existing journey.
   *
   * IDs inside nodes are regenerated where possible so
   * the duplicated journey does not share workflow-node IDs
   * with the original.
   */
  async duplicate(
    id: string,
    ownerId: Types.ObjectId,
    workspaceId: string,
    name?: string,
  ) {
    this.validateId(id);

    const source =
      await this.model.findOne({
        _id: id,
        ownerId,
        workspaceId,
      });

    if (!source) {
      throw new NotFoundException(
        'Journey not found',
      );
    }

    const sourceObject =
      source.toObject();

    const nodes = Array.isArray(
      sourceObject.nodes,
    )
      ? JSON.parse(
          JSON.stringify(
            sourceObject.nodes,
          ),
        )
      : [];

    const edges = Array.isArray(
      sourceObject.edges,
    )
      ? JSON.parse(
          JSON.stringify(
            sourceObject.edges,
          ),
        )
      : [];

    const idMap = new Map<
      string,
      string
    >();

    for (const node of nodes) {
      if (
        node &&
        typeof node === 'object' &&
        node.id
      ) {
        const oldId = String(node.id);

        const newId =
          new Types.ObjectId().toString();

        idMap.set(
          oldId,
          newId,
        );

        node.id = newId;
      }
    }

    for (const edge of edges) {
      if (
        edge &&
        typeof edge === 'object'
      ) {
        if (
          edge.source &&
          idMap.has(
            String(edge.source),
          )
        ) {
          edge.source =
            idMap.get(
              String(edge.source),
            );
        }

        if (
          edge.target &&
          idMap.has(
            String(edge.target),
          )
        ) {
          edge.target =
            idMap.get(
              String(edge.target),
            );
        }
      }
    }

    const duplicate =
      await this.model.create({
        name:
          name?.trim() ||
          `${sourceObject.name} (copy)`,

        status:
          JourneyStatus.DRAFT,

        nodes,

        edges,

        participants: 0,

        ownerId,

        workspaceId,
      });

    return this.serialize(
      duplicate.toObject(),
    );
  }
}