import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { QuoteResult } from "./quote-calculator";
import type { BrandId } from "@/lib/brand-catalog";

export interface CartItem {
  id: string;
  fileName: string;
  fileBuffer: ArrayBuffer;
  quote: QuoteResult;
  material: string;
  quality: string;
  infill: number;
}

export interface ProductCartItem {
  id: string;
  brand: BrandId;
  productId: string;
  qty: number;
  primaryColorId: string;
  secondaryColorId: string;
  primaryColorName?: string;
  secondaryColorName?: string;
  ledsEnabled: boolean;
  unitPrice: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  getTotalPrice: () => number;

  productCart: ProductCartItem[];
  addProductToCart: (item: Omit<ProductCartItem, "id">) => void;
  removeProductFromCart: (id: string) => void;
  updateProductQty: (id: string, qty: number) => void;
  clearProductCart: () => void;
  getProductSubtotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("3d-print-cart");
    return saved ? JSON.parse(saved).map((item: any) => ({
      ...item,
      fileBuffer: new ArrayBuffer(0), // Files can't be stored in localStorage
    })) : [];
  });

  const [productCart, setProductCart] = useState<ProductCartItem[]>(() => {
    const saved = localStorage.getItem("3d-print-product-cart");
    if (!saved) return [];
    try {
      return JSON.parse(saved) as ProductCartItem[];
    } catch {
      return [];
    }
  });

  const addToCart = useCallback((item: CartItem) => {
    const newCart = [...cart, item];
    setCart(newCart);
    localStorage.setItem("3d-print-cart", JSON.stringify(newCart.map(({ fileBuffer, ...rest }) => rest)));
  }, [cart]);

  const removeFromCart = useCallback((id: string) => {
    const newCart = cart.filter(item => item.id !== id);
    setCart(newCart);
    localStorage.setItem("3d-print-cart", JSON.stringify(newCart.map(({ fileBuffer, ...rest }) => rest)));
  }, [cart]);

  const clearCart = useCallback(() => {
    setCart([]);
    localStorage.removeItem("3d-print-cart");
  }, []);

  const getTotalPrice = useCallback(() => {
    return cart.reduce((sum, item) => sum + item.quote.totalPrice, 0);
  }, [cart]);

  const addProductToCart = useCallback((item: Omit<ProductCartItem, "id">) => {
    const next: ProductCartItem[] = [
      ...productCart,
      { ...item, id: `${Date.now()}-${Math.random().toString(16).slice(2)}` },
    ];
    setProductCart(next);
    localStorage.setItem("3d-print-product-cart", JSON.stringify(next));
  }, [productCart]);

  const removeProductFromCart = useCallback((id: string) => {
    const next = productCart.filter((i) => i.id !== id);
    setProductCart(next);
    localStorage.setItem("3d-print-product-cart", JSON.stringify(next));
  }, [productCart]);

  const updateProductQty = useCallback((id: string, qty: number) => {
    const safeQty = Math.max(1, qty || 1);
    const next = productCart.map((i) => (i.id === id ? { ...i, qty: safeQty } : i));
    setProductCart(next);
    localStorage.setItem("3d-print-product-cart", JSON.stringify(next));
  }, [productCart]);

  const clearProductCart = useCallback(() => {
    setProductCart([]);
    localStorage.removeItem("3d-print-product-cart");
  }, []);

  const getProductSubtotal = useCallback(() => {
    return productCart.reduce((sum, i) => sum + i.unitPrice * Math.max(1, i.qty || 1), 0);
  }, [productCart]);

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      clearCart,
      getTotalPrice,
      productCart,
      addProductToCart,
      removeProductFromCart,
      updateProductQty,
      clearProductCart,
      getProductSubtotal,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
};
