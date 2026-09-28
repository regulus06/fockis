import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Repost, RepostSchema } from './repost.schema';
import { RepostsService } from './reposts.service';
import { RepostsController } from './reposts.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Repost.name, schema: RepostSchema },
    ]),
  ],
  controllers: [RepostsController],
  providers: [RepostsService],
})
export class RepostsModule {}