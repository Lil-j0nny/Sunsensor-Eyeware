import { useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowDownRight,
  ArrowRight,
  Instagram,
  MessageCircle,
  Menu,
  ShoppingBag,
  X,
} from "lucide-react";
import { shopInfo } from "../data/products";
import { useCart, useNavigate, Link } from "../context";
import { scrollToVisit } from "../utils/scroll";

export function Wordmark({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link
      to="/"
      className={`wordmark ${inverted ? "wordmark-inverse" : ""}`}
      aria-label="SunSensor Eyewear home"
    >
      <span className="wordmark-icon" aria-hidden="true">
        <svg viewBox="0 0 54 48" fill="none">
          <circle cx="27" cy="20" r="10" className="sun-core" />
          <path
            d="M27 2v5m0 26v5M9 20H4m46 0h-5M14 7l4 4m18 18 4 4m0-26-4 4M18 29l-4 4"
            className="sun-rays"
          />
          <path
            d="M5 20c0-4 3-7 7-7h9c4 0 7 3 7 7v5c0 4-3 7-7 7h-9c-4 0-7-3-7-7zm26 0c0-4 3-7 7-7h9c4 0 7 3 7 7v5c0 4-3 7-7 7h-9c-4 0-7-3-7-7zm-3 2h3"
            className="frame-lines"
          />
        </svg>
      </span>
      <span className="wordmark-copy">
        <strong>SUNSENSOR</strong>
        <small>EYEWEAR OPTICIANS</small>
      </span>
    </Link>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const { items } = useCart();
  const navigate = useNavigate();
  const count = items.reduce((sum, line) => sum + line.quantity, 0);
  const close = () => {
    setOpen(false);
    menuButtonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() =>
      drawerRef.current?.querySelector<HTMLAnchorElement>("a")?.focus(),
    );
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
      if (event.key === "Tab") {
        const links =
          drawerRef.current?.querySelectorAll<HTMLAnchorElement>("a");
        if (!links?.length) return;
        const first = links[0],
          last = links[links.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const visitShop = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const wasHome = window.location.pathname === "/";
    if (open) close();
    if (!wasHome) navigate("/");
    window.setTimeout(scrollToVisit, wasHome ? 0 : 600);
  };

  return (
    <>
      <div className="announcement-bar">
        <span>NAIROBI · PUBLISHED SHOP POSTS</span>
        <a href={shopInfo.whatsappHref} target="_blank" rel="noreferrer">
          ASK ABOUT TODAY’S FRAMES <ArrowRight size={12} />
        </a>
      </div>
      <header className="site-header">
        <div className="header-inner">
          <Wordmark />
          <nav className="desktop-nav" aria-label="Main navigation">
            <Link to="/shop">Shop frames</Link>
            <Link to="/faq">Lens guide</Link>
            <a href="#visit" onClick={visitShop}>
              Visit us
            </a>
          </nav>
          <div className="header-actions">
            <Link
              to="/cart"
              className="cart-link"
              aria-label={`Bag, ${count} items`}
            >
              <ShoppingBag size={19} strokeWidth={1.7} />
              <span>Bag</span>
              {count > 0 && <b className="cart-count">{count}</b>}
            </Link>
            <a
              className="header-whatsapp"
              href={shopInfo.whatsappHref}
              target="_blank"
              rel="noreferrer"
              aria-label="Chat with SunSensor Eyewear on WhatsApp"
              title="Chat with the shop on WhatsApp"
            >
              <MessageCircle size={20} aria-hidden="true" />
            </a>
            <button
              className="mobile-menu-button"
              type="button"
              ref={menuButtonRef}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-navigation"
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              className="mobile-drawer"
              id="mobile-navigation"
              role="navigation"
              aria-label="Mobile navigation; press Escape to close"
              ref={drawerRef}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              <Link to="/shop" onClick={close}>
                Shop frames <ArrowRight size={16} />
              </Link>
              <Link to="/faq" onClick={close}>
                Lens guide <ArrowRight size={16} />
              </Link>
              <Link to="/cart" onClick={close}>
                Your bag <ArrowRight size={16} />
              </Link>
              <a href="#visit" onClick={visitShop}>
                Published shop directions <ArrowRight size={16} />
              </a>
              <a
                href={shopInfo.whatsappHref}
                target="_blank"
                rel="noreferrer"
                onClick={close}
              >
                Chat with the shop <ArrowRight size={16} />
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}

export function Footer() {
  const navigate = useNavigate();
  return (
    <footer className="site-footer" id="visit">
      <div className="footer-top">
        <div className="footer-brand">
          <Wordmark inverted />
          <p>
            Everyday frames. Thoughtful lens options.
            <br />A clearer point of view, from Nairobi.
          </p>
        </div>
        <div className="footer-links">
          <span className="footer-label">EXPLORE</span>
          <Link to="/shop">Shop frames</Link>
          <Link to="/faq">Lens services & FAQs</Link>
          <Link to="/cart">Your bag</Link>
          <Link to="/staff">Staff sign-in</Link>
        </div>
        <div className="footer-links">
          <span className="footer-label">PUBLISHED SHOP DIRECTIONS</span>
          <p>{shopInfo.location}</p>
          <p>{shopInfo.locationNote}</p>
          <a href={shopInfo.phoneHref}>{shopInfo.phoneDisplay}</a>
          <a href={shopInfo.whatsappHref} target="_blank" rel="noreferrer">
            WhatsApp the optician <ArrowRight size={13} />
          </a>
        </div>
        <div className="footer-social">
          <span className="footer-label">FOLLOW THE FRAME EDIT</span>
          <a href={shopInfo.instagram} target="_blank" rel="noreferrer">
            <Instagram size={16} /> Instagram <ArrowDownRight size={14} />
          </a>
          <a href={shopInfo.facebook} target="_blank" rel="noreferrer">
            Facebook <ArrowDownRight size={14} />
          </a>
          <a href={shopInfo.tiktok} target="_blank" rel="noreferrer">
            TikTok <ArrowDownRight size={14} />
          </a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} SunSensor Eyewear Opticians</span>
        <span>
          Prices and product details are shown as publicly posted; confirm
          before you pay.
        </span>
        <button
          type="button"
          onClick={() => {
            navigate("/faq");
          }}
        >
          FAQs & store details <ArrowRight size={13} />
        </button>
      </div>
    </footer>
  );
}

export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: reducedMotion ? 0 : 0.42,
        delay: reducedMotion ? 0 : delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  copy,
  light = false,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  copy?: string;
  light?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={`section-heading ${light ? "section-heading-light" : ""}`}>
      <span className="eyebrow">{eyebrow}</span>
      <div className="section-heading-row">
        <h2>{title}</h2>
        {children}
      </div>
      {copy && <p>{copy}</p>}
    </div>
  );
}
