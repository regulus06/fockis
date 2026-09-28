import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import { TranslateDto } from './dto/translate.dto';
import { TranslationService } from './translation.service';

@Controller('translation')
export class TranslationController {
  constructor(
    private readonly translationService: TranslationService,
  ) {}

  @Post()
  async translate(
    @Body() dto: TranslateDto,
  ) {
    return this.translationService.translate(
      dto.text,
      dto.targetLanguage,
      dto.sourceLanguage,
    );
  }
}