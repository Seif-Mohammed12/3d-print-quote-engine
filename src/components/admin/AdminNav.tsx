import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ClipboardList, BarChart3 } from "lucide-react";

export default function AdminNav() {
  const location = useLocation();

  const navItems = [
    { label: "Products", href: "/admin", icon: LayoutDashboard },
    { label: "Orders", href: "/admin/orders", icon: ClipboardList },
    { label: "Statistics", href: "/admin/stats", icon: BarChart3 },
  ];

  return (
    <div className="flex gap-1 border-b border-border overflow-x-auto">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.href;

        return (
          <Link
            key={item.href}
            to={item.href}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
