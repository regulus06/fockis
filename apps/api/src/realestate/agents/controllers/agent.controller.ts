import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';

import { AgentService } from '../services/agent.service';
import { CreateAgentDto } from '../dto/create-agent.dto';
import { UpdateAgentDto } from '../dto/update-agent.dto';

@Controller('realestate/agents')
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
  ) {}


  @Post()
  create(
    @Body() createAgentDto: CreateAgentDto,
  ) {
    return this.agentService.create(
      createAgentDto,
    );
  }


  @Get()
  findAll() {
    return this.agentService.findAll();
  }


  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.agentService.findOne(id);
  }


  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAgentDto: UpdateAgentDto,
  ) {
    return this.agentService.update(
      id,
      updateAgentDto,
    );
  }


  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.agentService.remove(id);
  }


  @Post(':id/verify')
  verify(
    @Param('id') id: string,
  ) {
    return this.agentService.verifyAgent(id);
  }


  @Post(':id/suspend')
  suspend(
    @Param('id') id: string,
  ) {
    return this.agentService.suspendAgent(id);
  }


  @Post(':id/feature')
  feature(
    @Param('id') id: string,
  ) {
    return this.agentService.featureAgent(id);
  }
}