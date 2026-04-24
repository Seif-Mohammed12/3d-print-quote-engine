import { Gamepad2, Headphones, MonitorSmartphone } from "lucide-react";
import { Sparkles, PictureInPicture2, Droplets } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type BrandId = "pforge" | "printique";

export type ProductColor = {
  id: string;
  name: string;
  hex: string;
};

export type ProductBundleItem = {
  productId: string;
  name: string;
  slug?: string;
  qty: number;
};

export type Product = {
  id: string;
  brand?: BrandId;
  name: string;
  short: string;
  description: string;
  basePrice: number;
  discount?: {
    enabled: boolean;
    price: number;
  };
  // Lucide icon component for list cards (optional).
  icon?: LucideIcon;
  images: string[];
  primaryColors: ProductColor[];
  secondaryColors: ProductColor[];
  supportsLeds: boolean;
  ledExtraPrice: number;
  isBundle?: boolean;
  bundleItems?: ProductBundleItem[];
};

const AVAILABLE_COLORS: ProductColor[] = [
  { id: "matte-black", name: "Matte Black", hex: "#0b0d12" },
  { id: "matte-white", name: "Matte White", hex: "#f3f4f6" },
  { id: "matte-gray", name: "Matte Gray", hex: "#9ca3af" },
  { id: "matte-light-blue", name: "Matte Light Blue", hex: "#5ca8c7" },
  { id: "matte-red", name: "Matte Red", hex: "#e03131" },
];

export const brandCatalog: Record<
  BrandId,
  {
    products: Product[];
  }
> = {
  pforge: {
    products: [
      {
        id: "pforge-stand-ps5",
        name: "DualSense Display Stand",
        short: "Clean desk, hero setup.",
        description:
          "Low-profile stand for PS5 and Xbox controllers with cable pass-through and anti-slip feet.",
        basePrice: 550,
        discount: { enabled: true, price: 480 },
        icon: Gamepad2,
        images: [
          "/pforge/pxl_20241220_152545198.webp",
          "/pforge/pxl_20241220_152620781.webp",
        ],
        primaryColors: AVAILABLE_COLORS,
        secondaryColors: AVAILABLE_COLORS,
        supportsLeds: false,
        ledExtraPrice: 0,
      },
      {
        id: "pforge-headset-hook",
        name: "Headset Stand",
        short: "Show off your gear.",
        description:
          "Sleek grid-patterned stand, the perfect minimalist touch for your headphones.",
        basePrice: 220,
        discount: { enabled: false, price: 0 },
        icon: Headphones,
        images: [],
        primaryColors: AVAILABLE_COLORS,
        secondaryColors: AVAILABLE_COLORS,
        supportsLeds: false,
        ledExtraPrice: 100,
      },
      {
        id: "pforge-dock",
        name: "Desk Dock Combo",
        short: "Controller + phone + cards.",
        description:
          "All-in-one dock for controllers, phone and small accessories—made to tidy up your desk.",
        basePrice: 480,
        discount: { enabled: false, price: 0 },
        icon: MonitorSmartphone,
        images: [],
        primaryColors: AVAILABLE_COLORS,
        secondaryColors: AVAILABLE_COLORS,
        supportsLeds: false,
        ledExtraPrice: 110,
      },
    ],
  },
  printique: {
    products: [
      {
        id: "printique-vase",
        name: "Organic Flow Vase",
        short: "Modern decor.",
        description:
          "Soft curves and layered contours that look sculpted—perfect for dried flowers and desk styling.",
        basePrice: 280,
        discount: { enabled: false, price: 0 },
        icon: Droplets,
        images: [],
        primaryColors: AVAILABLE_COLORS,
        secondaryColors: AVAILABLE_COLORS,
        supportsLeds: false,
        ledExtraPrice: 0,
      },
      {
        id: "printique-panel",
        name: "Geometric Wall Panel",
        short: "Wall art.",
        description:
          "Interlocking tiles that add depth and texture—an easy way to make a wall feel finished.",
        basePrice: 450,
        discount: { enabled: false, price: 0 },
        icon: PictureInPicture2,
        images: [],
        primaryColors: AVAILABLE_COLORS,
        secondaryColors: AVAILABLE_COLORS,
        supportsLeds: false,
        ledExtraPrice: 0,
      },
      {
        id: "printique-tray",
        name: "Halo Catch-All Tray",
        short: "Everyday objects.",
        description:
          "An elegant tray for keys, watches or jewelry—simple shape, tidy result.",
        basePrice: 230,
        discount: { enabled: false, price: 0 },
        icon: Sparkles,
        images: [],
        primaryColors: AVAILABLE_COLORS,
        secondaryColors: AVAILABLE_COLORS,
        supportsLeds: false,
        ledExtraPrice: 0,
      },
    ],
  },
};

