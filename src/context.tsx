import { createContext, useContext } from "react";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import type {
  StaffCatalogItemType,
  StaffCatalogMedia,
} from "./types/catalog";

export type Navigate = (to: string) => void;
export const NavigationContext = createContext<Navigate>(() => undefined);
export function useNavigate() {
  return useContext(NavigationContext);
}

export function Link({
  to,
  children,
  className,
  onClick,
  ...rest
}: {
  to: string;
  children: ReactNode;
  className?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
} & Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "children" | "onClick" | "className"
>) {
  const navigate = useNavigate();
  return (
    <a
      href={to}
      className={className}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          rest.target === "_blank" ||
          to.startsWith("#")
        )
          return;
        event.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

export type StaffCartSnapshot = {
  id: string;
  slug: string;
  itemType: StaffCatalogItemType;
  name: string;
  description: string | null;
  priceKsh: number;
  media: StaffCatalogMedia[];
};
export type CartLine = {
  productId: string;
  quantity: number;
  request: string;
  staffItem?: StaffCartSnapshot;
};
export type CartContextValue = {
  items: CartLine[];
  addItem: (productId: string, quantity?: number, request?: string) => void;
  addStaffItem: (item: StaffCartSnapshot, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateRequest: (productId: string, request: string) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};
export const CartContext = createContext<CartContextValue>({
  items: [],
  addItem: () => undefined,
  addStaffItem: () => undefined,
  updateQuantity: () => undefined,
  updateRequest: () => undefined,
  removeItem: () => undefined,
  clearCart: () => undefined,
});
export function useCart() {
  return useContext(CartContext);
}
