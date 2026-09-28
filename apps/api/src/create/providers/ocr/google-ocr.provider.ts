import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import { GoogleAuth } from 'google-auth-library';

import { OcrFailedException } from '../../constants/errors';
import {
  OcrProvider,
  OcrResult,
  OcrRunOptions,
} from './ocr-provider.interface';

@Injectable()
export class GoogleOcrProvider implements OcrProvider {
  readonly name = 'google';

  private readonly logger = new Logger(GoogleOcrProvider.name);

  private readonly visionUrl =
    'https://vision.googleapis.com/v1/images:annotate';

  private readonly auth: GoogleAuth;

  constructor(private readonly config: ConfigService) {
    const credentialsPath = this.config.get<string>(
      'GOOGLE_APPLICATION_CREDENTIALS',
    );

    this.auth = new GoogleAuth({
      ...(credentialsPath
        ? {
            keyFile: credentialsPath,
          }
        : {}),
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
  }

  async recognize(
    filePath: string,
    options?: OcrRunOptions,
  ): Promise<OcrResult> {
    try {
      const imageBuffer = await fs.readFile(filePath);
      const base64Image = imageBuffer.toString('base64');

      const client = await this.auth.getClient();

      const accessTokenResponse = await client.getAccessToken();

      const accessToken =
        typeof accessTokenResponse === 'string'
          ? accessTokenResponse
          : accessTokenResponse?.token;

      if (!accessToken) {
        throw new OcrFailedException(
          'Google Vision authentication failed: no access token was returned.',
        );
      }

      /*
       * DOCUMENT_TEXT_DETECTION is designed for dense document text.
       *
       * For handwriting, we still use the same Vision OCR endpoint but
       * preserve the handwriting option in our provider contract so the
       * rest of Fockis can distinguish handwriting jobs.
       */
      const featureType =
        options?.handwriting === true
          ? 'DOCUMENT_TEXT_DETECTION'
          : 'DOCUMENT_TEXT_DETECTION';

      const response = await fetch(this.visionUrl, {
        method: 'POST',

        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Image,
              },

              features: [
                {
                  type: featureType,
                },
              ],
            },
          ],
        }),
      });

      const responseText = await response.text();

      if (!response.ok) {
        this.logger.error(
          `Google Vision HTTP ${response.status}: ${responseText}`,
        );

        throw new OcrFailedException(
          `Google Vision OCR request failed with HTTP ${response.status}.`,
        );
      }

      let data: any;

      try {
        data = JSON.parse(responseText);
      } catch {
        this.logger.error(
          'Google Vision returned an invalid JSON response.',
        );

        throw new OcrFailedException(
          'Google Vision returned an invalid response.',
        );
      }

      const visionResponse = data?.responses?.[0];

      if (!visionResponse) {
        throw new OcrFailedException(
          'Google Vision returned an empty response.',
        );
      }

      if (visionResponse.error) {
        this.logger.error(
          `Google Vision API error: ${JSON.stringify(
            visionResponse.error,
          )}`,
        );

        throw new OcrFailedException(
          visionResponse.error.message ||
            'Google Vision OCR processing failed.',
        );
      }

      const annotation =
        visionResponse.fullTextAnnotation;

      /*
       * No text detected is a valid OCR result.
       */
      if (!annotation) {
        return {
          provider: this.name,
          text: '',
          confidence: 0,
          pages: [],
          blocks: [],
          lines: [],
          words: [],
        };
      }

      const words: OcrResult['words'] = [];
      const lines: OcrResult['lines'] = [];
      const blocks: OcrResult['blocks'] = [];
      const pages: OcrResult['pages'] = [];

      /*
       * Google Vision returns:
       *
       * page
       *   block
       *     paragraph
       *       word
       *         symbol
       *
       * We convert that structure into Fockis' provider-independent
       * OcrResult format.
       */
      for (
        const page of annotation.pages || []
      ) {
        const pageBlocks: OcrResult['blocks'] = [];
        const pageTextParts: string[] = [];

        for (
          const block of page.blocks || []
        ) {
          const blockLines: OcrResult['lines'] = [];

          for (
            const paragraph of block.paragraphs || []
          ) {
            const lineWords: string[] = [];
            const paragraphWords: OcrResult['words'] = [];

            for (
              const word of paragraph.words || []
            ) {
              const text = (word.symbols || [])
                .map((symbol: any) => symbol.text || '')
                .join('');

              if (!text) {
                continue;
              }

              lineWords.push(text);

              const boundingBox =
                this.convertBoundingBox(
                  word.boundingBox,
                );

              const wordResult = {
                text,
                confidence:
                  typeof word.confidence === 'number'
                    ? word.confidence
                    : undefined,
                ...(boundingBox
                  ? { boundingBox }
                  : {}),
              };

              words.push(wordResult);
              paragraphWords.push(wordResult);
            }

            const lineText =
              lineWords.join(' ').trim();

            if (!lineText) {
              continue;
            }

            const line = {
              text: lineText,
              confidence:
                typeof paragraph.confidence === 'number'
                  ? paragraph.confidence
                  : undefined,
              ...(paragraph.boundingBox
                ? {
                    boundingBox:
                      this.convertBoundingBox(
                        paragraph.boundingBox,
                      ),
                  }
                : {}),
              words: paragraphWords,
            };

            blockLines.push(line);
            lines.push(line);
            pageTextParts.push(lineText);
          }

          const blockText = blockLines
            .map((line) => line.text)
            .join('\n');

          const blockResult = {
            text: blockText,
            confidence:
              typeof block.confidence === 'number'
                ? block.confidence
                : undefined,
            lines: blockLines,
            ...(block.boundingBox
              ? {
                  boundingBox:
                    this.convertBoundingBox(
                      block.boundingBox,
                    ),
                }
              : {}),
          };

          blocks.push(blockResult);
          pageBlocks.push(blockResult);
        }

        pages.push({
          pageNumber:
            typeof page.pageNumber === 'number'
              ? page.pageNumber
              : pages.length + 1,

          text: pageTextParts.join('\n'),

          blocks: pageBlocks,
        });
      }

      const fullText =
        annotation.text ||
        pages
          .map((page) => page.text)
          .filter(Boolean)
          .join('\n');

      const confidenceValues: number[] = [];

      for (const word of words) {
        if (
          typeof word.confidence === 'number'
        ) {
          confidenceValues.push(
            word.confidence,
          );
        }
      }

      for (const line of lines) {
        if (
          typeof line.confidence === 'number'
        ) {
          confidenceValues.push(
            line.confidence,
          );
        }
      }

      const confidence =
        confidenceValues.length > 0
          ? confidenceValues.reduce(
              (sum, value) => sum + value,
              0,
            ) / confidenceValues.length
          : 0;

      return {
        provider: options?.handwriting
          ? 'google-handwriting'
          : this.name,

        text: fullText,

        confidence,

        pages,

        blocks,

        lines,

        words,
      };
    } catch (err: any) {
      if (err instanceof OcrFailedException) {
        throw err;
      }

      this.logger.error(
        `Google Vision OCR failed: ${
          err?.message || String(err)
        }`,
      );

      throw new OcrFailedException(
        err?.message ||
          'Google Vision OCR processing failed.',
      );
    }
  }

  private convertBoundingBox(
    boundingBox: any,
  ):
    | {
        x: number;
        y: number;
        width: number;
        height: number;
      }
    | undefined {
    const vertices =
      boundingBox?.vertices;

    if (
      !Array.isArray(vertices) ||
      vertices.length === 0
    ) {
      return undefined;
    }

    const xs = vertices.map(
      (vertex: any) =>
        Number(vertex?.x || 0),
    );

    const ys = vertices.map(
      (vertex: any) =>
        Number(vertex?.y || 0),
    );

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      x: minX,
      y: minY,
      width: Math.max(0, maxX - minX),
      height: Math.max(0, maxY - minY),
    };
  }
}