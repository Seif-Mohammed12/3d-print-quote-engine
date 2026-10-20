import { useMemo, useState, useEffect } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Minus, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/lib/cart-context";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getProduct } from "@/lib/product-order";
import { useAuth } from "@/lib/auth-context";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQueries } from "@tanstack/react-query";
import { fetchPublicProducts, mapDbProductToLegacyProduct } from "@/lib/products-api";
import { cacheProducts } from "@/lib/runtime-product-cache";
import { formatEGP } from "@/lib/catalog-format";
import BrandLogo from "@/components/BrandLogo";
import type { BrandId, Product } from "@/lib/brand-catalog";

const navLinks = [
  { to: "/products", label: "Shop" },
  { to: "/services", label: "Custom prints" },
  { to: "/gallery", label: "Gallery" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartPreviewOpen, setCartPreviewOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, signOut, user } = useAuth();
  const { productCart, getProductSubtotal, removeProductFromCart, updateProductQty } = useCart();
  const productCount = productCart.reduce((sum, item) => sum + Math.max(1, item.qty || 1), 0);
  const subtotal = getProductSubtotal();

  // Close the menu when location changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const brandsInCart = useMemo(
    () => Array.from(new Set(productCart.map((item) => item.brand))) as BrandId[],
    [productCart]
  );

  const brandQueries = useQueries({
    queries: brandsInCart.map((brand) => ({
      queryKey: ["brand-products", brand],
      queryFn: async () => {
        const live = await fetchPublicProducts(brand);
        const mapped = live.map(mapDbProductToLegacyProduct);
        cacheProducts(brand, mapped);
        return mapped;
      },
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      enabled: cartPreviewOpen && productCart.length > 0,
    })),
  });

  const liveProductMap = useMemo(() => {
    const map = new Map<string, Product>();
    brandsInCart.forEach((brand, idx) => {
      const rows = brandQueries[idx]?.data || [];
      rows.forEach((p) => map.set(`${brand}:${p.id}`, p));
    });
    return map;
  }, [brandsInCart, brandQueries]);

  const isCatalogLoading = brandQueries.some((query) => query.isPending);

  const resolveProduct = (brand: BrandId, productId: string) => {
    return liveProductMap.get(`${brand}:${productId}`) || getProduct(brand, productId);
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex min-h-11 items-center text-[15px] transition-colors ${
      isActive ? "text-foreground underline decoration-ink decoration-2 underline-offset-[10px]" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-border bg-background">
        <div className="frame flex h-14 items-center justify-between gap-6">
          <Link to="/" className="inline-flex min-h-11 items-center text-foreground" aria-label="3D Print It, home">
            <BrandLogo size={28} />
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
            {navLinks.map((link) => (
              <NavLink key={link.to} to={link.to} className={navItemClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-3">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="hidden min-h-11 px-2 text-[15px] text-muted-foreground transition-colors hover:text-foreground sm:inline-flex sm:items-center"
                  >
                    Account
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <p className="text-xs font-normal text-muted-foreground">Signed in as</p>
                    <p className="truncate" dir="auto">{user?.email || "My account"}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={isAdmin ? "/admin" : "/account"} className="cursor-pointer">
                      {isAdmin ? "Admin dashboard" : "Dashboard"}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/orders" className="cursor-pointer">
                      Orders
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin/orders" className="cursor-pointer">
                        Admin orders
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await signOut();
                      navigate("/");
                    }}
                  >
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                to="/login"
                className="hidden min-h-11 items-center px-2 text-[15px] text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
              >
                Log in
              </Link>
            )}

            <button
              type="button"
              onClick={() => setCartPreviewOpen(true)}
              className="inline-flex min-h-11 items-center px-2 text-[15px] font-semibold text-foreground"
              aria-label={`Cart, ${productCount} ${productCount === 1 ? "item" : "items"}`}
            >
              Cart
              <span
                className={`ml-1.5 inline-flex h-6 min-w-6 items-center justify-center px-1.5 text-[13px] ${
                  productCount > 0 ? "bg-ink text-ink-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {productCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="inline-flex min-h-11 items-center pl-2 text-[15px] font-semibold text-foreground md:hidden"
              aria-expanded={menuOpen}
              aria-controls="site-menu"
            >
              Menu
            </button>
          </div>
        </div>
      </header>

      {/* Phone menu: a full sheet, links set large like a track list */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="site-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex flex-col bg-background"
          >
            <div className="frame flex h-14 items-center justify-between border-b border-border">
              <BrandLogo size={28} />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold"
              >
                Close <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <nav aria-label="Main" className="frame ruled flex-1 overflow-y-auto pt-2">
              {[{ to: "/", label: "Home" }, ...navLinks, { to: "/quote", label: "Get a price for your file" }].map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === "/"}
                  className={({ isActive }) =>
                    `flex min-h-[60px] items-center text-[26px] font-bold tracking-[-0.02em] ${
                      isActive ? "text-foreground" : "text-muted-foreground"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
            <div className="frame flex gap-6 border-t border-border py-5 text-[15px]">
              {isAuthenticated ? (
                <>
                  <Link to={isAdmin ? "/admin" : "/account"} className="link-quiet">Account</Link>
                  <Link to="/orders" className="link-quiet">Orders</Link>
                </>
              ) : (
                <Link to="/login" className="link-quiet">Log in</Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart preview */}
      <Dialog open={cartPreviewOpen} onOpenChange={setCartPreviewOpen}>
        <DialogContent className="max-w-xl gap-0 p-0">
          <DialogHeader className="border-b border-border p-5 text-left">
            <DialogTitle className="text-2xl font-bold">Your cart</DialogTitle>
            <DialogDescription>
              {productCart.length === 0 ? "Nothing in here yet." : `${productCount} ${productCount === 1 ? "item" : "items"}, printed to order.`}
            </DialogDescription>
          </DialogHeader>

          {productCart.length === 0 ? (
            <div className="p-5">
              <button
                type="button"
                onClick={() => {
                  setCartPreviewOpen(false);
                  navigate("/products");
                }}
                className="btn-secondary w-full"
              >
                Browse the shop
              </button>
            </div>
          ) : (
            <div>
              <div className="ruled max-h-[50vh] overflow-y-auto px-5">
                {productCart.map((item) => {
                  const product = resolveProduct(item.brand, item.productId);
                  const itemName = product?.name || item.productName || (isCatalogLoading ? "Loading product..." : "Product unavailable");
                  const primary = product?.primaryColors.find((c) => c.id === item.primaryColorId)?.name || (isCatalogLoading ? "Loading..." : "N/A");
                  const hasSecondaryColors = (product?.secondaryColors.length || 0) > 0;
                  const secondary = hasSecondaryColors
                    ? product?.secondaryColors.find((c) => c.id === item.secondaryColorId)?.name || (isCatalogLoading ? "Loading..." : "N/A")
                    : null;
                  return (
                    <div key={item.id} className="flex items-start justify-between gap-4 py-4">
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {itemName}
                          {item.isBundle ? <span className="ml-2 text-sm font-normal text-ink">Bundle</span> : null}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {primary}
                          {hasSecondaryColors ? ` / ${secondary}` : ""}
                        </p>
                        {item.isBundle && item.bundleItems?.length ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            Includes {item.bundleItems.map((bundleItem) => `${bundleItem.name}${bundleItem.qty > 1 ? ` x${bundleItem.qty}` : ""}`).join(", ")}
                          </p>
                        ) : null}
                        <div className="mt-3 inline-flex items-center border border-rule">
                          <button
                            type="button"
                            onClick={() => updateProductQty(item.id, Math.max(1, item.qty - 1))}
                            className="inline-flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                            aria-label={`Decrease quantity of ${itemName}`}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="min-w-8 text-center text-sm font-semibold">{Math.max(1, item.qty)}</span>
                          <button
                            type="button"
                            onClick={() => updateProductQty(item.id, item.qty + 1)}
                            className="inline-flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                            aria-label={`Increase quantity of ${itemName}`}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold">{formatEGP(item.unitPrice * Math.max(1, item.qty))}</p>
                        <button
                          type="button"
                          onClick={() => removeProductFromCart(item.id)}
                          className="mt-2 min-h-10 text-sm text-muted-foreground underline decoration-rule underline-offset-4 hover:text-destructive"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-4 border-t border-border p-5">
                <div className="flex items-baseline justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-xl font-bold">{formatEGP(subtotal)}</span>
                </div>
                <p className="text-sm text-muted-foreground">Delivery is confirmed after you order. Pay cash on delivery or by InstaPay.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCartPreviewOpen(false);
                      navigate("/product-cart");
                    }}
                    className="btn-secondary flex-1 px-3"
                  >
                    View cart
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCartPreviewOpen(false);
                      sessionStorage.setItem("productCartCheckout", "true");
                      navigate("/product-checkout");
                    }}
                    className="btn-primary flex-1 px-3"
                  >
                    Checkout
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Navbar;
