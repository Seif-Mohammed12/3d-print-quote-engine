import { adminPost } from "@/lib/admin/api";
import type { OptionDisplay, OptionGroup, OptionValue } from "@/lib/admin/catalogue";

/** Editor shape: ids are kept for rows that already exist so links (photos, carts) survive. */
export type OptionValueDraft = {
  id?: string;
  key: string;
  label: string;
  swatchHex: string | null;
  priceDelta: number;
  gramsDelta: number;
  isAvailable: boolean;
};

export type OptionGroupDraft = {
  id?: string;
  key: string;
  name: string;
  displayType: OptionDisplay;
  isRequired: boolean;
  values: OptionValueDraft[];
};

let seq = 0;
export const newKey = () => `new-${Date.now()}-${seq++}`;

export function draftsFromRows(groups: OptionGroup[], values: OptionValue[]): OptionGroupDraft[] {
  return groups
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((g) => ({
      id: g.id,
      key: g.id,
      name: g.name,
      displayType: g.display_type,
      isRequired: g.is_required,
      values: values
        .filter((v) => v.group_id === g.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((v) => ({
          id: v.id,
          key: v.id,
          label: v.label,
          swatchHex: v.swatch_hex,
          priceDelta: Number(v.price_delta || 0),
          gramsDelta: Number(v.grams_delta || 0),
          isAvailable: v.is_available,
        })),
    }));
}

export function saveProductOptions(productId: string, groups: OptionGroupDraft[]) {
  return adminPost<{ groups: OptionGroup[]; values: OptionValue[] }>("/api/admin-product-options-save", {
    productId,
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      displayType: g.displayType,
      isRequired: g.isRequired,
      values: g.values.map((v) => ({
        id: v.id,
        label: v.label,
        swatchHex: v.swatchHex,
        priceDelta: v.priceDelta,
        gramsDelta: v.gramsDelta,
        isAvailable: v.isAvailable,
      })),
    })),
  });
}

export function setImageOptionValue(imageId: string, optionValueId: string | null) {
  return adminPost<{ success: boolean }>("/api/admin-product-images-set-option", { id: imageId, optionValueId });
}
