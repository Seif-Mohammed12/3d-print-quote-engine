import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, ShoppingCart, ArrowLeft, FileType, DollarSign, Clock, Weight } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { useCart } from "@/lib/cart-context";

const Cart = () => {
  const navigate = useNavigate();
  const { cart, removeFromCart, getTotalPrice, clearCart } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  if (cart.length === 0) {
    return (
      <Layout>
        <section className="section-padding">
          <div className="container mx-auto max-w-2xl">
            <SectionHeading title="Your Cart" subtitle="Order multiple prints at once" />
            <div className="glass-card p-12 text-center">
              <ShoppingCart className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Your cart is empty</h3>
              <p className="text-muted-foreground mb-6">Add some 3D prints to get started</p>
              <Link
                to="/quote"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:shadow-[0_0_20px_-5px_hsl(var(--neon-glow)/0.5)] transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Quote
              </Link>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="section-padding">
        <div className="container mx-auto max-w-4xl">
          <SectionHeading title="Your Cart" subtitle={`${cart.length} item${cart.length !== 1 ? 's' : ''} ready to order`} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              <AnimatePresence>
                {cart.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <FileType className="w-5 h-5 text-primary" />
                        <div>
                          <h4 className="font-semibold text-foreground">{item.fileName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {item.material} • {item.quality} • {item.infill}%
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-primary">EGP{item.quote.totalPrice.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Weight className="w-4 h-4" />
                        <span>{item.quote.weightGrams.toFixed(1)}g</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{item.quote.estimatedTime}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="w-4 h-4" />
                        <span>EGP{item.quote.materialCost.toFixed(2)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="w-full py-2 rounded-lg border border-border hover:border-red-500 hover:text-red-500 text-muted-foreground transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Remove from Cart
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 sticky top-24 space-y-4"
              >
                <h3 className="font-heading font-semibold text-foreground">Order Summary</h3>

                <div className="space-y-2 pb-4 border-b border-border">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Items</span>
                    <span className="text-foreground">{cart.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Weight</span>
                    <span className="text-foreground">{cart.reduce((sum, item) => sum + item.quote.weightGrams, 0).toFixed(1)}g</span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-foreground">Total</span>
                  <p className="text-3xl font-heading font-bold neon-text">
                    EGP{getTotalPrice().toFixed(2)}
                  </p>
                </div>

                <p className="text-xs text-muted-foreground">
                  * Final pricing may vary after detailed review
                </p>

                <button
                  onClick={() => navigate("/checkout")}
                  disabled={isCheckingOut}
                  className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:shadow-[0_0_20px_-5px_hsl(var(--neon-glow)/0.5)] transition-all disabled:opacity-50"
                >
                  Proceed to Checkout
                </button>

                <button
                  onClick={() => clearCart()}
                  className="w-full py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors text-sm"
                >
                  Clear Cart
                </button>

                <Link
                  to="/quote"
                  className="block text-center py-2 rounded-lg bg-secondary/50 text-secondary-foreground hover:bg-secondary transition-colors text-sm"
                >
                  Continue Shopping
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Cart;
