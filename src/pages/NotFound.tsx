import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Layout from "@/components/Layout";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <Layout>
      <section className="frame pb-24 pt-12 md:pb-32 md:pt-20">
        <p className="text-sm text-muted-foreground">Error 404</p>
        <h1 className="mt-2 max-w-2xl text-[40px] font-bold leading-[0.95] tracking-[-0.035em] md:text-[72px]">
          Nothing printed at this address.
        </h1>
        <p className="mt-4 max-w-md text-muted-foreground">The link may be old or mistyped. The shop and the home page are both a tap away.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/products" className="btn-primary">Go to the shop</Link>
          <Link to="/" className="btn-secondary">Home</Link>
        </div>
      </section>
    </Layout>
  );
};

export default NotFound;
