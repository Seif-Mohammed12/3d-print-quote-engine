import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const AVAILABLE_COLORS = [
  { id: "matte-black", name: "Matte Black", hex: "#0b0d12" },
  { id: "matte-white", name: "Matte White", hex: "#f3f4f6" },
  { id: "matte-gray", name: "Matte Gray", hex: "#9ca3af" },
  { id: "matte-light-blue", name: "Matte Light Blue", hex: "#5ca8c7" },
  { id: "matte-red", name: "Matte Red", hex: "#e03131" },
];

const seedCatalog = {
  pforge: [
    {
      id: "pforge-stand-ps5",
      name: "DualSense Display Stand",
      short: "Clean desk, hero setup.",
      description: "Low-profile stand for PS5 and Xbox controllers with cable pass-through and anti-slip feet.",
      basePrice: 550,
      discount: { enabled: true, price: 480 },
      images: ["/pforge/pxl_20241220_152545198.webp", "/pforge/pxl_20241220_152620781.webp"],
      primaryColors: AVAILABLE_COLORS,
      secondaryColors: AVAILABLE_COLORS,
    },
    {
      id: "pforge-headset-hook",
      name: "Headset Stand",
      short: "Show off your gear.",
      description: "Sleek grid-patterned stand, the perfect minimalist touch for your headphones.",
      basePrice: 220,
      discount: { enabled: false, price: 0 },
      images: [],
      primaryColors: AVAILABLE_COLORS,
      secondaryColors: AVAILABLE_COLORS,
    },
    {
      id: "pforge-dock",
      name: "Desk Dock Combo",
      short: "Controller + phone + cards.",
      description: "All-in-one dock for controllers, phone and small accessories-made to tidy up your desk.",
      basePrice: 480,
      discount: { enabled: false, price: 0 },
      images: [],
      primaryColors: AVAILABLE_COLORS,
      secondaryColors: AVAILABLE_COLORS,
    },
  ],
  printique: [
    {
      id: "printique-vase",
      name: "Organic Flow Vase",
      short: "Modern decor.",
      description: "Soft curves and layered contours that look sculpted-perfect for dried flowers and desk styling.",
      basePrice: 280,
      discount: { enabled: false, price: 0 },
      images: [],
      primaryColors: AVAILABLE_COLORS,
      secondaryColors: AVAILABLE_COLORS,
    },
    {
      id: "printique-panel",
      name: "Geometric Wall Panel",
      short: "Wall art.",
      description: "Interlocking tiles that add depth and texture-an easy way to make a wall feel finished.",
      basePrice: 450,
      discount: { enabled: false, price: 0 },
      images: [],
      primaryColors: AVAILABLE_COLORS,
      secondaryColors: AVAILABLE_COLORS,
    },
    {
      id: "printique-tray",
      name: "Halo Catch-All Tray",
      short: "Everyday objects.",
      description: "An elegant tray for keys, watches or jewelry-simple shape, tidy result.",
      basePrice: 230,
      discount: { enabled: false, price: 0 },
      images: [],
      primaryColors: AVAILABLE_COLORS,
      secondaryColors: AVAILABLE_COLORS,
    },
  ],
};

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function seedBrand(brand, products) {
  for (const [index, product] of products.entries()) {
    const productRow = {
      brand,
      slug: slugify(product.id || product.name),
      name: product.name,
      short: product.short || "",
      description: product.description || "",
      base_price: Number(product.basePrice || 0),
      discount_enabled: Boolean(product.discount?.enabled),
      discount_price: product.discount?.enabled ? Number(product.discount?.price || 0) : null,
      stock_qty: 50,
      in_stock: true,
      is_published: true,
      sort_order: index,
    };

    const { data: inserted, error: upsertError } = await supabase
      .from("products")
      .upsert(productRow, { onConflict: "slug" })
      .select("*")
      .single();
    if (upsertError) throw upsertError;

    await supabase.from("product_images").delete().eq("product_id", inserted.id);
    await supabase.from("product_colors").delete().eq("product_id", inserted.id);

    if (Array.isArray(product.images)) {
      for (const [imgIdx, url] of product.images.entries()) {
        await supabase.from("product_images").insert({
          product_id: inserted.id,
          image_path: url,
          image_url: url,
          sort_order: imgIdx,
        });
      }
    }

    const primary = Array.isArray(product.primaryColors) ? product.primaryColors : [];
    const secondary = Array.isArray(product.secondaryColors) ? product.secondaryColors : [];
    for (const [cIdx, color] of primary.entries()) {
      await supabase.from("product_colors").insert({
        product_id: inserted.id,
        role: "primary",
        color_id: color.id,
        name: color.name,
        hex: color.hex,
        sort_order: cIdx,
      });
    }
    for (const [cIdx, color] of secondary.entries()) {
      await supabase.from("product_colors").insert({
        product_id: inserted.id,
        role: "secondary",
        color_id: color.id,
        name: color.name,
        hex: color.hex,
        sort_order: cIdx,
      });
    }

    console.log(`Seeded ${brand} / ${product.name}`);
  }
}

async function run() {
  await seedBrand("pforge", seedCatalog.pforge);
  await seedBrand("printique", seedCatalog.printique);
  console.log("Seed complete");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

