import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import OpenAI from 'openai';
import { createHash } from 'crypto';

import {
  TranslationCache,
  TranslationCacheDocument,
} from './schemas/translation-cache.schema';

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  cached: boolean;
}

interface OpenAITranslationResult {
  sourceLanguage: string;
  translatedText: string;
}

@Injectable()
export class TranslationService {
  private readonly logger =
    new Logger(TranslationService.name);

  private readonly openai: OpenAI | null;

  private readonly model =
    process.env.OPENAI_TRANSLATION_MODEL?.trim() ||
    'gpt-5-mini';

  constructor(
    @InjectModel(TranslationCache.name)
    private readonly translationCacheModel: Model<TranslationCacheDocument>,
  ) {
    const apiKey =
      process.env.OPENAI_API_KEY?.trim() || '';

    const isPlaceholder =
      !apiKey ||
      apiKey === 'your_openai_api_key' ||
      apiKey === 'your-openai-api-key' ||
      apiKey === 'your_api_key' ||
      apiKey.startsWith('your_');

    if (isPlaceholder) {
      this.openai = null;

      this.logger.error(
        'OPENAI_API_KEY is missing or still contains a placeholder. Translation will not work.',
      );
    } else {
      this.openai = new OpenAI({
        apiKey,
      });

      this.logger.log(
        `OpenAI translation service initialized. Model: ${this.model}`,
      );
    }
  }

