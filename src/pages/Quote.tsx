import { createElement, useEffect, useState } from "react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";

const QUOTER_SCRIPT = "https://3d-print-os.vercel.app/embed.js";
const QUOTER_KEY = "pk_wlskm_-zPY_eeE4IyTO1-TNi";

const Quote = () => {
  const [failed, setFailed] = useState(false);

  // The quoter's script is only needed on this page, so it loads here rather than site-wide.
  useEffect(() => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${QUOTER_SCRIPT}"]`);
    if (existing) return;
    const script = document.createElement("script");
    script.src = QUOTER_SCRIPT;
    script.async = true;
    script.onerror = () => {
      script.remove();
      setFailed(true);
    };
    document.head.appendChild(script);
  }, []);

  return (
    <Layout>
      <section className="section-padding">
        <div className="frame">
          <SectionHeading title="Price your file" subtitle="Upload your 3D model, choose your options, and see the price." />

          {failed ? (
            <div className="border border-border p-6">
              <p className="font-semibold">The price calculator didn't load.</p>
              <p className="mt-1 text-muted-foreground">Check your connection and refresh, or send us your file on WhatsApp and we'll price it for you.</p>
              <a href="https://wa.me/201099228486" className="btn-secondary mt-5" rel="noopener">
                WhatsApp us
              </a>
            </div>
          ) : (
            createElement("print-quoter", {
              "data-key": QUOTER_KEY,
              "data-title": "Price your 3D print",
              "data-mode": "dark",
              "data-accent": "#FF5B1F",
              "data-background": "#0E0E0F",
              "data-foreground": "#EDEAE4",
              "data-radius": "2",
              "data-font": "Host Grotesk",
              "data-font-url": "https://fonts.googleapis.com/css2?family=Host+Grotesk:wght@400..800&display=swap",
            })
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Quote;
