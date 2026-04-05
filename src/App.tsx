import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/lib/cart-context";
import { AuthProvider } from "@/lib/auth-context";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoleRoute from "@/components/AdminRoleRoute";
import ScrollToTop from "@/components/ScrollToTop";
import Index from "./pages/Index";
import Services from "./pages/Services";
import Pforge from "./pages/Pforge";
import Printique from "./pages/Printique";
import BrandProductDetail from "./pages/BrandProductDetail";
import Gallery from "./pages/Gallery";
import About from "./pages/About";
import Contact from "./pages/Contact";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import RefundPolicy from "./pages/RefundPolicy";
import Quote from "./pages/Quote";
import QuoteRequest from "./pages/QuoteRequest";
import QuoteConfirmation from "./pages/QuoteConfirmation";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import ProductCheckout from "./pages/ProductCheckout";
import ProductOrderConfirmation from "./pages/ProductOrderConfirmation";
import ProductCart from "./pages/ProductCart";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AuthCallback from "./pages/AuthCallback";
import Account from "./pages/Account";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrders from "./pages/admin/AdminOrders";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
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
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
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
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <Account />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/:orderId"
              element={
                <ProtectedRoute>
                  <OrderDetail />
                </ProtectedRoute>
              }
            />
            <Route path="/admin/login" element={<Navigate to="/login" replace />} />
            <Route
              path="/admin"
              element={
                <AdminRoleRoute>
                  <AdminDashboard />
                </AdminRoleRoute>
              }
            />
            <Route
              path="/admin/orders"
              element={
                <AdminRoleRoute>
                  <AdminOrders />
                </AdminRoleRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