  async translate(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string,
  ): Promise<TranslationResult> {
    const normalizedText =
      String(text ?? '').trim();

    const normalizedTarget =
      this.normalizeLanguage(targetLanguage);

    const normalizedSource =
      sourceLanguage?.trim()
        ? this.normalizeLanguage(sourceLanguage)
        : 'auto';

    if (!normalizedText) {
      throw new BadRequestException(
        'Text to translate cannot be empty.',
      );
    }

    if (!normalizedTarget) {
      throw new BadRequestException(
        'Target language is required.',
      );
    }

    /*
     * ------------------------------------------------------------
     * NO TRANSLATION NEEDED
     * ------------------------------------------------------------
     */

    if (
      normalizedSource !== 'auto' &&
      normalizedTarget === normalizedSource
    ) {
      return {
        translatedText: normalizedText,
        sourceLanguage: normalizedSource,
        targetLanguage: normalizedTarget,
        cached: false,
      };
    }

    /*
     * ------------------------------------------------------------
     * CACHE
     * ------------------------------------------------------------
     */

    const cacheKey = this.createCacheKey(
      normalizedText,
      normalizedSource,
      normalizedTarget,
    );

    try {
      const cached =
        await this.translationCacheModel
          .findOne({ cacheKey })
          .lean()
          .exec();

      if (cached?.translatedText) {
        return {
          translatedText:
            cached.translatedText,

          sourceLanguage:
            cached.sourceLanguage,

          targetLanguage:
            cached.targetLanguage,

          cached: true,
        };
      }
    } catch (error) {
      /*
       * A cache failure should not prevent translation.
       */

      this.logger.warn(
        `Translation cache lookup failed: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
      );
    }

    /*
     * ------------------------------------------------------------
     * OPENAI CONFIGURATION
     * ------------------------------------------------------------
     */

    if (!this.openai) {
      this.logger.error(
        'Translation requested, but OPENAI_API_KEY is not configured correctly.',
      );

      throw new InternalServerErrorException(
        'Translation service is not configured. Check OPENAI_API_KEY in apps/api/.env.',
      );
    }

    /*
     * ------------------------------------------------------------
     * OPENAI TRANSLATION
     * ------------------------------------------------------------
     */

    try {
      const response =
        await this.openai.responses.create({
          model: this.model,

          store: false,

          instructions: `
You are the Fockis multilingual translation engine.

Translate the supplied user-generated content accurately and naturally.

Rules:

1. Detect the source language when sourceLanguage is "auto".
2. Translate ONLY the supplied text.
3. Preserve the original meaning.
4. Do not add explanations.
5. Do not summarize.
6. Preserve names and usernames.
7. Preserve URLs.
8. Preserve emojis.
9. Preserve hashtags.
10. Preserve numbers.
11. Preserve product names.
12. Preserve song titles.
13. Preserve place names when appropriate.
14. Preserve line breaks when practical.
15. Never invent information.
16. If the source text is already written in the target language, return it unchanged.
17. Support multilingual and mixed-language text.
18. Return exactly the requested JSON structure.

Source language:
${normalizedSource}

Target language:
${normalizedTarget}
          `.trim(),

          input: normalizedText,

          text: {
            format: {
              type: 'json_schema',

              name: 'fockis_translation',

              strict: true,

              schema: {
                type: 'object',

                additionalProperties: false,

                properties: {
                  sourceLanguage: {
                    type: 'string',
                  },

                  translatedText: {
                    type: 'string',
                  },
                },

                required: [
                  'sourceLanguage',
                  'translatedText',
                ],
              },
            },
          },
        });

      /*
       * ----------------------------------------------------------
       * READ RESPONSE
       * ----------------------------------------------------------
       */

      const raw =
        response.output_text?.trim();

      if (!raw) {
        throw new Error(
          'OpenAI returned an empty translation response.',
        );
      }

      let parsed: OpenAITranslationResult;

      try {
        parsed =
          JSON.parse(raw) as OpenAITranslationResult;
      } catch {
        this.logger.error(
          `OpenAI returned invalid JSON: ${raw.substring(
            0,
            500,
          )}`,
        );

        throw new Error(
          'OpenAI returned invalid translation JSON.',
        );
      }

      if (
        !parsed.sourceLanguage?.trim() ||
        !parsed.translatedText?.trim()
      ) {
        throw new Error(
          'OpenAI returned an incomplete translation result.',
        );
      }

      /*
       * ----------------------------------------------------------
       * SAVE TRANSLATION CACHE
       * ----------------------------------------------------------
       */

      try {
        await this.translationCacheModel
          .findOneAndUpdate(
            { cacheKey },

            {
              $set: {
                cacheKey,

                sourceText:
                  normalizedText,

                sourceLanguage:
                  parsed.sourceLanguage,

                targetLanguage:
                  normalizedTarget,

                translatedText:
                  parsed.translatedText,

                provider: 'openai',

                model: this.model,
              },
            },

            {
              upsert: true,

              returnDocument: 'after',
            },
          )
          .exec();
      } catch (error) {
        /*
         * Cache failure should not make an otherwise successful
         * translation fail.
         */

        this.logger.warn(
          `Translation cache save failed: ${
            error instanceof Error
              ? error.message
              : String(error)
          }`,
        );
      }

      /*
       * ----------------------------------------------------------
       * RETURN RESULT
       * ----------------------------------------------------------
       */

      return {
        translatedText:
          parsed.translatedText,

        sourceLanguage:
          parsed.sourceLanguage,

        targetLanguage:
          normalizedTarget,

        cached: false,
      };
    } catch (error: any) {
      const status =
        error?.status ??
        error?.statusCode ??
        error?.response?.status;

      const message =
        error?.message ||
        error?.response?.data?.error?.message ||
        'Unknown translation provider error.';

      /*
       * IMPORTANT:
       * Never log the API key itself.
       */

      this.logger.error(
        `Translation request failed. ` +
        `status=${status ?? 'unknown'} ` +
        `model=${this.model} ` +
        `message=${message}`,
      );

      /*
       * ----------------------------------------------------------
       * INVALID API KEY
       * ----------------------------------------------------------
       */

      if (
        status === 401 ||
        /incorrect api key/i.test(message) ||
        /invalid api key/i.test(message) ||
        /authentication/i.test(message)
      ) {
        throw new InternalServerErrorException(
          'OpenAI API authentication failed. Check OPENAI_API_KEY in apps/api/.env.',
        );
      }

      /*
       * ----------------------------------------------------------
       * MODEL ERROR
       * ----------------------------------------------------------
       */

      if (
        status === 404 ||
        (
          /model/i.test(message) &&
          (
            /not found/i.test(message) ||
            /does not exist/i.test(message) ||
            /invalid/i.test(message)
          )
        )
      ) {
        throw new InternalServerErrorException(
          `OpenAI translation model "${this.model}" is unavailable.`,
        );
      }

      /*
       * ----------------------------------------------------------
       * RATE LIMIT
       * ----------------------------------------------------------
       */

      if (
        status === 429 ||
        /rate limit/i.test(message) ||
        /quota/i.test(message)
      ) {
        throw new InternalServerErrorException(
          'OpenAI translation rate limit or quota was reached.',
        );
      }

      /*
       * ----------------------------------------------------------
       * GENERAL FAILURE
       * ----------------------------------------------------------
       */

      throw new InternalServerErrorException(
        'Unable to translate this content right now.',
      );
    }
  }

  private normalizeLanguage(
    language: string,
  ): string {
    return String(language ?? '')
      .trim()
      .replace(/_/g, '-');
  }

  private createCacheKey(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
  ): string {
    return createHash('sha256')
      .update(
        JSON.stringify({
          text,
          sourceLanguage,
          targetLanguage,
        }),
      )
      .digest('hex');
  }
}