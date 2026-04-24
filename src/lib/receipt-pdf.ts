import { jsPDF } from "jspdf";

type ReceiptLineItem = {
  label: string;
  value: string;
};

type ReceiptSection = {
  title: string;
  rows: ReceiptLineItem[];
};

type ReceiptPdfOptions = {
  title: string;
  subtitle: string;
  referenceLabel: string;
  referenceValue?: string | null;
  customerName?: string | null;
  createdAt?: string | null;
  sections: ReceiptSection[];
  items?: Array<Record<string, unknown>>;
  totals?: ReceiptLineItem[];
  notes?: string | null;
};

function formatText(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return value.toLocaleString();
  return String(value);
}

function formatBundleItems(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return null;
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return "Item";
      const item = entry as { name?: unknown; qty?: unknown };
      const name = String(item.name || "Item");
      const qty = Number(item.qty || 1);
      return qty > 1 ? `${name} x${qty}` : name;
    })
    .join(", ");
}

function joinParts(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" • ");
}

function itemPrice(item: Record<string, unknown>) {
  const price = item.price ?? item.subtotal ?? item.unitPrice ?? null;
  if (price === null || price === undefined || price === "") return "-";
  return `EGP${formatText(price)}`;
}

function buildItemDetails(item: Record<string, unknown>) {
  return joinParts([
    item.brand ? String(item.brand).toUpperCase() : null,
    item.isBundle ? "Bundle" : null,
    item.material ? `Material: ${item.material}` : null,
    item.quality ? `Quality: ${item.quality}` : null,
    item.infill !== undefined && item.infill !== null ? `Infill: ${item.infill}%` : null,
    item.qty !== undefined && item.qty !== null ? `Qty: ${item.qty}` : null,
    item.weight ? `Weight: ${item.weight}g` : null,
    item.time ? `Time: ${item.time}h` : null,
    item.primaryColor ? `Primary: ${item.primaryColor}` : null,
    item.secondaryColor ? `Secondary: ${item.secondaryColor}` : null,
    formatBundleItems(item.bundleItems) ? `Includes: ${formatBundleItems(item.bundleItems)}` : null,
  ]) || "-";
}

function drawKeyValueRows(doc: jsPDF, rows: ReceiptLineItem[], x: number, y: number, width: number) {
  let cursorY = y;
  const rowGap = 8;
  rows.forEach((row, index) => {
    const isLast = index === rows.length - 1;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(95, 112, 134);
    const labelLines = doc.splitTextToSize(row.label, width * 0.42);
    const valueLines = doc.splitTextToSize(row.value || "-", width * 0.5);
    const lineCount = Math.max(labelLines.length, valueLines.length);
    const rowHeight = lineCount * 4.8 + 5;

    doc.text(labelLines, x, cursorY + 4.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(19, 32, 51);
    doc.text(valueLines, x + width * 0.45, cursorY + 4.5);

    cursorY += rowHeight + (isLast ? 0 : rowGap);
    if (!isLast) {
      doc.setDrawColor(230, 235, 241);
      doc.line(x, cursorY - rowGap + 1, x + width, cursorY - rowGap + 1);
    }
  });
  return cursorY;
}

function ensureSpace(doc: jsPDF, cursorY: number, requiredHeight: number, margin: number) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (cursorY + requiredHeight > pageHeight - margin) {
    doc.addPage();
    return margin;
  }
  return cursorY;
}

