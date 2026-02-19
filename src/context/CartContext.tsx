import React, { createContext, useContext, useState, useCallback } from 'react';
import { Product, getSmartPrice } from '@/data/products';

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity: number, color: string) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalRetail: number;
  totalSmart: number;
  totalSavings: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const addItem = useCallback((product: Product, quantity: number, color: string) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id && i.selectedColor === color);
      if (existing) {
        return prev.map(i =>
          i.product.id === product.id && i.selectedColor === color
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { product, quantity, selectedColor: color }];
    });
    setIsCartOpen(true);
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems(prev => prev.filter(i => i.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(i => i.product.id !== productId));
    } else {
      setItems(prev => prev.map(i => i.product.id === productId ? { ...i, quantity } : i));
    }
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalRetail = items.reduce((sum, i) => sum + i.product.retailPrice * i.quantity, 0);
  const totalSmart = items.reduce((sum, i) => {
    const { price } = getSmartPrice(i.product.retailPrice, i.product.box06Price, i.product.box12Price, i.quantity);
    return sum + price * i.quantity;
  }, 0);
  const totalSavings = totalRetail - totalSmart;

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQuantity, clearCart,
      totalItems, totalRetail, totalSmart, totalSavings,
      isCartOpen, setIsCartOpen,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
