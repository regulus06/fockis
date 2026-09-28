import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import { OcrFailedException } from '../../constants/errors';
import { OcrProvider, OcrResult } from './ocr-provider.interface';

/**
 * Azure AI Vision "Read" API provider. Requires AZURE_VISION_ENDPOINT and
 * AZURE_VISION_KEY. The Read API is async: submit -> poll operation-location.
 */
@Injectable()
export class AzureOcrProvider implements OcrProvider {
  readonly name = 'azure';
  private readonly logger = new Logger(AzureOcrProvider.name);

  constructor(private readonly config: ConfigService) {}

  async recognize(filePath: string): Promise<OcrResult> {
    const endpoint = this.config.get<string>('AZURE_VISION_ENDPOINT');
    const key = this.config.get<string>('AZURE_VISION_KEY');
    if (!endpoint || !key) {
      throw new OcrFailedException('AZURE_VISION_ENDPOINT / AZURE_VISION_KEY are not configured');
    }

    const buffer = await fs.readFile(filePath);

    const submit = await fetch(`${endpoint.replace(/\/$/, '')}/vision/v3.2/read/analyze`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/octet-stream',
      },
      body: buffer,
    });

    if (submit.status !== 202) {
      const body = await submit.text();
      this.logger.error(`Azure Read submit failed: ${body}`);
      throw new OcrFailedException('Azure Vision OCR submission failed');
    }

    const operationLocation = submit.headers.get('operation-location');
    if (!operationLocation) {
      throw new OcrFailedException('Azure Vision OCR did not return an operation location');
    }

    // Poll for completion (max ~20s)
    let result: any = null;
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise((r) => setTimeout(r, 1000));
      const poll = await fetch(operationLocation, {
        headers: { 'Ocp-Apim-Subscription-Key': key },
      });
      const data: any = await poll.json();
      if (data.status === 'succeeded') {
        result = data;
        break;
      }
      if (data.status === 'failed') {
        throw new OcrFailedException('Azure Vision OCR processing failed');
      }
    }

    if (!result) {
      throw new OcrFailedException('Azure Vision OCR timed out');
    }

    const words: OcrResult['words'] = [];
    const lines: OcrResult['lines'] = [];
    const pages: OcrResult['pages'] = [];

    for (const page of result.analyzeResult?.readResults || []) {
      const pageLines: OcrResult['lines'] = [];
      for (const line of page.lines || []) {
        const lineWords = (line.words || []).map((w: any) => ({
          text: w.text,
          confidence: w.confidence,
        }));
        words.push(...lineWords);
        const lineObj = { text: line.text, boundingBox: undefined };
        pageLines.push(lineObj);
        lines.push(lineObj);
      }
      pages.push({ pageNumber: page.page, text: pageLines.map((l) => l.text).join('\n') });
    }

    const fullText = pages.map((p) => p.text).join('\n');

    return {
      provider: this.name,
      text: fullText,
      confidence: words.length
        ? words.reduce((s, w) => s + (w.confidence || 0), 0) / words.length
        : 0,
      pages,
      blocks: [{ text: fullText, lines }],
      lines,
      words,
    };
  }
}
