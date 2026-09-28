import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import { OcrFailedException } from '../../constants/errors';
import { OcrProvider, OcrResult, OcrRunOptions } from './ocr-provider.interface';

const execAsync = promisify(exec);

/**
 * Local OCR provider backed by the Tesseract OCR CLI (`tesseract-ocr`
 * apt package). No external API keys required — good default / dev
 * provider. Requires the `tesseract` binary to be installed on the host.
 *
 * For handwriting, Tesseract's accuracy is limited; this provider still
 * runs it (with the handwriting-oriented LSTM engine mode) but callers
 * should prefer a cloud provider for production handwriting recognition.
 */
@Injectable()
export class LocalOcrProvider implements OcrProvider {
  readonly name = 'local';
  private readonly logger = new Logger(LocalOcrProvider.name);

  async recognize(filePath: string, options?: OcrRunOptions): Promise<OcrResult> {
    const lang = options?.language || 'eng';
    const outBase = `${filePath}.ocr`;
    // --psm 6: assume a uniform block of text; --oem 1: LSTM engine (best for handwriting-ish input)
    const cmd = `tesseract "${filePath}" "${outBase}" -l ${lang} --oem 1 --psm 6 tsv`;

    try {
      await execAsync(cmd, { timeout: 60_000 });
      const tsv = await fs.readFile(`${outBase}.tsv`, 'utf-8');
      return this.parseTsv(tsv);
    } catch (err: any) {
      this.logger.error(`Tesseract OCR failed: ${err.message}`);
      throw new OcrFailedException(
        'Local OCR engine (tesseract) is unavailable or failed. Install tesseract-ocr, ' +
          'or set OCR_PROVIDER=google|azure with valid credentials.',
      );
    } finally {
      await fs.unlink(`${outBase}.tsv`).catch(() => undefined);
    }
  }

  /** Parses tesseract's TSV output into structured words/lines/blocks. */
  private parseTsv(tsv: string): OcrResult {
    const rows = tsv
      .trim()
      .split('\n')
      .slice(1)
      .map((line) => line.split('\t'));

    const words: OcrResult['words'] = [];
    const lineMap = new Map<string, { text: string[]; conf: number[] }>();
    let confSum = 0;
    let confCount = 0;

    for (const row of rows) {
      if (row.length < 12) continue;
      const [, , , , , lineNum, , , left, top, width, height, conf, text] = row as any;
      if (!text || text.trim() === '') continue;

      const confidence = parseFloat(conf);
      if (!isNaN(confidence) && confidence >= 0) {
        confSum += confidence;
        confCount += 1;
      }

      words.push({
        text,
        confidence: isNaN(confidence) ? undefined : confidence / 100,
        boundingBox: {
          x: Number(left) || 0,
          y: Number(top) || 0,
          width: Number(width) || 0,
          height: Number(height) || 0,
        },
      });

      const key = lineNum;
      if (!lineMap.has(key)) lineMap.set(key, { text: [], conf: [] });
      lineMap.get(key)!.text.push(text);
      if (!isNaN(confidence)) lineMap.get(key)!.conf.push(confidence);
    }

    const lines = Array.from(lineMap.values()).map((l) => ({
      text: l.text.join(' '),
      confidence: l.conf.length ? l.conf.reduce((a, b) => a + b, 0) / l.conf.length / 100 : undefined,
    }));

    const fullText = lines.map((l) => l.text).join('\n');

    return {
      provider: this.name,
      text: fullText,
      confidence: confCount ? confSum / confCount / 100 : 0,
      pages: [{ pageNumber: 1, text: fullText, blocks: [{ text: fullText, lines }] }],
      blocks: [{ text: fullText, lines }],
      lines,
      words,
    };
  }
}
