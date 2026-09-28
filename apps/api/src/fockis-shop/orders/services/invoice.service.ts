import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

@Injectable()
export class InvoiceService {

  private generateInvoiceNumber(order: any) {
    const shortId = order._id.toString().slice(-6).toUpperCase();
    return `INV-${shortId}`;
  }

  async generateInvoice(order: any): Promise<Buffer> {
    return new Promise((resolve) => {

      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      const invoiceNo = order.invoiceNumber || this.generateInvoiceNumber(order);
      const customer = order.customer || {};

      // =========================
      // STRIPE STYLE HEADER
      // =========================
      doc
        .fillColor("#111")
        .fontSize(22)
        .text("YOUR STORE", { align: "left" });

      doc
        .fontSize(10)
        .fillColor("gray")
        .text("Enterprise Invoice System");

      doc.moveDown();

      doc
        .fillColor("#000")
        .fontSize(18)
        .text("INVOICE", { align: "right" });

      doc
        .fontSize(10)
        .text(invoiceNo, { align: "right" });

      doc.moveDown(2);

      // =========================
      // CUSTOMER INFO
      // =========================
      const y = doc.y;

      doc.fontSize(10).fillColor("#444").text("BILL TO:", 50, y);

      doc
        .fillColor("#000")
        .text(customer.name || order.customerName || "N/A")
        .text(customer.email || order.customerEmail || "N/A")
        .text(order.customerPhone || "N/A")
        .text(order.shippingAddress || "N/A");

      doc.moveUp(4);

      doc
        .fillColor("#444")
        .text("ORDER INFO:", 350, y);

      doc
        .fillColor("#000")
        .text(`Date: ${new Date(order.createdAt).toDateString()}`, 350)
        .text(`Time: ${new Date(order.createdAt).toLocaleTimeString()}`, 350)
        .text(`Status: ${order.status}`, 350);

      doc.moveDown(3);

      // =========================
      // TABLE HEADER
      // =========================
      const tableTop = doc.y;

      doc
        .fontSize(10)
        .fillColor("#666")
        .text("ITEM", 50, tableTop)
        .text("QTY", 280, tableTop)
        .text("PRICE", 350, tableTop)
        .text("TOTAL", 450, tableTop);

      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      let yPos = tableTop + 25;
      let subtotal = 0;

      order.items.forEach((item: any) => {
        const product = item.product || {};
        const total = item.price * item.quantity;
        subtotal += total;

        doc
          .fillColor("#000")
          .text(product.name || "Product", 50, yPos)
          .text(item.quantity, 280, yPos)
          .text(`$${item.price.toFixed(2)}`, 350, yPos)
          .text(`$${total.toFixed(2)}`, 450, yPos);

        yPos += 20;
      });

      const tax = subtotal * 0.1;
      const shipping = 5;
      const grandTotal = subtotal + tax + shipping;

      yPos += 20;

      doc.fillColor("gray").text("Subtotal:", 350, yPos).text(`$${subtotal.toFixed(2)}`, 450, yPos);
      yPos += 15;

      doc.text("Tax (10%):", 350, yPos).text(`$${tax.toFixed(2)}`, 450, yPos);
      yPos += 15;

      doc.text("Shipping:", 350, yPos).text(`$${shipping.toFixed(2)}`, 450, yPos);
      yPos += 20;

      doc.fillColor("#000").fontSize(12)
        .text("TOTAL:", 350, yPos)
        .text(`$${grandTotal.toFixed(2)}`, 450, yPos);

      doc.moveDown(4);

      doc
        .fontSize(10)
        .fillColor("gray")
        .text("Thank you for your business — Stripe-style invoice", {
          align: "center",
        });

      doc.end();
    });
  }
}