import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Agent, AgentSchema } from './schemas/agent.schema';
import { AgentService } from './services/agent.service';
import { AgentController } from './controllers/agent.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Agent.name,
        schema: AgentSchema,
      },
    ]),
  ],
  controllers: [
    AgentController,
  ],
  providers: [
    AgentService,
  ],
  exports: [
    AgentService,
  ],
})
export class AgentsModule {}