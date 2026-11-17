import { describe, expect, it } from "vitest";
import { colorIdFromName, mapShopifyProduct, type ShopifyProductNode } from "@/lib/shopify-storefront";
import { imagesForColor } from "@/lib/catalog-format";
import { mapDbProductToLegacyProduct } from "@/lib/products-api";

const money = (amount: string) => ({ amount, currencyCode: "EGP" });

function node(overrides: Partial<ShopifyProductNode> = {}): ShopifyProductNode {
  return {
    id: "gid://shopify/Product/1",
    handle: "headset-stand",
    title: "Headset Stand",
    description: "Grid-patterned stand. Holds one headset.",
    availableForSale: true,
    totalInventory: 4,
    short: null,
    collections: { nodes: [{ handle: "desk" }] },
    priceRange: { minVariantPrice: money("220.0") },
    compareAtPriceRange: { maxVariantPrice: money("0.0") },
    options: [
      {
        name: "Colour",
        optionValues: [
          { name: "Matte Black", swatch: { color: "#0b0d12" } },
          { name: "Matte Red", swatch: null },
        ],
      },
    ],
    images: {
      nodes: [
        { url: "https://cdn.shopify.com/a.jpg?v=1" },
        { url: "https://cdn.shopify.com/b.jpg?v=1" },
        { url: "https://cdn.shopify.com/c.jpg?v=1" },
      ],
    },
    variants: {
      nodes: [
        { image: { url: "https://cdn.shopify.com/a.jpg?v=1&width=800" }, selectedOptions: [{ name: "Colour", value: "Matte Black" }] },
        { image: { url: "https://cdn.shopify.com/b.jpg?v=1" }, selectedOptions: [{ name: "Colour", value: "Matte Red" }] },
      ],
    },
    ...overrides,
  };
}

describe("mapShopifyProduct", () => {
  it("maps the basics onto the catalogue shape", () => {
    const p = mapShopifyProduct(node(), 3);
    expect(p).toMatchObject({
      id: "gid://shopify/Product/1",
      slug: "headset-stand",
      brand: "desk",
      name: "Headset Stand",
      short: "Grid-patterned stand.",
      basePrice: 220,
      discount: { enabled: false, price: 0 },
      inStock: true,
      stockQty: 4,
      sortOrder: 3,
    });
  });

  it("turns a higher compare-at price into a discount", () => {
    const p = mapShopifyProduct(node({ compareAtPriceRange: { maxVariantPrice: money("300.0") } }));
    expect(p.basePrice).toBe(300);
    expect(p.discount).toEqual({ enabled: true, price: 220 });
  });

  it("reads colours and swatches from the Colour option", () => {
    const p = mapShopifyProduct(node());
    expect(p.primaryColors).toEqual([
      { id: "matte-black", name: "Matte Black", hex: "#0b0d12" },
      { id: "matte-red", name: "Matte Red", hex: "#e03131" },
    ]);
    expect(p.secondaryColors).toEqual([]);
  });

  it("reads a second option as the accent colour", () => {
    const p = mapShopifyProduct(
      node({
        options: [
          { name: "Color", optionValues: [{ name: "Black" }] },
          { name: "Accent colour", optionValues: [{ name: "Red", swatch: { color: "#e03131" } }] },
        ],
      })
    );
    expect(p.primaryColors.map((c) => c.id)).toEqual(["black"]);
    expect(p.secondaryColors).toEqual([{ id: "red", name: "Red", hex: "#e03131" }]);
  });

  it("tags variant photos with their colour so photos switch with the chosen colour", () => {
    const db = mapShopifyProduct(node());
    expect(db.imageColorIds).toEqual(["matte-black", "matte-red", null]);
    const product = mapDbProductToLegacyProduct(db);
    expect(imagesForColor(product, "matte-red")).toEqual([
      "https://cdn.shopify.com/b.jpg?v=1",
      "https://cdn.shopify.com/c.jpg?v=1",
    ]);
  });

  it("prefers the short metafield and survives a product with nothing set", () => {
    expect(mapShopifyProduct(node({ short: { value: " Show off your gear. " } })).short).toBe("Show off your gear.");
    const bare = mapShopifyProduct(
      node({ description: "", options: [], collections: { nodes: [] }, images: { nodes: [] }, variants: { nodes: [] } })
    );
    expect(bare).toMatchObject({ brand: "", short: "", images: [], primaryColors: [], imageColorIds: [] });
  });
});

describe("colorIdFromName", () => {
  it("slugs names, including Arabic", () => {
    expect(colorIdFromName("  Matte Light Blue ")).toBe("matte-light-blue");
    expect(colorIdFromName("أسود مطفي")).toBe("أسود-مطفي");
  });
});
