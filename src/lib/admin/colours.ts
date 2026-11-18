import { adminPost } from "@/lib/admin/api";
import type { LibraryColor } from "@/lib/admin/catalogue";

export function saveLibraryColour(input: {
  id?: string;
  colorId?: string;
  name: string;
  hex: string;
  outOfStock?: boolean;
  isArchived?: boolean;
}) {
  return adminPost<{ colour: LibraryColor; productsUpdated: number }>("/api/admin-color-library-save", input);
}

export function reorderLibraryColours(ids: string[]) {
  return adminPost<{ ok: boolean }>("/api/admin-color-library-reorder", { ids });
}

export function applyColourToProducts(colorId: string, role: "primary" | "secondary", productIds: string[]) {
  return adminPost<{ added: string[]; skipped: string[] }>("/api/admin-color-library-apply", { colorId, role, productIds });
}

export function isValidHex(hex: string) {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}
