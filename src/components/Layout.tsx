import { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import Navbar from "./Navbar";
import Footer from "./Footer";

const Layout = ({ children }: { children: ReactNode }) => (
  <MotionConfig reducedMotion="user">
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only z-50 bg-primary px-4 py-2 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-2"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="flex-1 pt-14">
        {children}
      </main>
      <Footer />
    </div>
  </MotionConfig>
);

export default Layout;
