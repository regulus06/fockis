import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
} from 'pdf-lib';

import { CreateDocumentService } from './create-document.service';

import * as fs from 'fs/promises';
import * as path from 'path';


@Injectable()
export class CreatePdfService {
  constructor(
    private readonly config: ConfigService,
    private readonly documentService: CreateDocumentService,
  ) {}


  /* ==========================================================================
     DOCUMENT -> PDF
  ========================================================================== */

  /**
   * Generate a PDF from a Fockis Create document.
   */
  async generateFromDocument(
    documentId: string,
    userId: string,
  ): Promise<Buffer> {
    const document =
      await this.documentService.getById(
        documentId,
        userId,
      );

    return this.generateFromContent(
      document,
    );
  }


  /**
   * Generate a PDF directly from document data.
   */
  async generateFromContent(
    document: any,
  ): Promise<Buffer> {
    try {
      const pdf =
        await PDFDocument.create();

      let page =
        pdf.addPage([
          612,
          792,
        ]);

      const font =
        await pdf.embedFont(
          StandardFonts.Helvetica,
        );

      const boldFont =
        await pdf.embedFont(
          StandardFonts.HelveticaBold,
        );

      const margin = 50;

      const pageWidth =
        page.getWidth();

      const pageHeight =
        page.getHeight();

      const content =
        document?.content || {};

      const fields =
        content.fields || {};

      const elements =
        Array.isArray(
          content.elements,
        )
          ? content.elements
          : [];

      const title =
        document?.title ||
        'Fockis Document';

      page.drawText(
        String(title),
        {
          x: margin,
          y:
            pageHeight -
            margin,
          size: 20,
          font: boldFont,
          color: rgb(
            0.1,
            0.1,
            0.1,
          ),
        },
      );

      let currentY =
        pageHeight -
        margin -
        40;


      /* ----------------------------------------------------------------------
         FIELDS
      ---------------------------------------------------------------------- */

      for (
        const [key, value]
        of Object.entries(fields)
      ) {
        const text =
          this.stringifyValue(
            value,
          );

        if (!text) {
          continue;
        }

        if (
          currentY <
          margin + 40
        ) {
          page =
            pdf.addPage([
              pageWidth,
              pageHeight,
            ]);

          currentY =
            pageHeight -
            margin;
        }

        page.drawText(
          `${this.formatLabel(key)}:`,
          {
            x: margin,
            y: currentY,
            size: 10,
            font: boldFont,
            color: rgb(
              0.15,
              0.15,
              0.15,
            ),
          },
        );

        currentY -= 16;

        currentY =
          this.drawWrappedText(
            page,
            text,
            font,
            margin,
            currentY,
            pageWidth -
              margin * 2,
            11,
          );

        currentY -= 12;
      }


      /* ----------------------------------------------------------------------
         ELEMENTS
      ---------------------------------------------------------------------- */

      for (
        const element
        of elements
      ) {
        if (
          !element ||
          typeof element !==
            'object'
        ) {
          continue;
        }

        const elementType =
          element.type;


        // Text-like elements
        if (
          elementType === 'text' ||
          elementType === 'heading' ||
          elementType === 'paragraph' ||
          elementType === 'label'
        ) {
          const text =
            this.stringifyValue(
              element.content,
            );

          if (!text) {
            continue;
          }

          if (
            currentY <
            margin + 40
          ) {
            page =
              pdf.addPage([
                pageWidth,
                pageHeight,
              ]);

            currentY =
              pageHeight -
              margin;
          }

          const fontSize =
            Number(
              element?.style
                ?.fontSize,
            ) || 11;

          const isHeading =
            elementType ===
            'heading';

          currentY =
            this.drawWrappedText(
              page,
              text,
              isHeading
                ? boldFont
                : font,
              margin,
              currentY,
              pageWidth -
                margin * 2,
              fontSize,
            );

          currentY -=
            isHeading
              ? 16
              : 10;

          continue;
        }


        // Field-backed elements
        if (
          element.fieldKey
        ) {
          const value =
            fields[
              element.fieldKey
            ];

          const text =
            this.stringifyValue(
              value,
            );

          if (!text) {
            continue;
          }

          if (
            currentY <
            margin + 40
          ) {
            page =
              pdf.addPage([
                pageWidth,
                pageHeight,
              ]);

            currentY =
              pageHeight -
              margin;
          }

          currentY =
            this.drawWrappedText(
              page,
              text,
              font,
              margin,
              currentY,
              pageWidth -
                margin * 2,
              11,
            );

          currentY -= 10;
        }
      }


      /* ----------------------------------------------------------------------
         FOOTER
      ---------------------------------------------------------------------- */

      const pages =
        pdf.getPages();

      pages.forEach(
        (
          pdfPage,
          index,
        ) => {
          pdfPage.drawText(
            `Fockis Create • Page ${
              index + 1
            } of ${pages.length}`,
            {
              x: margin,
              y: 25,
              size: 8,
              font,
              color: rgb(
                0.45,
                0.45,
                0.45,
              ),
            },
          );
        },
      );

      return Buffer.from(
        await pdf.save(),
      );
    } catch (error) {
      console.error(
        'CreatePdfService error:',
        error,
      );

      throw new InternalServerErrorException(
        'Failed to generate PDF',
      );
    }
  }


