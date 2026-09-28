import { Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as fs from 'fs/promises';
import { StorageService } from '../utils/storage.service';
import { CreateDocumentDocument } from '../schemas/create-document.schema';
import { ExportFailedException } from '../constants/errors';
import { TemplateElement } from '../interfaces/editor.interfaces';

/**
 * Renders a Fockis Document's structured content into an exportable file.
 * Kept behind this service (rather than baked into controllers) so the
 * underlying rendering library can be swapped later without touching the
 * rest of the app.
 */
@Injectable()
export class CreateExportService {
  constructor(private readonly storage: StorageService) {}

  async export(document: CreateDocumentDocument, format: 'pdf' | 'docx' | 'png' | 'jpg') {
    switch (format) {
      case 'pdf':
        return this.exportToPdf(document);
      case 'docx':
        return this.exportToDocx(document);
      case 'png':
      case 'jpg':
        return this.exportToRaster(document, format);
      default:
        throw new ExportFailedException(`Unsupported export format: ${format}`);
    }
  }

  private async exportToPdf(document: CreateDocumentDocument) {
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const canvasWidth = 612; // Letter width in points, fallback
      const canvasHeight = 792;
      const page = pdfDoc.addPage([canvasWidth, canvasHeight]);

      const elements: TemplateElement[] = document.content.elements || [];

      for (const el of elements) {
        if (el.type === 'text' || el.type === 'rich_text') {
          const text = this.resolveContent(el, document.content.fields);
          const fontSize = el.style?.fontSize || 12;
          const useFont = el.style?.fontWeight && Number(el.style.fontWeight) >= 600 ? boldFont : font;
          const color = this.hexToRgb(el.style?.color) || rgb(0, 0, 0);

          page.drawText(String(text ?? ''), {
            x: el.position.x,
            y: canvasHeight - el.position.y - fontSize,
            size: fontSize,
            font: useFont,
            color,
            maxWidth: el.position.width,
          });
        }
        // Images/shapes are intentionally skipped in this reference renderer;
        // a production renderer would rasterize the editor canvas (e.g. via
        // a headless browser) and embed that as the PDF page instead.
      }

      const bytes = await pdfDoc.save();
      const output = this.storage.resolveOutputPath('exports', '.pdf');
      await this.storage.ensureSubfolder('exports');
      await fs.writeFile(output.path, bytes);
      return output;
    } catch (err: any) {
      throw new ExportFailedException(`PDF export failed: ${err.message}`);
    }
  }

  private async exportToDocx(document: CreateDocumentDocument) {
    try {
      const { Document, Packer, Paragraph, TextRun } = await import('docx');

      const paragraphs = (document.content.elements || [])
        .filter((el) => el.type === 'text' || el.type === 'rich_text')
        .map(
          (el) =>
            new Paragraph({
              children: [
                new TextRun({
                  text: String(this.resolveContent(el, document.content.fields) ?? ''),
                  bold: Number(el.style?.fontWeight) >= 600,
                  size: (el.style?.fontSize || 12) * 2, // docx uses half-points
                }),
              ],
            }),
        );

      const doc = new Document({ sections: [{ children: paragraphs.length ? paragraphs : [new Paragraph('')] }] });
      const buffer = await Packer.toBuffer(doc);

      const output = this.storage.resolveOutputPath('exports', '.docx');
      await this.storage.ensureSubfolder('exports');
      await fs.writeFile(output.path, buffer);
      return output;
    } catch (err: any) {
      throw new ExportFailedException(
        `DOCX export failed (is the 'docx' package installed?): ${err.message}`,
      );
    }
  }

  private async exportToRaster(document: CreateDocumentDocument, format: 'png' | 'jpg') {
    try {
      const sharp = (await import('sharp')).default;
      const width = 1200;
      const height = 1600;

      const textSvgParts = (document.content.elements || [])
        .filter((el) => el.type === 'text' || el.type === 'rich_text')
        .map((el) => {
          const text = this.escapeXml(String(this.resolveContent(el, document.content.fields) ?? ''));
          const fontSize = el.style?.fontSize || 12;
          const color = el.style?.color || '#000000';
          return `<text x="${el.position.x}" y="${el.position.y + fontSize}" font-size="${fontSize}" fill="${color}">${text}</text>`;
        })
        .join('\n');

      const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        ${textSvgParts}
      </svg>`;

      const output = this.storage.resolveOutputPath('exports', `.${format}`);
      await this.storage.ensureSubfolder('exports');

      let pipeline = sharp(Buffer.from(svg));
      pipeline = format === 'jpg' ? pipeline.jpeg({ quality: 92 }) : pipeline.png();
      await pipeline.toFile(output.path);

      return output;
    } catch (err: any) {
      throw new ExportFailedException(`Image export failed: ${err.message}`);
    }
  }

  private resolveContent(el: TemplateElement, fields: Record<string, any>) {
    if (el.fieldKey && fields[el.fieldKey] !== undefined) return fields[el.fieldKey];
    return el.content;
  }

  private hexToRgb(hex?: string) {
    if (!hex) return null;
    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!match) return null;
    return rgb(parseInt(match[1], 16) / 255, parseInt(match[2], 16) / 255, parseInt(match[3], 16) / 255);
  }

  private escapeXml(str: string) {
    return str.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string));
  }
}
