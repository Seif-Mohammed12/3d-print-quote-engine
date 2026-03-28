export interface Material {
  name: string;
  density: number; // g/cm³
  costPerGram: number; // $
  color: string;
}

export const MATERIALS: Material[] = [
  { name: "PLA", density: 1.24, costPerGram: 0.04, color: "text-green-400" },
  { name: "ABS", density: 1.04, costPerGram: 0.05, color: "text-orange-400" },
  { name: "PETG", density: 1.27, costPerGram: 0.06, color: "text-blue-400" },
  { name: "Resin", density: 1.10, costPerGram: 0.12, color: "text-purple-400" },
  { name: "Nylon", density: 1.15, costPerGram: 0.10, color: "text-cyan-400" },
  { name: "TPU", density: 1.21, costPerGram: 0.08, color: "text-pink-400" },
];

export type Quality = "draft" | "standard" | "high";

export interface QuoteResult {
  volumeCm3: number;
  weightGrams: number;
  materialCost: number;
  timeCost: number;
  baseFee: number;
  totalPrice: number;
  estimatedTime: string;
  material: Material;
  quality: Quality;
  infill: number;
}

const QUALITY_MULTIPLIERS: Record<Quality, { speed: number; cost: number; layer: string }> = {
  draft: { speed: 0.7, cost: 0.85, layer: "0.3mm" },
  standard: { speed: 1.0, cost: 1.0, layer: "0.2mm" },
  high: { speed: 1.6, cost: 1.3, layer: "0.1mm" },
};

const BASE_FEE = 5.0;
const TIME_COST_PER_HOUR = 2.5;

export function calculateQuote(
  volumeCm3: number,
  material: Material,
  quality: Quality,
  infill: number // 0-100
): QuoteResult {
  const infillFactor = 0.3 + (infill / 100) * 0.7; // shell + infill contribution
  const effectiveVolume = volumeCm3 * infillFactor;
  const weightGrams = effectiveVolume * material.density;

  const qualityMult = QUALITY_MULTIPLIERS[quality];
  const materialCost = weightGrams * material.costPerGram;

  // Rough print time heuristic: ~20cm³/hr at standard, adjusted by quality
  const baseHours = effectiveVolume / 20;
  const hours = baseHours * qualityMult.speed;
  const timeCost = hours * TIME_COST_PER_HOUR;

  const totalPrice = (materialCost + timeCost + BASE_FEE) * qualityMult.cost;

  const estimatedTime = formatTime(hours);

  return {
    volumeCm3,
    weightGrams,
    materialCost,
    timeCost,
    baseFee: BASE_FEE,
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