  /* ==========================================================================
     PDF PAGE COUNT
  ========================================================================== */

  async getPageCount(
    pdfPath: string,
  ): Promise<number> {
    try {
      const bytes =
        await fs.readFile(
          pdfPath,
        );

      const pdf =
        await PDFDocument.load(
          bytes,
        );

      return pdf.getPageCount();
    } catch (error) {
      console.error(
        'getPageCount error:',
        error,
      );

      throw new InternalServerErrorException(
        'Failed to read PDF page count',
      );
    }
  }


  /* ==========================================================================
     CREATE PDF FROM IMAGES
  ========================================================================== */

  async createFromImages(
    imagePaths: string[],
  ): Promise<{
    path: string;
    url: string;
  }> {
    try {
      if (
        !imagePaths.length
      ) {
        throw new Error(
          'No images were provided',
        );
      }

      const pdf =
        await PDFDocument.create();

      for (
        const imagePath
        of imagePaths
      ) {
        const imageBytes =
          await fs.readFile(
            imagePath,
          );

        const extension =
          path
            .extname(imagePath)
            .toLowerCase();

        let image;

        if (
          extension === '.jpg' ||
          extension === '.jpeg'
        ) {
          image =
            await pdf.embedJpg(
              imageBytes,
            );
        } else if (
          extension === '.png'
        ) {
          image =
            await pdf.embedPng(
              imageBytes,
            );
        } else {
          throw new Error(
            `Unsupported image format: ${extension}`,
          );
        }

        const imageWidth =
          image.width;

        const imageHeight =
          image.height;

        const maxWidth = 595;
        const maxHeight = 842;

        const scale =
          Math.min(
            maxWidth /
              imageWidth,
            maxHeight /
              imageHeight,
            1,
          );

        const width =
          imageWidth * scale;

        const height =
          imageHeight * scale;

        const page =
          pdf.addPage([
            width,
            height,
          ]);

        page.drawImage(
          image,
          {
            x: 0,
            y: 0,
            width,
            height,
          },
        );
      }

      return this.savePdf(
        pdf,
        'images',
      );
    } catch (error) {
      console.error(
        'createFromImages error:',
        error,
      );

      throw new InternalServerErrorException(
        'Failed to create PDF from images',
      );
    }
  }


  /* ==========================================================================
     MERGE PDFs
  ========================================================================== */

  async merge(
    pdfPaths: string[],
  ): Promise<{
    path: string;
    url: string;
  }> {
    try {
      if (
        !pdfPaths.length
      ) {
        throw new Error(
          'No PDF files were provided',
        );
      }

      const output =
        await PDFDocument.create();

      for (
        const pdfPath
        of pdfPaths
      ) {
        const bytes =
          await fs.readFile(
            pdfPath,
          );

        const source =
          await PDFDocument.load(
            bytes,
          );

        const pages =
          await output.copyPages(
            source,
            source.getPageIndices(),
          );

        for (
          const page
          of pages
        ) {
          output.addPage(
            page,
          );
        }
      }

      return this.savePdf(
        output,
        'merged',
      );
    } catch (error) {
      console.error(
        'merge error:',
        error,
      );

      throw new InternalServerErrorException(
        'Failed to merge PDFs',
      );
    }
  }


  /* ==========================================================================
     REORDER PAGES
  ========================================================================== */

  async reorderPages(
    pdfPath: string,
    pageOrder: number[],
  ): Promise<{
    path: string;
    url: string;
  }> {
    try {
      const bytes =
        await fs.readFile(
          pdfPath,
        );

      const source =
        await PDFDocument.load(
          bytes,
        );

      const total =
        source.getPageCount();

      if (
        pageOrder.length !==
        total
      ) {
        throw new Error(
          `Page order must contain exactly ${total} pages`,
        );
      }

      const zeroBasedOrder =
        pageOrder.map(
          (page) => {
            const index =
              Number(page) - 1;

            if (
              index < 0 ||
              index >= total
            ) {
              throw new Error(
                `Invalid page number: ${page}`,
              );
            }

            return index;
          },
        );

      const output =
        await PDFDocument.create();

      const copiedPages =
        await output.copyPages(
          source,
          zeroBasedOrder,
        );

      copiedPages.forEach(
        (page) => {
          output.addPage(
            page,
          );
        },
      );

      return this.savePdf(
        output,
        'reordered',
      );
    } catch (error) {
      console.error(
        'reorderPages error:',
        error,
      );

      throw new InternalServerErrorException(
        'Failed to reorder PDF pages',
      );
    }
  }


  /* ==========================================================================
     ROTATE PAGE
  ========================================================================== */

