type ReceiptLineItem = {
  label: string;
  value: string;
};

type ReceiptSection = {
  title: string;
  rows: ReceiptLineItem[];
};

type ReceiptOptions = {
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

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return value.toLocaleString();
  return String(value);
}

function renderRows(rows: ReceiptLineItem[]) {
  return rows
    .map(
      (row) => `
        <div class="row">
          <span>${escapeHtml(row.label)}</span>
          <strong>${escapeHtml(row.value)}</strong>
        </div>`,
    )
    .join("");
}

function renderItems(items?: Array<Record<string, unknown>>) {
  if (!items || items.length === 0) return "";

  const header = `
    <thead>
      <tr>
        <th>Item</th>
        <th>Details</th>
        <th class="align-right">Price</th>
      </tr>
    </thead>`;

  const body = items
    .map((item, index) => {
      const title = String(item.name || item.file || item.product || `Item ${index + 1}`);
      const detailBits = [
        item.brand ? String(item.brand).toUpperCase() : null,
        item.material ? `Material: ${item.material}` : null,
        item.quality ? `Quality: ${item.quality}` : null,
        item.infill !== undefined && item.infill !== null ? `Infill: ${item.infill}%` : null,
        item.qty !== undefined && item.qty !== null ? `Qty: ${item.qty}` : null,
        item.weight ? `Weight: ${item.weight}g` : null,
        item.time ? `Time: ${item.time}h` : null,
        item.primaryColor ? `Primary: ${item.primaryColor}` : null,
        item.secondaryColor ? `Secondary: ${item.secondaryColor}` : null,
      ].filter(Boolean);
      const price = item.price ?? item.subtotal ?? item.unitPrice ?? null;

      return `
        <tr>
          <td>${escapeHtml(title)}</td>
          <td>${escapeHtml(detailBits.join(" • ") || "-")}</td>
          <td class="align-right">${escapeHtml(price !== null ? `EGP${formatValue(price)}` : "-")}</td>
        </tr>`;
    })
    .join("");

  return `
    <table>
      ${header}
      <tbody>${body}</tbody>
    </table>`;
}

export function buildReceiptHtml(options: ReceiptOptions) {
  const sectionsHtml = options.sections
    .map(
      (section) => `
        <section class="card">
          <h2>${escapeHtml(section.title)}</h2>
          <div class="rows">
            ${renderRows(section.rows)}
          </div>
        </section>`,
    )
    .join("");

  const totalsHtml = options.totals && options.totals.length > 0
    ? `
      <section class="card totals">
        <h2>Totals</h2>
        <div class="rows">
          ${renderRows(options.totals)}
        </div>
      </section>`
    : "";

  const itemsHtml = renderItems(options.items);
  const notesHtml = options.notes
    ? `
      <section class="card">
        <h2>Notes</h2>
        <p>${escapeHtml(options.notes)}</p>
      </section>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(options.title)} Receipt</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f5f7fb;
        --card: #ffffff;
        --text: #132033;
        --muted: #607086;
        --border: #d8e0ea;
        --primary: #2563eb;
        --primary-soft: #eff6ff;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: linear-gradient(180deg, #eef4ff 0%, var(--bg) 100%);
        color: var(--text);
      }
      .page {
        max-width: 920px;
        margin: 0 auto;
        padding: 32px 20px 40px;
      }
      .hero {
        background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%);
        color: white;
        border-radius: 20px;
        padding: 28px;
        box-shadow: 0 20px 60px rgba(15, 23, 42, 0.16);
      }
      .hero-top {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
        align-items: flex-start;
      }
      .eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.18em;
        font-size: 11px;
        opacity: 0.8;
        margin-bottom: 10px;
      }
      h1 {
        font-size: 30px;
        line-height: 1.1;
        margin: 0 0 8px;
      }
      .subtitle {
        margin: 0;
        opacity: 0.88;
        font-size: 15px;
        max-width: 58ch;
      }
      .meta {
        background: rgba(255, 255, 255, 0.12);
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 16px;
        padding: 14px 16px;
        min-width: 220px;
      }
      .meta-label {
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        opacity: 0.8;
      }
      .meta-value {
        font-size: 18px;
        font-weight: 700;
        margin-top: 6px;
      }
      .meta-sub {
        margin-top: 4px;
        font-size: 12px;
        opacity: 0.85;
      }
      .grid {
        display: grid;
        grid-template-columns: 1.3fr 0.7fr;
        gap: 16px;
        margin-top: 18px;
      }
      .card {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 18px;
        padding: 18px;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
      }
      .card h2 {
        margin: 0 0 14px;
        font-size: 16px;
      }
      .rows {
        display: grid;
        gap: 10px;
      }
      .row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 18px;
        padding-bottom: 10px;
        border-bottom: 1px solid #edf2f7;
        font-size: 14px;
      }
      .row:last-child { border-bottom: 0; padding-bottom: 0; }
      .row span { color: var(--muted); }
      .row strong { text-align: right; }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
      }
      th, td {
        text-align: left;
        padding: 12px 10px;
        vertical-align: top;
        border-bottom: 1px solid #edf2f7;
      }
      th {
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .align-right { text-align: right; white-space: nowrap; }
      .totals .row strong {
        color: var(--primary);
        font-size: 15px;
      }
      .footer {
        margin-top: 18px;
        color: var(--muted);
        font-size: 12px;
        text-align: center;
      }
      @media print {
        body { background: white; }
        .page { padding: 0; }
        .hero { border-radius: 0; box-shadow: none; }
        .card { box-shadow: none; }
      }
      @media (max-width: 720px) {
        .grid { grid-template-columns: 1fr; }
        .hero { padding: 22px; }
        h1 { font-size: 26px; }
        .row { flex-direction: column; gap: 4px; }
        .row strong { text-align: left; }
        .align-right { text-align: left; }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="hero">
        <div class="hero-top">
          <div>
            <div class="eyebrow">Receipt</div>
            <h1>${escapeHtml(options.title)}</h1>
            <p class="subtitle">${escapeHtml(options.subtitle)}</p>
          </div>
          <div class="meta">
            <div class="meta-label">${escapeHtml(options.referenceLabel)}</div>
            <div class="meta-value">${escapeHtml(options.referenceValue || "-")}</div>
            <div class="meta-sub">${escapeHtml(options.customerName ? `Customer: ${options.customerName}` : "")}</div>
            <div class="meta-sub">${escapeHtml(options.createdAt ? new Date(options.createdAt).toLocaleString() : "")}</div>
          </div>
        </div>
      </section>

      <div class="grid">
        <div class="left">
          ${sectionsHtml}
          ${itemsHtml ? `<section class="card"><h2>Items</h2>${itemsHtml}</section>` : ""}
          ${notesHtml}
        </div>
        <div class="right">
          ${totalsHtml}
        </div>
      </div>

      <div class="footer">
        This receipt was generated automatically. Keep it for your records.
      </div>
    </main>
  </body>
</html>`;
}

export function downloadReceipt(filename: string, html: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
