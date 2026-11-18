import { Switch } from "@/components/ui/switch";
import { slugify, type Category, type ProductDraft } from "@/lib/admin/catalogue";

type DetailsTabProps = {
  draft: ProductDraft;
  onChange: (patch: Partial<ProductDraft>) => void;
  slugTouched: boolean;
  onSlugTouched: () => void;
  categories: Category[];
  categoriesEnabled: boolean;
  readOnly: boolean;
};

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="adm-label">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function numberOr(value: string, fallback: number) {
  const n = Number(value);
  return value.trim() === "" || !Number.isFinite(n) ? fallback : n;
}

export default function DetailsTab({ draft, onChange, slugTouched, onSlugTouched, categories, categoriesEnabled, readOnly }: DetailsTabProps) {
  const saleInvalid = draft.discountEnabled && (!(Number(draft.discountPrice) > 0) || Number(draft.discountPrice) >= draft.basePrice);
  return (
    <fieldset disabled={readOnly} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="Name" htmlFor="p-name">
          <input
            id="p-name"
            className="adm-input"
            value={draft.name}
            maxLength={120}
            onChange={(e) => {
              const name = e.target.value;
              onChange(slugTouched ? { name } : { name, slug: slugify(name) });
            }}
          />
        </Field>
      </div>
      <Field label="URL slug" htmlFor="p-slug" hint={`Shop link: /products/${draft.slug || "…"}`}>
        <input
          id="p-slug"
          className="adm-input num"
          value={draft.slug}
          maxLength={80}
          onChange={(e) => {
            onSlugTouched();
            onChange({ slug: slugify(e.target.value) || e.target.value.toLowerCase() });
          }}
        />
      </Field>
      <Field
        label="Category"
        htmlFor="p-category"
        hint={categoriesEnabled ? (categories.length ? undefined : "Add categories under Catalogue → Categories.") : "Categories need the admin workspace migration."}
      >
        <select
          id="p-category"
          className="adm-input"
          disabled={!categoriesEnabled}
          value={draft.categoryId || ""}
          onChange={(e) => onChange({ categoryId: e.target.value || null })}
        >
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Card line" htmlFor="p-short" hint="One short line under the name on shop cards.">
          <input id="p-short" className="adm-input" value={draft.short} maxLength={200} onChange={(e) => onChange({ short: e.target.value })} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Description" htmlFor="p-desc" hint="Shown under “About this piece”. Blank lines start a new paragraph.">
          <textarea
            id="p-desc"
            className="adm-textarea min-h-32"
            value={draft.description}
            maxLength={5000}
            onChange={(e) => onChange({ description: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Price (EGP)" htmlFor="p-price">
        <input
          id="p-price"
          type="number"
          min={0}
          step="1"
          inputMode="decimal"
          className="adm-input num"
          value={draft.basePrice}
          onChange={(e) => onChange({ basePrice: numberOr(e.target.value, 0) })}
        />
      </Field>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="p-sale" className="text-xs font-medium text-muted-foreground">
            Sale price (EGP)
          </label>
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Switch
              checked={draft.discountEnabled}
              onCheckedChange={(checked) => onChange({ discountEnabled: checked, discountPrice: checked ? draft.discountPrice : null })}
              aria-label="Sale on"
            />
            Sale on
          </label>
        </div>
        <input
          id="p-sale"
          type="number"
          min={0}
          step="1"
          inputMode="decimal"
          disabled={!draft.discountEnabled}
          aria-invalid={saleInvalid}
          className="adm-input num"
          value={draft.discountPrice ?? ""}
          onChange={(e) => onChange({ discountPrice: e.target.value === "" ? null : numberOr(e.target.value, 0) })}
        />
        {saleInvalid ? <p className="mt-1 text-xs text-destructive">Sale price must be above 0 and below the regular price.</p> : null}
      </div>
      <Field label="Weight (grams)" htmlFor="p-grams" hint="Printed weight. Used for filament figures once orders record it.">
        <input
          id="p-grams"
          type="number"
          min={0}
          step="1"
          className="adm-input num"
          value={draft.grams}
          onChange={(e) => onChange({ grams: numberOr(e.target.value, 0) })}
        />
      </Field>
      <Field label="Stock count" htmlFor="p-stock" hint="For your reference. The shop prints to order and doesn't limit sales by stock.">
        <input
          id="p-stock"
          type="number"
          min={0}
          step="1"
          className="adm-input num"
          value={draft.stockQty}
          onChange={(e) => onChange({ stockQty: Math.max(0, Math.trunc(numberOr(e.target.value, 0))) })}
        />
      </Field>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <label className="flex items-start gap-3">
          <Switch checked={draft.isPublished} onCheckedChange={(checked) => onChange({ isPublished: checked })} aria-describedby="p-pub-hint" />
          <span>
            <span className="block font-medium">Visible in the shop</span>
            <span id="p-pub-hint" className="text-xs text-muted-foreground">
              {draft.isPublished ? "Customers can see and order this product." : "Draft: only admins can see it. Saving keeps it a draft."}
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3">
          <Switch checked={draft.inStock} onCheckedChange={(checked) => onChange({ inStock: checked })} />
          <span>
            <span className="block font-medium">Marked in stock</span>
            <span className="text-xs text-muted-foreground">A note for you and the filters here; the shop doesn't read it yet.</span>
          </span>
        </label>
        <label className="flex items-start gap-3">
          <Switch checked={draft.isBundle} onCheckedChange={(checked) => onChange({ isBundle: checked })} />
          <span>
            <span className="block font-medium">This is a bundle</span>
            <span className="text-xs text-muted-foreground">Choose what's inside on the Bundle tab after saving.</span>
          </span>
        </label>
      </div>
    </fieldset>
  );
}
