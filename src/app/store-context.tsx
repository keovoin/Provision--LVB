import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface CartLine {
  productId: string;
  nameKm: string;
  nameEn: string;
  unitKm: string;
  photoPath?: string | null;
  quantity: number;
  retailPrice: number;
  casePrice: number;
  caseMinimum: number;
}

interface StoreContextValue {
  cart: CartLine[];
  addItem: (line: Omit<CartLine, "quantity">, qty?: number) => void;
  changeQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  total: number;
}

const StoreContext = createContext<StoreContextValue | null>(null);
const storageKey = "provisionkh-cart";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) setCart(JSON.parse(saved) as CartLine[]);
    } catch {
      setCart([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(cart));
  }, [cart]);

  const value = useMemo<StoreContextValue>(() => ({
    cart,
    addItem: (line, qty = 1) => setCart((current) => {
      const existing = current.find((item) => item.productId === line.productId);
      return existing
        ? current.map((item) => item.productId === line.productId ? { ...item, quantity: item.quantity + qty } : item)
        : [...current, { ...line, quantity: qty }];
    }),
    changeQuantity: (productId, quantity) => setCart((current) => quantity <= 0
      ? current.filter((item) => item.productId !== productId)
      : current.map((item) => item.productId === productId ? { ...item, quantity } : item)),
    clearCart: () => setCart([]),
    itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
    total: cart.reduce((sum, item) => sum + (item.quantity >= item.caseMinimum ? item.casePrice : item.retailPrice) * item.quantity, 0),
  }), [cart]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used inside StoreProvider");
  return context;
}