  async rotatePage(
    pdfPath: string,
    pageNumber: number,
    rotationDegrees: number,
  ): Promise<{
    path: string;
    url: string;
  }> {
    try {
      const bytes =
        await fs.readFile(
          pdfPath,
        );

      const pdf =
        await PDFDocument.load(
          bytes,
        );

      const pageIndex =
        pageNumber - 1;

      if (
        pageIndex < 0 ||
        pageIndex >=
          pdf.getPageCount()
      ) {
        throw new Error(
          `Invalid page number: ${pageNumber}`,
        );
      }

      const page =
        pdf.getPage(
          pageIndex,
        );

      const currentRotation =
        page.getRotation().angle;

      page.setRotation(
        degrees(
          currentRotation +
            rotationDegrees,
        ),
      );

      return this.savePdf(
        pdf,
        'rotated',
      );
    } catch (error) {
      console.error(
        'rotatePage error:',
        error,
      );

      throw new InternalServerErrorException(
        'Failed to rotate PDF page',
      );
    }
  }


  /* ==========================================================================
     DELETE PAGE
  ========================================================================== */

  async deletePage(
    pdfPath: string,
    pageNumber: number,
  ): Promise<{
    path: string;
    url: string;
  }> {
    try {
      const bytes =
        await fs.readFile(
          pdfPath,
        );

      const pdf =
        await PDFDocument.load(
          bytes,
        );

      const pageIndex =
        pageNumber - 1;

      const total =
        pdf.getPageCount();

      if (
        pageIndex < 0 ||
        pageIndex >= total
      ) {
        throw new Error(
          `Invalid page number: ${pageNumber}`,
        );
      }

      if (
        total <= 1
      ) {
        throw new Error(
          'Cannot delete the only page in a PDF',
        );
      }

      pdf.removePage(
        pageIndex,
      );

      return this.savePdf(
        pdf,
        'deleted-page',
      );
    } catch (error) {
      console.error(
        'deletePage error:',
        error,
      );

      throw new InternalServerErrorException(
        'Failed to delete PDF page',
      );
    }
  }


  /* ==========================================================================
     SAVE PDF
  ========================================================================== */

  private async savePdf(
    pdf: PDFDocument,
    prefix: string,
  ): Promise<{
    path: string;
    url: string;
  }> {
    const uploadRoot =
      this.config.get<string>(
        'UPLOAD_ROOT',
        './uploads',
      );

    const outputDirectory =
      path.resolve(
        uploadRoot,
        'exports',
      );

    await fs.mkdir(
      outputDirectory,
      {
        recursive: true,
      },
    );

    const filename =
      `${prefix}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}.pdf`;

    const outputPath =
      path.join(
        outputDirectory,
        filename,
      );

    const bytes =
      await pdf.save();

    await fs.writeFile(
      outputPath,
      bytes,
    );

    /*
     * The controller expects a public URL.
     *
     * If your StorageService uses a different URL
     * convention, change this one line.
     */
    const url =
      `/uploads/exports/${filename}`;

    return {
      path: outputPath,
      url,
    };
  }


  /* ==========================================================================
     TEXT / DOCUMENT HELPERS
  ========================================================================== */

  private addPage(
    pdf: PDFDocument,
    _font: any,
    _boldFont: any,
    pageWidth: number,
    pageHeight: number,
    margin: number,
  ): number {
    pdf.addPage([
      pageWidth,
      pageHeight,
    ]);

    return (
      pageHeight -
      margin
    );
  }


  private drawWrappedText(
    page: any,
    text: string,
    font: any,
    x: number,
    y: number,
    maxWidth: number,
    fontSize: number,
  ): number {
    const words =
      text.split(/\s+/);

    const lines: string[] =
      [];

    let currentLine =
      '';

    for (
      const word of words
    ) {
      const testLine =
        currentLine
          ? `${currentLine} ${word}`
          : word;

      const width =
        font.widthOfTextAtSize(
          testLine,
          fontSize,
        );

      if (
        width <= maxWidth
      ) {
        currentLine =
          testLine;
      } else {
        if (
          currentLine
        ) {
          lines.push(
            currentLine,
          );
        }

        currentLine =
          word;
      }
    }

    if (
      currentLine
    ) {
      lines.push(
        currentLine,
      );
    }

    let currentY =
      y;

    for (
      const line of lines
    ) {
      if (
        currentY < 45
      ) {
        break;
      }

      page.drawText(
        line,
        {
          x,
          y: currentY,
          size: fontSize,
          font,
          color: rgb(
            0.1,
            0.1,
            0.1,
          ),
        },
      );

      currentY -=
        fontSize + 4;
    }

    return currentY;
  }


  private stringifyValue(
    value: unknown,
  ): string {
    if (
      value === null ||
      value === undefined
    ) {
      return '';
    }

    if (
      typeof value ===
      'string'
    ) {
      return value;
    }

    if (
      typeof value ===
        'number' ||
      typeof value ===
        'boolean'
    ) {
      return String(value);
    }

    try {
      return JSON.stringify(
        value,
        null,
        2,
      );
    } catch {
      return String(value);
    }
  }


  private formatLabel(
    value: string,
  ): string {
    return value
      .replace(
        /([a-z])([A-Z])/g,
        '$1 $2',
      )
      .replace(
        /[_-]+/g,
        ' ',
      )
      .replace(
        /\s+/g,
        ' ',
      )
      .trim()
      .replace(
        /^./,
        (char) =>
          char.toUpperCase(),
      );
  }
}