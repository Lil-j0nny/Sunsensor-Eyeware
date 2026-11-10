import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  CartContext,
  NavigationContext,
  type CartLine,
  type StaffCartSnapshot,
} from "./context";
import { products } from "./data/products";
import { StaffCatalogProvider, useStaffCatalog } from "./data/catalogContext";
import { applyClientSeo } from "./data/seo";
import { Footer, Header } from "./components/Shell";
import { HomePage } from "./pages/HomePage";
import { ShopPage } from "./pages/ShopPage";
import { ProductPage } from "./pages/ProductPage";
import { CartPage, CheckoutPage } from "./pages/CartCheckout";
import { FaqPage } from "./pages/FaqPage";
import { StaffCatalogPage } from "./pages/StaffCatalogPage";
import { StaffProductPage } from "./pages/StaffProductPage";
import { NotFoundPage } from "./components/Common";
import { normalizeCart } from "./utils/cart";
import { scrollToTop } from "./utils/scroll";

function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sunsensor-cart-v1");
      if (saved) {
        setItems(normalizeCart(JSON.parse(saved)));
      }
    } catch {
      /* Ignore an invalid saved cart and start clean. */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem("sunsensor-cart-v1", JSON.stringify(items));
      } catch {
        /* Browsers may disable local storage; the in-memory bag remains usable. */
      }
    }
  }, [items, ready]);

  const value = useMemo(
    () => ({
      items,
      addItem: (productId: string, quantity = 1, request = "") =>
        setItems((current) => {
          const existing = current.find((item) => item.productId === productId);
          if (!existing)
            return [
              ...current,
              {
                productId,
                quantity: Math.max(1, Math.min(20, Math.floor(quantity))),
                request,
              },
            ];
          return current.map((item) =>
            item.productId === productId
              ? {
                  ...item,
                  quantity: Math.min(20, item.quantity + quantity),
                  request: request || item.request,
                }
              : item,
          );
        }),
      addStaffItem: (staffItem: StaffCartSnapshot, quantity = 1) =>
        setItems((current) => {
          const productId = `staff:${staffItem.id}`;
          const amount = Math.max(1, Math.min(20, Math.floor(quantity)));
          const existing = current.find((item) => item.productId === productId);
          if (!existing)
            return [
              ...current,
              { productId, quantity: amount, request: "", staffItem },
            ];
          return current.map((item) =>
            item.productId === productId
              ? {
                  ...item,
                  quantity: Math.min(20, item.quantity + amount),
                  staffItem,
                }
              : item,
          );
        }),
      updateQuantity: (productId: string, quantity: number) =>
        setItems((current) =>
          current.map((item) =>
            item.productId === productId
              ? { ...item, quantity: Math.max(1, Math.min(20, quantity)) }
              : item,
          ),
        ),
      updateRequest: (productId: string, request: string) =>
        setItems((current) =>
          current.map((item) =>
            item.productId === productId ? { ...item, request } : item,
          ),
        ),
      removeItem: (productId: string) =>
        setItems((current) =>
          current.filter((item) => item.productId !== productId),
        ),
      clearCart: () => setItems([]),
    }),
    [items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export default function App({ initialPath = "/" }: { initialPath?: string }) {
  return (
    <CartProvider>
      <StaffCatalogProvider>
        <AppFrame initialPath={initialPath} />
      </StaffCatalogProvider>
    </CartProvider>
  );
}

function AppFrame({ initialPath }: { initialPath: string }) {
  const [path, setPath] = useState(initialPath);
  const { items: staffItems, loading: staffCatalogLoading } =
    useStaffCatalog();
  const navigate = useCallback((to: string) => {
    if (typeof window === "undefined") return;
    const destination = new URL(to, window.location.origin);
    window.history.pushState({}, "", destination.href);
    setPath(destination.pathname);
    if (destination.hash) {
      const targetId = decodeURIComponent(destination.hash.slice(1));
      window.setTimeout(() => {
        document.getElementById(targetId)?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
        });
      }, 80);
    } else {
      scrollToTop();
    }
  }, []);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    setPath(window.location.pathname);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const currentStaffItem = path.startsWith("/product/")
    ? staffItems.find((item) => item.slug === path.split("/").pop())
    : undefined;

  useEffect(() => {
    applyClientSeo(path, currentStaffItem);
  }, [path, currentStaffItem]);

  return (
    <NavigationContext.Provider value={navigate}>
      <MotionConfig reducedMotion="user">
        <div className="site-shell">
          {path !== "/staff" && <Header />}
          <AnimatePresence mode="wait" initial={false}>
            <motion.main
              key={path}
              className="route-view"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -7 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            >
              <PageForPath
                path={path}
                staffItems={staffItems}
                staffCatalogLoading={staffCatalogLoading}
              />
            </motion.main>
          </AnimatePresence>
          {path !== "/staff" && <Footer />}
        </div>
      </MotionConfig>
    </NavigationContext.Provider>
  );
}

function PageForPath({
  path,
  staffItems,
  staffCatalogLoading,
}: {
  path: string;
  staffItems: ReturnType<typeof useStaffCatalog>["items"];
  staffCatalogLoading: boolean;
}) {
  if (path === "/") return <HomePage />;
  if (path === "/shop") return <ShopPage />;
  if (path === "/cart") return <CartPage />;
  if (path === "/checkout") return <CheckoutPage />;
  if (path === "/faq") return <FaqPage />;
  if (path === "/staff") return <StaffCatalogPage />;
  if (path.startsWith("/product/")) {
    const slug = path.split("/").pop() || "";
    if (products.some((item) => item.slug === slug))
      return <ProductPage slug={slug} />;
    const staffItem = staffItems.find((item) => item.slug === slug);
    if (staffItem) return <StaffProductPage item={staffItem} />;
    if (staffCatalogLoading)
      return (
        <div className="staff-product-loading container" role="status">
          Loading this SunSensor listing…
        </div>
      );
  }
  return <NotFoundPage />;
}
