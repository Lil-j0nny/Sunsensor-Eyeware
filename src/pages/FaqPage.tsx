import { ArrowUpRight, MessageCircle, Plus } from "lucide-react";
import { lensServices, shopInfo } from "../data/products";
import { Eyebrow } from "../components/Common";

export function FaqPage() {
  const faqs = [
    {
      q: "Are the prices current, and what is included?",
      a: "The catalog displays dated prices from public shop posts, not a live price list. The shop has not published a current SKU feed. One older post says frame prices are exclusive of lenses; for the current offers, ask what the exact price includes and whether prescription lenses are extra.",
    },
    {
      q: "What lens services does the shop list?",
      a: "SunSensor’s public TikTok post lists short-sightedness, long-sightedness, astigmatism, blue-block, anti-glare, photochromatic, progressive and bifocal lenses. It says prescription-lens cost depends on the prescription. Confirm the currently available options with the optician.",
    },
    {
      q: "How do the photochromatic lenses behave?",
      a: "Photochromatic lenses generally adapt to changing light, becoming darker in sunlight and clearer indoors. The shop lists ready photochromatic glasses but does not state exact activation time, tint, UV certification or driving performance in that offer. Ask about the specific lens and your prescription before ordering.",
    },
    {
      q: "Can you tell me the frame size or material?",
      a: "Frame measurements are not published for most listings. One dated post labels a frame group as acetate, but a material should not be assumed for another frame. Ask for the exact model, bridge, lens and temple measurements and material of the style you choose.",
    },
    {
      q: "Is an eye check included?",
      a: "A public shop post says a free eye check-up is available when dispensing lenses. This page can’t confirm whether that offer is still active, so please call ahead.",
    },
    {
      q: "Do you deliver, accept insurance, or take returns?",
      a: "Delivery details, charges and timing, returns, exchanges and refunds are not set out in verified public policy pages. A shop post says it does not accept SHIF or other insurance covers; confirm whether that remains current. Ask the shop about these terms before paying.",
    },
    {
      q: "Where is SunSensor Eyewear?",
      a: `The public shop posts give the address as ${shopInfo.location} ${shopInfo.locationNote} The Facebook profile also mentions City Estate, so do not assume that this is a separately verified branch. Call ${shopInfo.phoneDisplay} before you travel.`,
    },
    {
      q: "Can you move lenses from a broken frame?",
      a: "A public SunSensor post says the shop can transfer lenses from a broken frame to a new one. Contact the optician to check whether your lenses and new frame are suitable.",
    },
  ];
  return (
    <>
      <section className="page-hero page-hero-faq">
        <div className="container">
          <div className="page-hero-top">
            <Eyebrow>STRAIGHT ANSWERS · FROM SHOP POSTS</Eyebrow>
            <span className="page-index">04 — 04</span>
          </div>
          <h1>
            See the
            <br />
            <em>details clearly.</em>
          </h1>
          <div className="page-hero-bottom">
            <p>
              We’ve separated what SunSensor has published from what still needs
              a quick conversation with the shop.
            </p>
            <a
              href={shopInfo.whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="faq-ask"
            >
              Have another question? Ask on WhatsApp <ArrowUpRight size={15} />
            </a>
          </div>
        </div>
      </section>
      <section className="faq-section section-pad">
        <div className="container faq-layout">
          <div className="faq-aside">
            <Eyebrow>GOOD TO KNOW</Eyebrow>
            <p>
              Current model, live inventory and store policies aren’t connected
              to this website. Ask the shop before making a payment.
            </p>
            <a href={shopInfo.phoneHref} className="button button-dark">
              <MessageCircle size={16} /> Call the optician
            </a>
            <a
              href={shopInfo.whatsappHref}
              className="faq-whatsapp"
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp the shop <ArrowUpRight size={15} />
            </a>
          </div>
          <div className="faq-list">
            {faqs.map((faq, index) => (
              <details className="faq-item" key={faq.q} open={index === 0}>
                <summary>
                  <span className="faq-number">0{index + 1}</span>
                  <strong>{faq.q}</strong>
                  <span className="faq-toggle">
                    <Plus size={17} />
                  </span>
                </summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <LensServicesBand />
    </>
  );
}

function LensServicesBand() {
  return (
    <section className="lens-band section-pad">
      <div className="container lens-band-inner">
        <div>
          <Eyebrow>THE LENS MENU</Eyebrow>
          <h2>
            Bring your prescription.
            <br />
            <em>Ask about the rest.</em>
          </h2>
        </div>
        <div className="lens-band-list">
          {lensServices.map((service, i) => (
            <span key={service}>
              <b>0{i + 1}</b>
              {service}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
