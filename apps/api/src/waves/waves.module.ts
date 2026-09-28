import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WavesController } from './waves.controller';
import { WavesService } from './waves.service';
import { Wave, WaveSchema } from './schemas/waves.schema';
import { PostsModule } from '../posts/posts.module';

@Module({
  imports: [
    PostsModule,
    MongooseModule.forFeature([
      {
        name: Wave.name,
        schema: WaveSchema,
      },
    ]),
  ],
  controllers: [WavesController],
  providers: [WavesService],
  exports: [WavesService],
})
export class WavesModule {}