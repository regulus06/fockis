import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SessionPolicyController } from './session-policy.controller';
import { SessionPolicyService } from './session-policy.service';
import {
  SessionPolicy,
  SessionPolicySchema,
} from './session-policy.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: SessionPolicy.name,
        schema: SessionPolicySchema,
      },
    ]),
  ],
  controllers: [SessionPolicyController],
  providers: [SessionPolicyService],
  exports: [SessionPolicyService],
})
export class SessionPolicyModule {}
