import type { BrandId, Product, ProductColor } from "@/lib/brand-catalog";
import { getAccessToken } from "@/lib/auth-session";

export type DbProduct = {
  id: string;
  slug?: string;
  brand: BrandId;
  name: string;
  short: string;
  description: string;
  basePrice: number;
  discount: { enabled: boolean; price: number };
  images: string[];
  primaryColors: ProductColor[];
  secondaryColors: ProductColor[];
  stockQty?: number;
  inStock?: boolean;
  isPublished?: boolean;
  sortOrder?: number;
};

export async function fetchPublicProducts(brand?: BrandId): Promise<DbProduct[]> {
  const url = brand ? `/api/products-catalog?brand=${brand}` : "/api/products-catalog";
  const res = await fetch(url);
  const raw = await res.text();
  let data: { error?: string; hint?: string; products?: DbProduct[] } = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(
      `Catalog API returned non-JSON (${res.status}). If local, run netlify dev. On Netlify, set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY.`
    );
  }
  if (!res.ok) {
    const msg = [data?.error, data?.hint].filter(Boolean).join(" ");
    throw new Error(msg || `Failed to load products (${res.status})`);
  }
  return (data.products || []) as DbProduct[];
}

export async function fetchProductByBrandAndId(brand: BrandId, productId: string): Promise<DbProduct | null> {
  const products = await fetchPublicProducts(brand);
  return products.find((p) => p.id === productId || p.slug === productId) || null;
}

export type AdminCatalogPayload = {
  products: any[];
  images: any[];
  colors: any[];
  colorLibrary?: any[];
};

async function adminRequest(path: string, init?: RequestInit) {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  const contentType = res.headers.get("content-type") || "";
  const raw = await res.text();

  let data: any = null;
  if (contentType.includes("application/json")) {
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error("API returned invalid JSON. If you are on local dev, run with `netlify dev` so /api routes work.");
    }
  } else {
    // Common local dev issue: Vite dev server returns non-JSON for /api paths.
    if (!res.ok) {
      throw new Error(
        `Admin API failed (${res.status}). If running locally, use 'netlify dev' instead of 'vite' for /api endpoints.`
      );
    }
    throw new Error("Unexpected non-JSON API response. Use `netlify dev` for local admin API calls.");
  }

  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
}

export async function adminFetchCatalog(brand?: BrandId): Promise<AdminCatalogPayload> {
  const query = brand ? `?brand=${brand}` : "";
  return adminRequest(`/api/admin-products-list${query}`);
}

export async function adminUpsertProduct(payload: {
  id?: string;
  brand: BrandId;
  slug?: string;
  name: string;
  short: string;
  description: string;
  basePrice: number;
  discountEnabled: boolean;
  discountPrice: number;
  stockQty: number;
  inStock: boolean;
  isPublished: boolean;
  sortOrder: number;
}) {
  return adminRequest("/api/admin-products-upsert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function adminDeleteProduct(id: string) {
  return adminRequest("/api/admin-products-delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
}

export async function adminUploadImage(productId: string, file: File) {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const form = new FormData();
  form.set("productId", productId);
  form.set("file", file);

  const res = await fetch("/api/admin-product-images-upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const contentType = res.headers.get("content-type") || "";
  const raw = await res.text();
  const data = contentType.includes("application/json") ? JSON.parse(raw || "{}") : null;
  if (!res.ok) throw new Error(data?.error || `Upload failed (${res.status})`);
  if (!data) throw new Error("Upload endpoint returned unexpected response");
  return data;
}

/** Upload multiple images in order; sequential to avoid sort_order races on the server. */
export async function adminUploadImages(productId: string, files: File[]) {
  const out: unknown[] = [];
  for (const file of files) {
    if (!file.size) continue;
    const data = await adminUploadImage(productId, file);
    out.push(data);
  }
  return out;
}

export async function adminDeleteImage(id: string) {
  return adminRequest("/api/admin-product-images-delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
}

export async function adminReorderImages(ids: string[]) {
  return adminRequest("/api/admin-product-images-reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
}

export async function adminUpsertColor(payload: {
  id?: string;
  productId: string;
  role: "primary" | "secondary";
  colorId: string;
  name: string;
  hex: string;
  sortOrder: number;
}) {
  return adminRequest("/api/admin-product-colors-upsert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function adminDeleteColor(id: string) {
  return adminRequest("/api/admin-product-colors-delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
}

export async function adminReorderColors(ids: string[]) {
  return adminRequest("/api/admin-product-colors-reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
}

export function mapDbProductToLegacyProduct(p: DbProduct): Product {
  return {
    id: p.id,
    name: p.name,
    short: p.short,
    description: p.description,
    basePrice: p.basePrice,
    discount: p.discount,
    images: p.images || [],
    primaryColors: p.primaryColors || [],
    secondaryColors: p.secondaryColors || [],
    supportsLeds: false,
    ledExtraPrice: 0,
  };
}

