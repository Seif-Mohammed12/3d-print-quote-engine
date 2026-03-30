import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { QuoteResult } from "./quote-calculator";

export interface CartItem {
  id: string;
  fileName: string;
  fileBuffer: ArrayBuffer;
  quote: QuoteResult;
  material: string;
  quality: string;
  infill: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
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

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, getTotalPrice }}>
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
