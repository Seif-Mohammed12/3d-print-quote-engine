import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/lib/cart-context";
import { AuthProvider } from "@/lib/auth-context";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoleRoute from "@/components/AdminRoleRoute";
import ScrollToTop from "@/components/ScrollToTop";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import RouteFallback from "@/components/RouteFallback";
const Index = lazy(() => import("./pages/Index"));
const Services = lazy(() => import("./pages/Services"));
const Products = lazy(() => import("./pages/Products"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Gallery = lazy(() => import("./pages/Gallery"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const Quote = lazy(() => import("./pages/Quote"));
const QuoteRequest = lazy(() => import("./pages/QuoteRequest"));
const QuoteConfirmation = lazy(() => import("./pages/QuoteConfirmation"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const ProductCheckout = lazy(() => import("./pages/ProductCheckout"));
const ProductOrderConfirmation = lazy(() => import("./pages/ProductOrderConfirmation"));
const ProductCart = lazy(() => import("./pages/ProductCart"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Account = lazy(() => import("./pages/Account"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminStats = lazy(() => import("./pages/admin/AdminStats"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function LegacyProductRedirect() {
  const { productId = "" } = useParams();
  return <Navigate to={`/products/${productId}`} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Sonner />
          {/* Navigations run as transitions so the current page stays on screen
              while the next lazy chunk loads; the skeleton only shows on first load. */}
          <BrowserRouter future={{ v7_startTransition: true }}>
            <ScrollToTop />
            <CookieConsentBanner />
            <Suspense fallback={<RouteFallback />}>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/services" element={<Services />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:productId" element={<ProductDetail />} />
            <Route path="/pforge" element={<Navigate to="/products" replace />} />
            <Route path="/pforge/:productId" element={<LegacyProductRedirect />} />
            <Route path="/printique" element={<Navigate to="/products" replace />} />
            <Route path="/printique/:productId" element={<LegacyProductRedirect />} />
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
            <Route path="/reset-password" element={<ResetPassword />} />
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
            <Route
              path="/admin/stats"
              element={
                <AdminRoleRoute>
                  <AdminStats />
                </AdminRoleRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
