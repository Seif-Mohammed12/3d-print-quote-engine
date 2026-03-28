export interface Material {
  name: string;
  density: number; // g/cm³
  costPerGram: number; // $
  color: string;
}

export const MATERIALS: Material[] = [
  { name: "PLA", density: 1.24, costPerGram: 0.04, color: "text-green-400" },
  { name: "PETG", density: 1.27, costPerGram: 0.06, color: "text-blue-400" },
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

// Layer heights and speed profiles tuned to typical FDM printers (~60mm/s)
const QUALITY_MULTIPLIERS: Record<Quality, { speed: number; cost: number; layer: number; label: string }> = {
  draft: { speed: 0.75, cost: 0.85, layer: 0.3, label: "0.3mm" },
  standard: { speed: 1.0, cost: 1.0, layer: 0.2, label: "0.2mm" },
  high: { speed: 1.8, cost: 1.3, layer: 0.12, label: "0.12mm" },
};

const BASE_FEE = 5.0;
const TIME_COST_PER_HOUR = 2.5;
const PRINT_SPEED_MM_S = 60; // typical print speed
const NOZZLE_WIDTH = 0.4; // mm

export function calculateQuote(
  volumeCm3: number,
  material: Material,
  quality: Quality,
  infill: number // 0-100
): QuoteResult {
  // Weight calculation: ~2 perimeter walls + top/bottom shells + infill
  const shellFraction = 0.15; // perimeters + top/bottom typically ~15% of volume
  const infillFraction = (1 - shellFraction) * (infill / 100);
  const effectiveFillRatio = shellFraction + infillFraction;
  const effectiveVolume = volumeCm3 * effectiveFillRatio;
  const weightGrams = effectiveVolume * material.density;

  const qualityMult = QUALITY_MULTIPLIERS[quality];
  const materialCost = weightGrams * material.costPerGram;

  // Print time estimate based on extrusion volume and layer height
  // Volume to extrude in mm³
  const extrusionVolumeMm3 = effectiveVolume * 1000; // cm³ → mm³
  // Cross-section of extruded line: layer_height × nozzle_width
  const lineArea = qualityMult.layer * NOZZLE_WIDTH; // mm²
  // Total travel distance in mm
  const travelMm = extrusionVolumeMm3 / lineArea;
  // Time in hours (speed adjusted by quality)
  const effectiveSpeed = PRINT_SPEED_MM_S / qualityMult.speed; // slower for higher quality
  const hours = (travelMm / effectiveSpeed) / 3600;
  // Add ~15% overhead for travel moves, retraction, heating, etc.
  const totalHours = hours * 1.15;
  const timeCost = totalHours * TIME_COST_PER_HOUR;

  const totalPrice = (materialCost + timeCost + BASE_FEE) * qualityMult.cost;

  const estimatedTime = formatTime(totalHours);

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
