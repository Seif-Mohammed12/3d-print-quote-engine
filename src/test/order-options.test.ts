import { describe, expect, it } from "vitest";
import { normalizeRequestedItems, priceProductOrder } from "../../api/_lib/order-pricing.js";
import { validateOrderPatch } from "../../api/_lib/order-admin.js";
import { normaliseDiscount, slugify, validateProductFields } from "../../api/_lib/product-admin.js";
import { buildAdminOrderHtml } from "../../api/_lib/order-email.js";

const STAND = "11111111-1111-4111-8111-111111111111";
const SIZE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SMALL = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const LARGE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const GONE = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const FINISH = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const MATTE = "ffffffff-ffff-4fff-8fff-ffffffffffff";

const catalogue = {
  [STAND]: { id: STAND, brand: "pforge", name: "Stand", base_price: 400, discount_enabled: true, discount_price: 350, is_published: true, is_bundle: false },
};

const optionsByProduct = {
  [STAND]: [
    {
      id: SIZE,
      name: "Size",
      is_required: true,
      values: [
        { id: SMALL, label: "Small", price_delta: 0, grams_delta: 0, is_available: true },
        { id: LARGE, label: "Large", price_delta: 120, grams_delta: 60, is_available: true },
        { id: GONE, label: "XL", price_delta: 200, grams_delta: 90, is_available: false },
      ],
    },
    { id: FINISH, name: "Finish", is_required: false, values: [{ id: MATTE, label: "Matte", price_delta: 30, grams_delta: 0, is_available: true }] },
  ],
};

const coloursByProduct = {
  [STAND]: {
    primary: [
      { product_id: STAND, role: "primary", color_id: "matte-black", name: "Matte Black", out_of_stock: false },
      { product_id: STAND, role: "primary", color_id: "matte-red", name: "Matte Red", out_of_stock: true },
    ],
    secondary: [],
  },
};

function price(item: Record<string, unknown>) {
  const req = normalizeRequestedItems({ items: [{ productId: STAND, qty: 2, ...item }] });
  if (req.error) return { error: req.error };
  return priceProductOrder(req.value!, catalogue, {}, { optionsByProduct, coloursByProduct });
}

describe("product options are priced on the server", () => {
  it("adds option price changes to the sale price and ignores browser prices", () => {
    const res = price({
      primaryColorId: "matte-black",
      unitPrice: 1,
      options: [
        { groupId: SIZE, valueId: LARGE },
        { groupId: FINISH, valueId: MATTE },
      ],
    });
    expect(res.error).toBeUndefined();
    const item = res.value!.items[0];
    expect(item.unitPrice).toBe(350 + 120 + 30);
    expect(item.subtotal).toBe(1000);
    expect(item.options).toEqual([
      { groupId: SIZE, group: "Size", valueId: LARGE, value: "Large", priceDelta: 120 },
      { groupId: FINISH, group: "Finish", valueId: MATTE, value: "Matte", priceDelta: 30 },
    ]);
    expect(item.primaryColor).toBe("Matte Black");
  });

  it("requires required groups, and rejects unavailable or foreign values", () => {
    expect(price({ primaryColorId: "matte-black" }).error).toMatch(/choose size/i);
    expect(price({ primaryColorId: "matte-black", options: [{ groupId: SIZE, valueId: GONE }] }).error).toMatch(/isn't available/);
    expect(price({ primaryColorId: "matte-black", options: [{ groupId: SIZE, valueId: MATTE }] }).error).toMatch(/changed/);
    expect(price({ primaryColorId: "matte-black", options: [{ groupId: "not-a-uuid", valueId: SMALL }] }).error).toBeTruthy();
  });

  it("refuses out-of-stock or unknown colours, and accepts legacy colour names", () => {
    const opts = { options: [{ groupId: SIZE, valueId: SMALL }] };
    expect(price({ ...opts, primaryColorId: "matte-red" }).error).toMatch(/out of stock/);
    expect(price({ ...opts, primaryColorId: "neon-pink" }).error).toMatch(/choose a colour/i);
    expect(price({ ...opts, primaryColor: "matte black" }).value!.items[0].primaryColor).toBe("Matte Black");
  });

  it("shows options in the studio email, escaped", () => {
    const res = price({ primaryColorId: "matte-black", options: [{ groupId: SIZE, valueId: LARGE }] });
    const html = buildAdminOrderHtml({
      orderCode: "PO-1",
      customer: { name: "<b>سارة</b>", email: "a@b.co", phone: "", notes: "" },
      shipping: { method: "pickup", address: null },
      payment: { method: "cod" },
      items: res.value!.items,
      totals: res.value!.totals,
    });
    expect(html).toContain("Large");
    expect(html).toContain("&lt;b&gt;سارة&lt;/b&gt;");
  });
});

describe("admin order edits are validated", () => {
  it("accepts only known statuses and production fields", () => {
    expect(validateOrderPatch({ status: "printing" }).error).toBeTruthy();
    expect(validateOrderPatch({ status: "processing" }).value).toEqual({ status: "processing" });
    expect(validateOrderPatch({ filament_material: "ABS" }).error).toBeTruthy();
    expect(validateOrderPatch({ due_date: "2026-13-45" }).error).toBeTruthy();
    expect(validateOrderPatch({ total: 1 }).error).toBeTruthy();
    expect(validateOrderPatch({ due_date: "2026-12-01", print_minutes: 95, filament_material: "PETG" }).value).toEqual({
      due_date: "2026-12-01",
      print_minutes: 95,
      filament_material: "PETG",
    });
  });
});

describe("admin product validation", () => {
  it("slugifies and keeps a sale below the regular price", () => {
    expect(slugify("Nami Stand — v2!")).toBe("nami-stand-v2");
    const row = validateProductFields({ discountEnabled: true, discountPrice: 500 }, { partial: true }).value!;
    expect(normaliseDiscount(row, { base_price: 400 }).error).toBeTruthy();
    const off = validateProductFields({ discountEnabled: false, discountPrice: 10 }, { partial: true }).value!;
    normaliseDiscount(off, { base_price: 400 });
    expect(off.discount_price).toBeNull();
    expect(validateProductFields({ categoryId: "x" }, { partial: true }).error).toBeTruthy();
  });
});
