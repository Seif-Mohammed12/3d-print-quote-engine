export interface Material {
  name: string;
  density: number; // g/cm³
  costPerGram: number; // EGP
  color: string;
}

export const MATERIALS: Material[] = [
  { name: "PLA", density: 1.24, costPerGram: 4, color: "text-green-400" },
  { name: "PETG", density: 1.27, costPerGram: 4, color: "text-blue-400" },
];

export type Quality = "draft" | "standard" | "high";

export interface QuoteResult {
  volumeCm3: number;
  weightGrams: number;
  materialCost: number;
  timeCost: number;
  totalPrice: number;
  estimatedTime: string;
  material: Material;
  quality: Quality;
  infill: number;
}

// Layer heights and speed profiles tuned for 0.6mm nozzle and Sprite extruder
const QUALITY_MULTIPLIERS: Record<Quality, { speed: number; cost: number; layer: number; label: string }> = {
  draft: { speed: 0.75, cost: 0.85, layer: 0.3, label: "0.3mm" },
  standard: { speed: 1.0, cost: 1.0, layer: 0.2, label: "0.2mm" },
  high: { speed: 1.8, cost: 1.3, layer: 0.12, label: "0.12mm" },
};

const TIME_COST_PER_HOUR = 20.0;

// Time cost tiers (in EGP)
const TIME_COST_FREE_THRESHOLD = 5; // hours
const TIME_COST_MEDIUM_THRESHOLD = 15; // hours
const TIME_COST_FREE = 0;
const TIME_COST_MEDIUM = 100;
const TIME_COST_HIGH = 150;

// Typical material deposition rates (grams/hour) at standard quality
// Adjusted for 0.6mm nozzle and Sprite extruder (~100-120mm/s)
const GRAMS_PER_HOUR_STANDARD = 15.0;

export function calculateQuote(
  volumeCm3: number,
  material: Material,
  quality: Quality,
  infill: number // 0-100
): QuoteResult {
  // Weight: shells (walls + top/bottom) typically consume ~67% of solid volume
  // on average-sized models with 3 perimeters + 4 top/bottom layers
  const shellFraction = 0.67;
  const infillFraction = (1 - shellFraction) * (infill / 100);
  const effectiveFillRatio = shellFraction + infillFraction;
  const effectiveVolume = volumeCm3 * effectiveFillRatio;
  const weightGrams = effectiveVolume * material.density;

  const qualityMult = QUALITY_MULTIPLIERS[quality];
  const materialCost = weightGrams * material.costPerGram;

  // Print time: weight-based heuristic calibrated to real prints
  // ~15 g/hr at standard with 0.6mm nozzle and Sprite extruder, slower for high quality, faster for draft
  const gramsPerHour = GRAMS_PER_HOUR_STANDARD / qualityMult.speed;
  const totalHours = weightGrams / gramsPerHour;
  
  // Time cost tiers
  let timeCost: number;
  if (totalHours <= TIME_COST_FREE_THRESHOLD) {
    timeCost = TIME_COST_FREE;
  } else if (totalHours <= TIME_COST_MEDIUM_THRESHOLD) {
    timeCost = TIME_COST_MEDIUM;
  } else {
    timeCost = TIME_COST_HIGH;
  }

  const totalPrice = (materialCost + timeCost) * qualityMult.cost;

  const estimatedTime = formatTime(totalHours);

  return {
    volumeCm3,
    weightGrams,
    materialCost,
    timeCost,
    totalPrice,
    estimatedTime,
    material,
    quality,
    infill,
  };
}

function formatTime(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
