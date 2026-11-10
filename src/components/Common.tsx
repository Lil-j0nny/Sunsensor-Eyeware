import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "../context";

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="eyebrow">
      <span className="eyebrow-dot" />
      {children}
    </span>
  );
}

export function NotFoundPage() {
  return (
    <section className="not-found container section-pad">
      <Eyebrow>THAT FRAME IS OUT OF VIEW</Eyebrow>
      <h1>
        Let’s find
        <br />
        <em>another way.</em>
      </h1>
      <p>
        We couldn’t find this page. Browse the shop’s current public frame posts
        instead.
      </p>
      <Link to="/shop" className="button button-dark">
        Explore frames <ArrowRight size={16} />
      </Link>
    </section>
  );
}
