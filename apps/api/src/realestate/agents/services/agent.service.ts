import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Agent, AgentDocument } from '../schemas/agent.schema';
import { CreateAgentDto } from '../dto/create-agent.dto';
import { UpdateAgentDto } from '../dto/update-agent.dto';

@Injectable()
export class AgentService {
  constructor(
    @InjectModel(Agent.name)
    private readonly agentModel: Model<AgentDocument>,
  ) {}

  async create(createAgentDto: CreateAgentDto) {
    const agent = new this.agentModel(createAgentDto);

    return agent.save();
  }


  async findAll() {
    return this.agentModel
      .find()
      .populate('user')
      .exec();
  }


  async findOne(id: string) {
    const agent = await this.agentModel
      .findById(id)
      .populate('user')
      .exec();

    if (!agent) {
      throw new NotFoundException(
        'Agent not found',
      );
    }

    return agent;
  }


  async update(
    id: string,
    updateAgentDto: UpdateAgentDto,
  ) {
    const agent = await this.agentModel
      .findByIdAndUpdate(
        id,
        updateAgentDto,
        {
          new: true,
        },
      )
      .exec();


    if (!agent) {
      throw new NotFoundException(
        'Agent not found',
      );
    }

    return agent;
  }


  async remove(id: string) {
    const agent = await this.agentModel
      .findByIdAndDelete(id)
      .exec();


    if (!agent) {
      throw new NotFoundException(
        'Agent not found',
      );
    }


    return {
      message: 'Agent deleted successfully',
    };
  }


  async verifyAgent(id: string) {
    return this.agentModel.findByIdAndUpdate(
      id,
      {
        verificationStatus: 'verified',
      },
      {
        new: true,
      },
    );
  }


  async suspendAgent(id: string) {
    return this.agentModel.findByIdAndUpdate(
      id,
      {
        verificationStatus: 'suspended',
      },
      {
        new: true,
      },
    );
  }


  async featureAgent(id: string) {
    return this.agentModel.findByIdAndUpdate(
      id,
      {
        featured: true,
      },
      {
        new: true,
      },
    );
  }
}