function addSection(doc: jsPDF, section: ReceiptSection, cursorY: number, margin: number, width: number) {
  cursorY = ensureSpace(doc, cursorY, 32, margin);
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(margin, cursorY, width, 11, 3, 3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(37, 99, 235);
  doc.text(section.title, margin + 4, cursorY + 7.5);
  cursorY += 16;
  cursorY = drawKeyValueRows(doc, section.rows, margin, cursorY, width);
  return cursorY + 4;
}

function addItemsTable(doc: jsPDF, items: Array<Record<string, unknown>>, cursorY: number, margin: number, width: number) {
  if (!items || items.length === 0) return cursorY;
  cursorY = ensureSpace(doc, cursorY, 36, margin);

  const colItem = width * 0.25;
  const colDetails = width * 0.55;
  const colPrice = width * 0.2;

  doc.setFillColor(17, 24, 39);
  doc.roundedRect(margin, cursorY, width, 11, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("Item", margin + 4, cursorY + 7.5);
  doc.text("Details", margin + colItem + 4, cursorY + 7.5);
  doc.text("Price", margin + colItem + colDetails + 4, cursorY + 7.5);
  cursorY += 14;

  items.forEach((item, index) => {
    const title = String(item.name || item.file || item.product || `Item ${index + 1}`);
    const details = buildItemDetails(item);
    const price = itemPrice(item);

    const titleLines = doc.splitTextToSize(title, colItem - 8);
    const detailLines = doc.splitTextToSize(details, colDetails - 8);
    const priceLines = doc.splitTextToSize(price, colPrice - 8);
    const rowHeight = Math.max(titleLines.length, detailLines.length, priceLines.length) * 5 + 10;

    cursorY = ensureSpace(doc, cursorY, rowHeight + 6, margin);
    doc.setDrawColor(233, 238, 245);
    doc.rect(margin, cursorY, width, rowHeight, "S");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(19, 32, 51);
    doc.text(titleLines, margin + 4, cursorY + 6);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(96, 112, 134);
    doc.text(detailLines, margin + colItem + 4, cursorY + 6);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text(priceLines, margin + colItem + colDetails + 4, cursorY + 6);

    cursorY += rowHeight;
  });

  return cursorY + 4;
}

export function createReceiptPdfBlob(options: ReceiptPdfOptions) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  doc.setFillColor(15, 23, 42);
  doc.roundedRect(margin, cursorY, contentWidth, 34, 5, 5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(options.title, margin + 6, cursorY + 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const subtitleLines = doc.splitTextToSize(options.subtitle, contentWidth - 56);
  doc.text(subtitleLines, margin + 6, cursorY + 18);

  doc.setFillColor(37, 99, 235);
  doc.roundedRect(pageWidth - margin - 48, cursorY + 5, 42, 24, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(options.referenceLabel.toUpperCase(), pageWidth - margin - 44, cursorY + 13);
  doc.setFontSize(13);
  const refValue = options.referenceValue || "-";
  const refLines = doc.splitTextToSize(refValue, 36);
  doc.text(refLines, pageWidth - margin - 44, cursorY + 20);

  cursorY += 42;

  doc.setTextColor(19, 32, 51);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const customerLine = joinParts([
    options.customerName ? `Customer: ${options.customerName}` : null,
    options.createdAt ? `Created: ${new Date(options.createdAt).toLocaleString()}` : null,
  ]);
  if (customerLine) {
    doc.text(customerLine, margin, cursorY);
    cursorY += 8;
  }

  cursorY = addSection(doc, { title: "Customer details", rows: options.sections[0]?.rows || [] }, cursorY, margin, contentWidth);
  if (options.sections[1]) {
    cursorY = addSection(doc, options.sections[1], cursorY, margin, contentWidth);
  }

  if (options.items && options.items.length > 0) {
    cursorY = ensureSpace(doc, cursorY, 18, margin);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(19, 32, 51);
    doc.text("Items", margin, cursorY + 4);
    cursorY += 8;
    cursorY = addItemsTable(doc, options.items, cursorY, margin, contentWidth);
  }

  if (options.totals && options.totals.length > 0) {
    cursorY = ensureSpace(doc, cursorY, 40, margin);
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(margin, cursorY, contentWidth, 12, 3, 3, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(37, 99, 235);
    doc.text("Totals", margin + 4, cursorY + 8);
    cursorY += 16;
    cursorY = drawKeyValueRows(doc, options.totals, margin, cursorY, contentWidth);
  }

  if (options.notes) {
    cursorY = ensureSpace(doc, cursorY, 24, margin);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(19, 32, 51);
    doc.text("Notes", margin, cursorY);
    cursorY += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(96, 112, 134);
    const noteLines = doc.splitTextToSize(options.notes, contentWidth);
    doc.text(noteLines, margin, cursorY);
    cursorY += noteLines.length * 4.8 + 4;
  }

  const footerY = doc.internal.pageSize.getHeight() - 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(96, 112, 134);
  doc.text("Generated automatically for your records.", margin, footerY);

  return doc.output("blob");
}
