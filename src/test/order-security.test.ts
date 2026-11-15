import { describe, expect, it } from "vitest";
import {
  effectiveUnitPrice,
  generateOrderCode,
  isValidGuestToken,
  normalizeRequestedItems,
  priceProductOrder,
  totalsMismatch,
  validateCustomer,
  validatePayment,
  validateShipping,
} from "../../api/_lib/order-pricing.js";
import { buildCustomerOrderHtml, escapeHtml } from "../../api/_lib/order-email.js";
import { resolveResetRedirect } from "../../api/_lib/redirects.js";
import { detectImageType } from "../../api/_lib/image-validation.js";

const LAMP = "11111111-1111-4111-8111-111111111111";
const VASE = "22222222-2222-4222-8222-222222222222";
const DRAFT = "33333333-3333-4333-8333-333333333333";

const catalogue = {
  [LAMP]: { id: LAMP, brand: "a", name: "Lamp", base_price: 500, discount_enabled: false, discount_price: null, is_published: true, is_bundle: false },
  [VASE]: { id: VASE, brand: "a", name: "Vase", base_price: 300, discount_enabled: true, discount_price: 250, is_published: true, is_bundle: false },
  [DRAFT]: { id: DRAFT, brand: "a", name: "Unreleased", base_price: 100, discount_enabled: false, discount_price: null, is_published: false, is_bundle: false },
};

describe("order pricing is decided by the server", () => {
  it("ignores prices, names and subtotals sent by the browser", () => {
    const requested = normalizeRequestedItems({
      items: [{ productId: LAMP, qty: 2, unitPrice: 1, subtotal: 2, name: "Free lamp" }],
    });
    const priced = priceProductOrder(requested.value!, catalogue);
    expect(priced.value!.items[0]).toMatchObject({ name: "Lamp", unitPrice: 500, subtotal: 1000 });
    expect(priced.value!.totals).toEqual({ subtotal: 1000, shipping: 0, total: 1000, currency: "EGP" });
  });

  it("uses the sale price only when the discount is switched on", () => {
    expect(effectiveUnitPrice(catalogue[VASE])).toBe(250);
    expect(effectiveUnitPrice({ ...catalogue[VASE], discount_enabled: false })).toBe(300);
    expect(effectiveUnitPrice({ ...catalogue[VASE], discount_price: 0 })).toBe(300);
  });

  it("refuses unpublished and unknown products", () => {
    const draft = normalizeRequestedItems({ items: [{ productId: DRAFT, qty: 1 }] });
    expect(priceProductOrder(draft.value!, catalogue).error).toBeTruthy();
    const unknown = normalizeRequestedItems({ items: [{ productId: "44444444-4444-4444-8444-444444444444", qty: 1 }] });
    expect(priceProductOrder(unknown.value!, catalogue).error).toBeTruthy();
  });

  it("rejects bad quantities and ids", () => {
    for (const qty of [0, -1, 1.5, 51, "abc", null]) {
      expect(normalizeRequestedItems({ items: [{ productId: LAMP, qty }] }).error).toBeTruthy();
    }
    expect(normalizeRequestedItems({ items: [{ productId: "1 or 1=1", qty: 1 }] }).error).toBeTruthy();
    expect(normalizeRequestedItems({ items: [] }).error).toBeTruthy();
    expect(normalizeRequestedItems({ product: { id: LAMP, qty: 3 } }).value).toHaveLength(1);
  });

  it("flags a total that differs from what the customer was shown", () => {
    expect(totalsMismatch(1000, 1000)).toBe(false);
    expect(totalsMismatch(undefined, 1000)).toBe(false);
    expect(totalsMismatch(1, 1000)).toBe(true);
    expect(totalsMismatch("free", 1000)).toBe(true);
  });
});

