import { motion } from "motion/react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  MapPin,
  MessageCircle,
  Sun,
} from "lucide-react";
import { Link } from "../context";
import { lensServices, products, shopInfo } from "../data/products";
import { Reveal, SectionHeading } from "../components/Shell";
import { Eyebrow } from "../components/Common";
import { ProductCard } from "../components/ProductCard";
import { StaffCatalogCard } from "../components/StaffCatalogCard";
import { useStaffCatalog } from "../data/catalogContext";

export function HomePage() {
  const featured = [products[0], products[2], products[3]];
  const { items: staffItems } = useStaffCatalog();

  return (
    <>
      <section className="hero-section">
        <div className="hero-grid container">
          <div className="hero-copy">
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Eyebrow>YOUR NAIROBI EYEWEAR STOP</Eyebrow>
            </motion.div>
            <motion.h1
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.68,
                delay: 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              Find your
              <br />
              <em>clear view.</em>
            </motion.h1>
            <motion.p
              className="hero-description"
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.68,
                delay: 0.16,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              Frames with room for your style. Lens options chosen around your
              everyday. Meet SunSensor Eyewear Opticians, right in the heart of
              Nairobi.
            </motion.p>
            <motion.div
              className="hero-actions"
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.68,
                delay: 0.22,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <Link to="/shop" className="button button-dark">
                Explore the frame edit <ArrowRight size={17} />
              </Link>
              <a
                href={shopInfo.whatsappHref}
                className="text-link"
                target="_blank"
                rel="noreferrer"
              >
                Ask the optician <ArrowUpRight size={15} />
              </a>
            </motion.div>
            <div className="hero-detail-row">
              <span className="hero-detail-icon">
                <MapPin size={15} />
              </span>
              <span>Posted: Stewart Building · confirm before visiting</span>
              <span className="hero-detail-divider" />
              <span className="hero-detail-price">
                Frame posts from KSh 800
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-sun-disc" />
            <motion.div
              className="hero-photo hero-photo-main"
              initial={false}
              whileHover={{ rotate: -1, scale: 1.015 }}
              transition={{ duration: 0.5 }}
            >
              <img
                src="/manus-storage/official-style-3_15f04cf7.jpg"
                alt="Black optical glasses photographed in SunSensor Eyewear’s public shop feed"
                fetchPriority="high"
                decoding="async"
                width={1440}
                height={1440}
              />
              <a
                className="hero-photo-credit"
                href={shopInfo.facebook}
                target="_blank"
                rel="noreferrer"
                aria-label="View the original photo source on SunSensor’s official Facebook page"
              >
                PHOTO SOURCE · SUNSENSOR FACEBOOK <ArrowUpRight size={12} />
              </a>
            </motion.div>
            <div className="hero-floating-note">
              <span className="note-sun">
                <Sun size={16} />
              </span>
              <div>
                <strong>Light, meet lens.</strong>
                <small>
                  Photochromatic options
                  <br />
                  from the shop’s lens menu
                </small>
              </div>
              <ArrowUpRight size={16} />
            </div>
            <div className="hero-sticker">
              <span>
                MADE FOR
                <br />
                YOUR DAY
              </span>
              <span className="sticker-sun">✳</span>
            </div>
            <div className="hero-visual-caption">
              <span>STYLE, IN FOCUS</span>
              <span>01 / 04</span>
            </div>
          </div>
        </div>
        <div className="hero-bottom container">
          <span className="hero-bottom-line" />
          <span>A clearer point of view starts with a real conversation.</span>
          <Link to="/faq">
            Get to know the shop <ArrowDown size={14} />
          </Link>
        </div>
      </section>

      <div
        className="ticker"
        aria-label="Eyewear, lens care and everyday vision"
      >
        <div className="ticker-track">
          <span>FRAME YOUR MOMENT</span>
          <i>✳</i>
          <span>SEE THE DIFFERENCE</span>
          <i>✳</i>
          <span>EVERYDAY, IN FOCUS</span>
          <i>✳</i>
          <span>FRAME YOUR MOMENT</span>
          <i>✳</i>
          <span>SEE THE DIFFERENCE</span>
          <i>✳</i>
          <span>EVERYDAY, IN FOCUS</span>
          <i>✳</i>
        </div>
      </div>

      <section className="collection-section section-pad" id="collection">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow="THE FRAME EDIT · AS POSTED"
              title={
                <>
                  Good frames.
                  <br />
                  <em>Good perspective.</em>
                </>
              }
              copy="Browse a few frame and lens offers from the shop’s public posts. Prices are dated references, not live stock or a promise of what’s included."
            >
              <Link
                to="/shop"
                className="round-arrow-link"
                aria-label="Browse all frame posts"
              >
                <ArrowRight size={20} />
              </Link>
            </SectionHeading>
          </Reveal>
          <div className="product-grid product-grid-home">
            {featured.map((product, index) => (
              <Reveal key={product.id} delay={index * 0.08}>
                <ProductCard product={product} index={index} />
              </Reveal>
            ))}
          </div>
          <div className="collection-disclaimer">
            <span className="disclaimer-mark">i</span>
            <p>
              The real shop does not publish model names or live inventory.
              Product photos illustrate its public feed; ask to confirm the
              exact frame, size, price and lens fit before ordering.
            </p>
            <Link to="/shop">
              See all shop posts <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {staffItems.length > 0 && (
        <section className="new-listings-section section-pad" id="home-new-listings">
          <div className="container">
            <Reveal>
              <SectionHeading
                eyebrow="NEW IN THE SHOP · STAFF LISTINGS"
                title={
                  <>
                    Fresh frames.
                    <br />
                    <em>New lens options.</em>
                  </>
                }
                copy="New items, media and individual prices added by SunSensor staff. Confirm availability directly with the shop."
              >
                <Link
                  to="/shop#new-listings"
                  className="round-arrow-link"
                  aria-label="See all new frame and lens listings"
                >
                  <ArrowRight size={20} />
                </Link>
              </SectionHeading>
            </Reveal>
            <div className="product-grid product-grid-home">
              {staffItems.slice(0, 3).map((item, index) => (
                <Reveal key={item.id} delay={index * 0.05}>
                  <StaffCatalogCard item={item} index={index} />
                </Reveal>
              ))}
            </div>
            {staffItems.length > 3 && (
              <Link to="/shop#new-listings" className="new-listings-more">
                See all {staffItems.length} new listings <ArrowRight size={15} />
              </Link>
            )}
          </div>
        </section>
      )}

      <section className="light-section section-pad">
        <div className="container light-grid">
          <Reveal className="light-image-wrap">
            <div className="light-image-frame">
              <img
                src="/manus-storage/photochromatic_aad55718.jpg"
                alt="Eyeglasses from SunSensor’s public shop feed; exact current photochromatic model requires confirmation"
                loading="lazy"
                decoding="async"
                width={products[3].imageWidth}
                height={products[3].imageHeight}
              />
              <span className="light-image-overline">
                LENS OPTION · PHOTOCHROMATIC
              </span>
            </div>
            <div className="image-caption">
              Photo from SunSensor’s Facebook post ·{" "}
              <a
                href={products[3].imageSourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                view the original source <ArrowUpRight size={12} />
              </a>
            </div>
          </Reveal>
          <Reveal className="light-copy" delay={0.08}>
            <Eyebrow>MADE FOR CHANGING LIGHT</Eyebrow>
            <h2>
              Clear indoors.
              <br />
              <em>Shade outdoors.</em>
            </h2>
            <p>
              Photochromatic lenses are designed to adapt to changing
              light—typically clearer indoors and darker in sunlight. SunSensor
              lists this lens option, but its post doesn’t state exact tint, UV
              ratings or activation time. Ask the optician about the particular
              lens before you decide.
            </p>
            <Link
              to={`/product/${products[3].slug}`}
              className="text-link text-link-light"
            >
              See the posted photochromatic offer <ArrowUpRight size={15} />
            </Link>
            <div className="fact-rule" />
            <div className="fact-columns">
              <div>
                <span className="fact-number">01</span>
                <strong>Lens fit comes first</strong>
                <small>Prescription costs depend on your prescription.</small>
              </div>
              <div>
                <span className="fact-number">02</span>
                <strong>Ask what’s included</strong>
                <small>Frame and lens prices may be separate.</small>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="services-section section-pad">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow="THE LENS MENU · FROM THE SHOP"
              title={
                <>
                  Vision care,
                  <br />
                  <em>with options.</em>
                </>
              }
              copy="SunSensor’s public post lists prescription and lens services. The right lens and price depend on your needs—talk with the optician before choosing."
            >
              <Link
                to="/faq"
                className="round-arrow-link"
                aria-label="Read lens services"
              >
                <ArrowRight size={20} />
              </Link>
            </SectionHeading>
          </Reveal>
          <div className="lens-service-grid">
            {lensServices.map((service, i) => (
              <Reveal key={service} delay={(i % 4) * 0.04}>
                <div className="lens-service-chip">
                  <span className="service-index">0{i + 1}</span>
                  <strong>{service}</strong>
                  <ArrowUpRight size={15} />
                </div>
              </Reveal>
            ))}
          </div>
          <div className="service-note">
            <Check size={17} />
            <p>
              A public shop post says an eye check is free when dispensing
              lenses. Confirm the current offer and appointment details
              directly.
            </p>
            <a href={shopInfo.source} target="_blank" rel="noreferrer">
              See source <ArrowUpRight size={13} />
            </a>
          </div>
        </div>
      </section>

      <section className="shop-visit-section section-pad">
        <div className="container visit-panel">
          <div className="visit-copy">
            <Eyebrow>PUBLISHED DIRECTIONS · NAIROBI</Eyebrow>
            <h2>
              A real shop.
              <br />
              <em>A real optician.</em>
            </h2>
            <p>
              The shop’s public posts give Stewart Building, Ground Floor, Room
              S6, along Tom Mboya Street near the Ronald Ngala junction,
              opposite Kings Collection. Call or WhatsApp to confirm the current
              location and hours before visiting.
            </p>
            <div className="visit-buttons">
              <a href={shopInfo.phoneHref} className="button button-light">
                <span className="button-icon-circle">
                  <MessageCircle size={16} />
                </span>
                Call {shopInfo.phoneDisplay}
                <ArrowRight size={16} />
              </a>
              <a
                href={shopInfo.whatsappHref}
                className="visit-whatsapp"
                target="_blank"
                rel="noreferrer"
              >
                Or WhatsApp before you visit <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
          <div className="visit-art">
            <div className="visit-stamp">
              <span className="stamp-big">S</span>
              <span className="stamp-small">
                STEWART
                <br />
                BUILDING · S6
              </span>
            </div>
            <div className="visit-orbit orbit-one" />
            <div className="visit-orbit orbit-two" />
            <div className="visit-coordinates">
              NAIROBI
              <br />
              CITY CENTRE
            </div>
            <span className="visit-spark">✳</span>
          </div>
        </div>
      </section>

      <section className="closing-section section-pad">
        <div className="container closing-inner">
          <Reveal>
            <span className="closing-star">✳</span>
            <Eyebrow>SEE YOURSELF IN A NEW FRAME</Eyebrow>
            <h2>
              Start with a look.
              <br />
              <em>Leave with a clearer view.</em>
            </h2>
            <p>
              Pick a shop-posted frame, then confirm fit, lens options and
              today’s price with the optician.
            </p>
            <Link to="/shop" className="button button-dark">
              Find your frame <ArrowRight size={17} />
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
