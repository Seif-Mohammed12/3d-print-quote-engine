import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/lib/cart-context";
import Index from "./pages/Index";
import Services from "./pages/Services";
import Pforge from "./pages/Pforge";
import Printique from "./pages/Printique";
import BrandProductDetail from "./pages/BrandProductDetail";
import Gallery from "./pages/Gallery";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Quote from "./pages/Quote";
import QuoteRequest from "./pages/QuoteRequest";
import QuoteConfirmation from "./pages/QuoteConfirmation";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import ProductCheckout from "./pages/ProductCheckout";
import ProductOrderConfirmation from "./pages/ProductOrderConfirmation";
import ProductCart from "./pages/ProductCart";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminGuard from "./components/admin/AdminGuard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CartProvider>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/services" element={<Services />} />
            <Route path="/pforge" element={<Pforge />} />
            <Route
              path="/pforge/:productId"
              element={<BrandProductDetail brand="pforge" />}
            />
            <Route path="/printique" element={<Printique />} />
            <Route
              path="/printique/:productId"
              element={<BrandProductDetail brand="printique" />}
            />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/quote" element={<Quote />} />
            <Route path="/quote-request" element={<QuoteRequest />} />
            <Route path="/quote-confirmation" element={<QuoteConfirmation />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-confirmation" element={<OrderConfirmation />} />
            <Route path="/product-checkout" element={<ProductCheckout />} />
            <Route path="/product-cart" element={<ProductCart />} />
            <Route
              path="/product-order-confirmation"
              element={<ProductOrderConfirmation />}
            />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <AdminGuard>
                  <AdminDashboard />
                </AdminGuard>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </CartProvider>
  </QueryClientProvider>
);

export default App;
