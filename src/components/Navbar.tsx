import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, ShoppingCart, Minus, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/lib/cart-context";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getProduct } from "@/lib/product-order";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/pforge", label: "Pforge" },
  { to: "/printique", label: "Printique" },
  { to: "/gallery", label: "Gallery" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/quote", label: "Get a Quote", highlight: true },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [cartPreviewOpen, setCartPreviewOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { productCart, getProductSubtotal, removeProductFromCart, updateProductQty } = useCart();
  const productCount = productCart.reduce((sum, item) => sum + Math.max(1, item.qty || 1), 0);
  const subtotal = getProductSubtotal();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative h-9 w-9 overflow-hidden rounded-xl bg-slate-900/80 ring-1 ring-primary/40 shadow-[0_0_18px_-6px_hsl(var(--neon-glow)/0.8)]">
            <img
              src="/logos/3d-print-it-logo.png"
              alt="3D Print It logo"
              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          <span className="font-heading font-bold text-lg text-foreground">
            3D Print <span className="text-primary">It</span>
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                link.highlight
                  ? "bg-primary text-primary-foreground hover:shadow-[0_0_20px_-5px_hsl(var(--neon-glow)/0.5)]"
                  : location.pathname === link.to
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setCartPreviewOpen(true)}
            className="relative ml-1 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-300 flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            {productCart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">
                {productCount}
              </span>
            )}
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-foreground p-2"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border/50 overflow-hidden"
          >
            <div className="flex flex-col p-4 gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    link.highlight
                      ? "bg-primary text-primary-foreground"
                      : location.pathname === link.to
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setCartPreviewOpen(true);
                }}
                className="relative mt-1 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all text-left"
              >
                View cart
                {productCart.length > 0 && (
                  <span className="absolute top-2 right-3 min-w-5 h-5 px-1 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">
                    {productCount}
                  </span>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={cartPreviewOpen} onOpenChange={setCartPreviewOpen}>
        <DialogContent className="max-w-xl border-slate-800 bg-slate-950 text-slate-100">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">Cart Preview</DialogTitle>
            <DialogDescription className="text-slate-400">
              Quickly review your items while you shop.
            </DialogDescription>
          </DialogHeader>

          {productCart.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-center">
              <p className="text-sm text-slate-300">Your cart is empty.</p>
              <button
                type="button"
                onClick={() => setCartPreviewOpen(false)}
                className="mt-4 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800/60 transition-colors"
              >
                Continue shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
                {productCart.map((item) => {
                  const product = getProduct(item.brand, item.productId);
                  const primary = product?.primaryColors.find((c) => c.id === item.primaryColorId)?.name || item.primaryColorId;
                  const secondary =
                    product?.secondaryColors.find((c) => c.id === item.secondaryColorId)?.name || item.secondaryColorId;
                  return (
                    <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-100">{product?.name || item.productId}</p>
                          <p className="mt-1 text-xs text-slate-400">{item.brand.toUpperCase()}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            Primary: {primary} • Secondary: {secondary}
                          </p>
                          <div className="mt-3 inline-flex items-center rounded-lg border border-slate-700 bg-slate-900/70">
                            <button
                              type="button"
                              onClick={() => updateProductQty(item.id, Math.max(1, item.qty - 1))}
                              className="px-2.5 py-1.5 text-slate-300 hover:text-white"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-8 text-center text-xs font-semibold text-slate-200">
                              {Math.max(1, item.qty)}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateProductQty(item.id, item.qty + 1)}
                              className="px-2.5 py-1.5 text-slate-300 hover:text-white"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-primary">
                            EGP{(item.unitPrice * Math.max(1, item.qty)).toFixed(0)}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeProductFromCart(item.id)}
                            className="mt-2 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Items</span>
                  <span className="text-slate-100">{productCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-slate-100">EGP{subtotal.toFixed(0)}</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCartPreviewOpen(false);
                      navigate("/product-cart");
                    }}
                    className="flex-1 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-800/70 transition-colors"
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
                    className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95 transition-opacity"
                  >
                    Checkout
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </nav>
  );
};

export default Navbar;
