import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { SetupNotice } from "@/components/admin/ui";
import { errorMessage } from "@/lib/admin/api";
import { draftsFromRows, newKey, saveProductOptions, type OptionGroupDraft, type OptionValueDraft } from "@/lib/admin/options";
import { moveItem, type AdminImage, type OptionDisplay, type OptionGroup, type OptionValue } from "@/lib/admin/catalogue";
import { WORKSPACE_MIGRATION } from "@/lib/admin/setup";
import { useCatalogueCache } from "@/components/admin/catalogue/useCatalogue";
import { formatEGP } from "@/lib/catalog-format";

const DISPLAY_LABEL: Record<OptionDisplay, string> = {
  buttons: "Buttons",
  swatches: "Swatches",
  dropdown: "Dropdown",
};

function signed(n: number) {
  if (!n) return "No change";
  return `${n > 0 ? "+" : "−"}${formatEGP(Math.abs(n))}`;
}

/**
 * Option groups (pattern, size, finish…) with values, price and weight adjustments and
 * availability. Colours stay on the Colours tab. Saved as one batch with its own Save button.
 */
export default function OptionsTab({
  productId,
  groups,
  values,
  images,
  enabled,
  readOnly,
  basePrice,
  onDirtyChange,
}: {
  productId: string;
  groups: OptionGroup[];
  values: OptionValue[];
  images: AdminImage[];
  enabled: boolean;
  readOnly: boolean;
  basePrice: number;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const cache = useCatalogueCache();
  // Keyed on content, not array identity, so a parent re-render never wipes unsaved edits.
  const initialJson = JSON.stringify(draftsFromRows(groups, values));
  const initial = useMemo<OptionGroupDraft[]>(() => JSON.parse(initialJson), [initialJson]);
  const [drafts, setDrafts] = useState<OptionGroupDraft[]>(initial);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(drafts) !== JSON.stringify(initial);

  useEffect(() => setDrafts(initial), [initial]);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  if (!enabled) {
    return <SetupNotice title="Product options aren't set up yet" migration={WORKSPACE_MIGRATION} />;
  }

  const photosFor = (valueId?: string) => (valueId ? images.filter((i) => i.option_value_id === valueId).length : 0);

  const updateGroup = (key: string, patch: Partial<OptionGroupDraft>) =>
    setDrafts((d) => d.map((g) => (g.key === key ? { ...g, ...patch } : g)));
  const updateValue = (gKey: string, vKey: string, patch: Partial<OptionValueDraft>) =>
    setDrafts((d) => d.map((g) => (g.key === gKey ? { ...g, values: g.values.map((v) => (v.key === vKey ? { ...v, ...patch } : v)) } : g)));

  const problems: string[] = [];
  drafts.forEach((g, gi) => {
    if (!g.name.trim()) problems.push(`Group ${gi + 1} needs a name.`);
    if (!g.values.length) problems.push(`“${g.name || `Group ${gi + 1}`}” needs at least one value.`);
    if (g.isRequired && g.values.length && !g.values.some((v) => v.isAvailable)) {
      problems.push(`“${g.name}” is required but has no available values, so nobody could order it.`);
    }
    g.values.forEach((v, vi) => {
      if (!v.label.trim()) problems.push(`“${g.name || `Group ${gi + 1}`}” value ${vi + 1} needs a label.`);
      if (g.displayType === "swatches" && v.swatchHex && !/^#[0-9a-fA-F]{6}$/.test(v.swatchHex)) {
        problems.push(`“${v.label}” swatch must look like #1A2B3C.`);
      }
      if (basePrice + v.priceDelta < 0) problems.push(`“${v.label}” would make the price negative.`);
    });
  });

  async function save() {
    if (problems.length) {
      toast.error(problems[0]);
      return;
    }
    setSaving(true);
    try {
      const res = await saveProductOptions(productId, drafts);
      cache.update((prev) => {
        const groupIds = new Set(prev.optionGroups.filter((g) => g.product_id === productId).map((g) => g.id));
        const removedValueIds = new Set(prev.optionValues.filter((v) => groupIds.has(v.group_id)).map((v) => v.id));
        res.values.forEach((v) => removedValueIds.delete(v.id));
        return {
          ...prev,
          optionGroups: [...prev.optionGroups.filter((g) => g.product_id !== productId), ...res.groups],
          optionValues: [...prev.optionValues.filter((v) => !groupIds.has(v.group_id)), ...res.values],
          images: prev.images.map((i) => (i.option_value_id && removedValueIds.has(i.option_value_id) ? { ...i, option_value_id: null } : i)),
        };
      });
      toast.success("Options saved");
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't save options"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Choices like pattern, size or finish. Each value can change the price and printed weight; the server recalculates the price
        at checkout. Link photos to values on the Media tab. Colours have their own tab.
      </p>

      {drafts.length === 0 ? <p className="text-sm text-muted-foreground">No options. Customers only pick colours for this product.</p> : null}

      <fieldset disabled={readOnly || saving} className="space-y-4">
        {drafts.map((g, gi) => (
          <section key={g.key} className="border border-border">
            <div className="flex flex-wrap items-end gap-2 border-b border-border bg-background p-3">
              <div className="min-w-40 flex-1">
                <label htmlFor={`og-name-${g.key}`} className="adm-label">Group name</label>
                <input id={`og-name-${g.key}`} className="adm-input" maxLength={60} placeholder="e.g. Size" value={g.name} onChange={(e) => updateGroup(g.key, { name: e.target.value })} />
              </div>
              <div>
                <label htmlFor={`og-type-${g.key}`} className="adm-label">Shown as</label>
                <select id={`og-type-${g.key}`} className="adm-input w-32" value={g.displayType} onChange={(e) => updateGroup(g.key, { displayType: e.target.value as OptionDisplay })}>
                  {(Object.keys(DISPLAY_LABEL) as OptionDisplay[]).map((d) => (
                    <option key={d} value={d}>
                      {DISPLAY_LABEL[d]}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex h-10 items-center gap-2 text-sm coarse:h-11">
                <Switch checked={g.isRequired} onCheckedChange={(checked) => updateGroup(g.key, { isRequired: checked })} /> Required
              </label>
              <div className="flex">
                <button type="button" className="adm-icon-btn" disabled={gi === 0} onClick={() => setDrafts((d) => moveItem(d, gi, gi - 1))} aria-label={`Move ${g.name || "group"} up`}>
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button type="button" className="adm-icon-btn" disabled={gi === drafts.length - 1} onClick={() => setDrafts((d) => moveItem(d, gi, gi + 1))} aria-label={`Move ${g.name || "group"} down`}>
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button type="button" className="adm-icon-btn hover:text-destructive" onClick={() => setDrafts((d) => d.filter((x) => x.key !== g.key))} aria-label={`Remove group ${g.name}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="adm-th">Value</th>
                    {g.displayType === "swatches" ? <th className="adm-th w-32">Swatch</th> : null}
                    <th className="adm-th w-28">Price ±</th>
                    <th className="adm-th w-24">Grams ±</th>
                    <th className="adm-th w-24">Available</th>
                    <th className="adm-th w-16">Photos</th>
                    <th className="adm-th w-28"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {g.values.map((v, vi) => (
                    <tr key={v.key}>
                      <td className="adm-td">
                        <input aria-label={`${g.name} value ${vi + 1}`} className="adm-input h-8 coarse:h-10" maxLength={60} value={v.label} onChange={(e) => updateValue(g.key, v.key, { label: e.target.value })} />
                      </td>
                      {g.displayType === "swatches" ? (
                        <td className="adm-td">
                          <div className="flex">
                            <input
                              type="color"
                              aria-label={`${v.label} swatch`}
                              value={v.swatchHex && /^#[0-9a-fA-F]{6}$/.test(v.swatchHex) ? v.swatchHex : "#888888"}
                              onChange={(e) => updateValue(g.key, v.key, { swatchHex: e.target.value })}
                              className="h-8 w-8 cursor-pointer border border-input bg-background p-0.5 coarse:h-10"
                            />
                            <input aria-label={`${v.label} swatch hex`} className="adm-input num h-8 w-24 coarse:h-10" value={v.swatchHex || ""} onChange={(e) => updateValue(g.key, v.key, { swatchHex: e.target.value.trim() || null })} />
                          </div>
                        </td>
                      ) : null}
                      <td className="adm-td">
                        <input
                          aria-label={`${v.label} price change in EGP`}
                          type="number"
                          step="1"
                          className="adm-input num h-8 coarse:h-10"
                          value={v.priceDelta}
                          onChange={(e) => updateValue(g.key, v.key, { priceDelta: Number(e.target.value) || 0 })}
                          title={signed(v.priceDelta)}
                        />
                      </td>
                      <td className="adm-td">
                        <input aria-label={`${v.label} weight change in grams`} type="number" step="1" className="adm-input num h-8 coarse:h-10" value={v.gramsDelta} onChange={(e) => updateValue(g.key, v.key, { gramsDelta: Number(e.target.value) || 0 })} />
                      </td>
                      <td className="adm-td">
                        <Switch checked={v.isAvailable} onCheckedChange={(checked) => updateValue(g.key, v.key, { isAvailable: checked })} aria-label={`${v.label} available`} />
                      </td>
                      <td className="adm-td num text-muted-foreground">{photosFor(v.id)}</td>
                      <td className="px-1">
                        <div className="flex justify-end">
                          <button type="button" className="adm-icon-btn" disabled={vi === 0} onClick={() => updateGroup(g.key, { values: moveItem(g.values, vi, vi - 1) })} aria-label={`Move ${v.label} up`}>
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button type="button" className="adm-icon-btn" disabled={vi === g.values.length - 1} onClick={() => updateGroup(g.key, { values: moveItem(g.values, vi, vi + 1) })} aria-label={`Move ${v.label} down`}>
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <button type="button" className="adm-icon-btn hover:text-destructive" onClick={() => updateGroup(g.key, { values: g.values.filter((x) => x.key !== v.key) })} aria-label={`Remove ${v.label}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border p-2">
              <button
                type="button"
                className="adm-btn-ghost"
                onClick={() =>
                  updateGroup(g.key, {
                    values: [...g.values, { key: newKey(), label: "", swatchHex: null, priceDelta: 0, gramsDelta: 0, isAvailable: true }],
                  })
                }
              >
                <Plus className="h-4 w-4" aria-hidden="true" /> Add value
              </button>
            </div>
          </section>
        ))}
      </fieldset>

      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="adm-btn"
            disabled={saving}
            onClick={() =>
              setDrafts((d) => [
                ...d,
                {
                  key: newKey(),
                  name: "",
                  displayType: "buttons",
                  isRequired: true,
                  values: [{ key: newKey(), label: "", swatchHex: null, priceDelta: 0, gramsDelta: 0, isAvailable: true }],
                },
              ])
            }
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Add option group
          </button>
          <span className="flex-1" />
          {dirty ? <span className="text-xs text-amber-300">Unsaved option changes</span> : null}
          <button type="button" className="adm-btn" disabled={!dirty || saving} onClick={() => setDrafts(initial)}>
            Discard
          </button>
          <button type="button" className="adm-btn-primary" disabled={!dirty || saving} onClick={save}>
            {saving ? "Saving…" : "Save options"}
          </button>
        </div>
      ) : null}
      {problems.length && dirty ? (
        <ul className="list-disc pl-5 text-xs text-amber-300">
          {problems.slice(0, 4).map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
