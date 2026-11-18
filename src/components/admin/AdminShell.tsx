import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { LogOut, Menu, Search } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth-context";
import { useAdminPermissions } from "@/lib/admin/roles";
import CommandPalette from "@/components/admin/CommandPalette";
import { ADMIN_NAV } from "@/components/admin/nav";
import { cn } from "@/lib/utils";

function isMac() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  return (
    <nav aria-label="Admin" className="flex flex-col gap-0.5 px-2">
      {ADMIN_NAV.map((item) => {
        const Icon = item.icon;
        const sectionActive = item.end ? location.pathname === item.href : location.pathname.startsWith(item.href);
        return (
          <div key={item.href}>
            <NavLink
              to={item.href}
              end={item.end || Boolean(item.children)}
              onClick={onNavigate}
              className={cn(
                "flex h-10 items-center gap-3 px-3 text-sm transition-colors coarse:h-11",
                sectionActive ? "bg-accent font-semibold text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              )}
              aria-current={location.pathname === item.href ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1">{item.label}</span>
              {item.note ? <span className="text-[11px] font-normal text-muted-foreground">{item.note}</span> : null}
            </NavLink>
            {item.children && sectionActive ? (
              <div className="mb-1 ml-[30px] mt-0.5 flex flex-col border-l border-border">
                {item.children.map((child) => (
                  <NavLink
                    key={child.href}
                    to={child.href}
                    end
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "-ml-px flex h-9 items-center border-l px-3 text-sm coarse:h-11",
                        isActive ? "border-ink text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                      )
                    }
                  >
                    {child.label}
                  </NavLink>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

function AccountBlock() {
  const { user, signOut } = useAuth();
  const { role } = useAdminPermissions();
  return (
    <div className="border-t border-border p-3 text-sm">
      <p className="truncate text-foreground" dir="auto" title={user?.email || ""}>
        {user?.email}
      </p>
      <p className="text-xs capitalize text-muted-foreground">{role}</p>
      <div className="mt-2 flex gap-1">
        <Link to="/" className="adm-btn-ghost -ml-2.5 h-9 text-xs">
          View shop
        </Link>
        <button
          type="button"
          className="adm-btn-ghost h-9 text-xs"
          onClick={async () => {
            await signOut();
            window.location.href = "/login";
          }}
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Sign out
        </button>
      </div>
    </div>
  );
}

type AdminShellProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** Full-bleed pages (board views) drop the max width. */
  wide?: boolean;
};

export default function AdminShell({ title, description, actions, children, wide }: AdminShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    document.title = `${title} · Admin · 3D Print It`;
    return () => {
      document.title = "3D Print It";
    };
  }, [title]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const shortcut = isMac() ? "⌘K" : "Ctrl K";

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-background text-sm">
        <a
          href="#admin-main"
          className="sr-only z-50 bg-primary px-4 py-2 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-2"
        >
          Skip to content
        </a>

        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-card lg:flex">
          <div className="flex h-14 items-center gap-2 px-5">
            <Link to="/admin" className="text-[15px] font-bold tracking-[-0.01em]">
              3D Print It <span className="font-normal text-muted-foreground">Admin</span>
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="mx-4 mb-3 flex h-9 items-center gap-2 border border-border px-2.5 text-left text-xs text-muted-foreground hover:border-rule hover:text-foreground"
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="flex-1">Jump to…</span>
            <kbd className="font-sans text-[11px]">{shortcut}</kbd>
          </button>
          <div className="flex-1 overflow-y-auto">
            <SidebarNav />
          </div>
          <AccountBlock />
        </aside>

        {/* Phone and tablet bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-card px-2 lg:hidden">
          <button type="button" className="adm-icon-btn h-11 w-11" onClick={() => setMenuOpen(true)} aria-label="Open admin menu">
            <Menu className="h-5 w-5" />
          </button>
          <p className="flex-1 truncate text-[15px] font-semibold">{title}</p>
          <button type="button" className="adm-icon-btn h-11 w-11" onClick={() => setPaletteOpen(true)} aria-label="Search and jump">
            <Search className="h-5 w-5" />
          </button>
        </header>
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent side="left" className="flex w-72 flex-col gap-0 bg-card p-0">
            <SheetTitle className="flex h-14 items-center px-5 text-[15px] font-bold">
              3D Print It <span className="ml-1 font-normal text-muted-foreground">Admin</span>
            </SheetTitle>
            <div className="flex-1 overflow-y-auto">
              <SidebarNav onNavigate={() => setMenuOpen(false)} />
            </div>
            <AccountBlock />
          </SheetContent>
        </Sheet>

        <main id="admin-main" className="lg:pl-60">
          <div className={cn("px-4 pb-16 pt-5 md:px-8 md:pt-8", wide ? "" : "max-w-[1200px]")}>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <h1 className="hidden text-2xl font-bold tracking-[-0.02em] lg:block">{title}</h1>
                {description ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
              </div>
              {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
            </div>
            {children}
          </div>
        </main>

        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      </div>
    </MotionConfig>
  );
}
