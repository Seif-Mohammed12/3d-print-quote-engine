import { BarChart3, Boxes, CalendarCheck, ClipboardList, FileQuestion, Settings, Users } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: typeof BarChart3;
  end?: boolean;
  note?: string;
  children?: Array<{ label: string; href: string }>;
};

export const ADMIN_NAV: NavItem[] = [
  { label: "Today", href: "/admin", icon: CalendarCheck, end: true },
  { label: "Orders", href: "/admin/orders", icon: ClipboardList },
  { label: "Quotes", href: "/admin/quotes", icon: FileQuestion, note: "Not connected" },
  {
    label: "Catalogue",
    href: "/admin/catalogue",
    icon: Boxes,
    children: [
      { label: "Products", href: "/admin/catalogue" },
      { label: "Colours", href: "/admin/catalogue/colours" },
      { label: "Categories", href: "/admin/catalogue/categories" },
    ],
  },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Insights", href: "/admin/insights", icon: BarChart3 },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

