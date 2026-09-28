import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

@Injectable()
export class InvoiceService {

  async generateInvoice(order: any): Promise<Buffer> {

    return new Promise((resolve) => {

      const doc = new PDFDocument({ margin: 40 });
      const buffers: Buffer[] = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // =========================
      // HEADER
      // =========================
      doc.fontSize(20).text("INVOICE", { align: "center" });
      doc.moveDown();

      // =========================
      // CUSTOMER INFO
      // =========================
      const customer = order.customer || {};

      doc.fontSize(12)
        .text(`Name: ${customer.name || "N/A"}`)
        .text(`Email: ${customer.email || "N/A"}`)
        .text(`Address: ${order.shippingAddress || "N/A"}`)
        .text(`Phone: ${customer.phone || "N/A"}`);

      doc.moveDown();

      // =========================
      // ORDER INFO
      // =========================
      doc
        .text(`Order ID: ${order._id}`)
        .text(`Status: ${order.status}`)
        .text(`Date: ${new Date(order.createdAt).toDateString()}`)
        .text(`Time: ${new Date(order.createdAt).toLocaleTimeString()}`);

      doc.moveDown();

      // =========================
      // ITEMS
      // =========================
      doc.fontSize(14).text("Items:");

      order.items.forEach((item: any, i: number) => {
        const product = item.product || {};

        doc.fontSize(12)
          .text(`${i + 1}. ${product.name || "Product"}`)
          .text(`   Qty: ${item.quantity}`)
          .text(`   Price: $${item.price}`)
          .text(`   Total: $${item.price * item.quantity}`);

        doc.moveDown(0.5);
      });

      doc.moveDown();

      // =========================
      // TOTAL
      // =========================
      doc.fontSize(16)
        .text(`TOTAL: $${order.totalAmount}`, {
          align: "right"
        });

      doc.end();
    });
  }
}