describe("order input validation", () => {
  it("requires a name and a plausible email", () => {
    expect(validateCustomer({ name: "Mona", email: "Mona@Example.com" }).value).toMatchObject({ email: "mona@example.com" });
    expect(validateCustomer({ name: "", email: "a@b.co" }).error).toBeTruthy();
    expect(validateCustomer({ name: "X", email: "<img src=x>@b.co" }).error).toBeTruthy();
    expect(validateCustomer({ name: "X", email: "a@b.co\r\nBcc: victim@example.com" }).error).toBeTruthy();
  });

  it("keeps Arabic names and caps long input", () => {
    const result = validateCustomer({ name: "منى أحمد", email: "a@b.co", notes: "x".repeat(5000) });
    expect(result.value!.name).toBe("منى أحمد");
    expect(result.value!.notes).toHaveLength(1000);
  });

  it("only accepts the supported shipping and payment methods", () => {
    expect(validateShipping({ method: "pickup" }).value).toMatchObject({ method: "pickup", cost: 0 });
    expect(validateShipping({ method: "aramex" }).error).toBeTruthy();
    expect(validateShipping({ method: "drone", cost: -500 }).error).toBeTruthy();
    expect(validatePayment({ method: "cod" }).value).toEqual({ method: "cod" });
    expect(validatePayment({ method: "card" }).error).toBeTruthy();
  });

  it("requires unguessable-length guest tokens but still accepts older ones", () => {
    expect(isValidGuestToken("1731700000000-abcdefgh")).toBe(true);
    expect(isValidGuestToken("a".repeat(48))).toBe(true);
    expect(isValidGuestToken("short")).toBe(false);
    expect(isValidGuestToken("x".repeat(200))).toBe(false);
    expect(isValidGuestToken(undefined)).toBe(false);
  });

  it("generates order codes in the expected shape", () => {
    expect(generateOrderCode("product", new Date(2026, 10, 16))).toMatch(/^PO-20261116-[A-Z2-9]{4}$/);
    expect(generateOrderCode("quote", new Date(2026, 0, 5))).toMatch(/^QR-20260105-[A-Z2-9]{4}$/);
  });
});

describe("email content is escaped", () => {
  it("escapes HTML in every interpolated field", () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&`)).toBe("&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;");
    const html = buildCustomerOrderHtml({
      orderCode: "PO-1",
      shipping: { method: "pickup" },
      payment: { method: "cod" },
      items: [{ name: "Lamp", brand: "a", qty: 1, subtotal: 500, primaryColor: '<img src=x onerror="alert(1)">', secondaryColor: "" }],
      totals: { subtotal: 500, shipping: 0, total: 500 },
    });
    expect(html).not.toContain("<img");
  });
});

describe("password reset redirect", () => {
  const env = { URL: "https://3dprintit-eg.com" };
  const event = { headers: { host: "3dprintit-eg.com" } };

  it("keeps a redirect to this site", () => {
    expect(resolveResetRedirect("https://3dprintit-eg.com/reset-password", event, env)).toBe(
      "https://3dprintit-eg.com/reset-password"
    );
  });

  it("replaces off-site, lookalike and non-http redirects", () => {
    for (const bad of [
      "https://evil.example/reset-password",
      "https://3dprintit-eg.com.evil.example/reset-password",
      "https://3dprintit-eg.com@evil.example/",
      "javascript:alert(1)",
      "http://3dprintit-eg.com/reset-password",
      "",
      undefined,
    ]) {
      expect(resolveResetRedirect(bad, event, env)).toBe("https://3dprintit-eg.com/reset-password");
    }
  });

  it("allows localhost only when the function itself is running on localhost", () => {
    expect(resolveResetRedirect("http://localhost:8888/reset-password", event, env)).toBe(
      "https://3dprintit-eg.com/reset-password"
    );
    expect(resolveResetRedirect("http://localhost:8888/reset-password", { headers: { host: "localhost:8888" } }, {})).toBe(
      "http://localhost:8888/reset-password"
    );
  });
});

describe("product photo validation", () => {
  it("recognises real images by their bytes", () => {
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16)]);
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)]);
    expect(detectImageType(jpeg)).toEqual({ mime: "image/jpeg", ext: "jpg" });
    expect(detectImageType(png)).toEqual({ mime: "image/png", ext: "png" });
  });

  it("refuses HTML, SVG and scripts whatever they are named", () => {
    expect(detectImageType(Buffer.from("<html><script>alert(1)</script></html>"))).toBeNull();
    expect(detectImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'))).toBeNull();
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
  });
});
