import { Link } from "react-router-dom";

const columns = [
  {
    title: "Shop",
    links: [
      { to: "/products", label: "All products" },
      { to: "/gallery", label: "Gallery" },
      { to: "/product-cart", label: "Cart" },
    ],
  },
  {
    title: "Custom prints",
    links: [
      { to: "/quote", label: "Price your STL" },
      { to: "/contact", label: "Design help" },
      { to: "/services", label: "Materials & bulk" },
    ],
  },
  {
    title: "Studio",
    links: [
      { to: "/about", label: "About" },
      { to: "/contact", label: "Contact" },
      { to: "/orders", label: "Your orders" },
    ],
  },
];

const Footer = () => (
  <footer className="border-t border-border">
    <div className="frame py-12 md:py-16">
      <div className="grid gap-10 md:grid-cols-12">
        <div className="md:col-span-5">
          <Link to="/" className="inline-flex min-h-11 items-center text-2xl font-extrabold tracking-[-0.03em]">
            3D Print It
          </Link>
          <p className="mt-3 max-w-sm text-muted-foreground">
            Desk gear and decor, designed and printed in New Cairo since 2021. PLA and PETG, printed in about 48 hours.
          </p>
          <div className="mt-4 flex flex-col text-[15px]">
            <a href="https://wa.me/201099228486" className="link-quiet inline-flex min-h-11 w-fit items-center" rel="noopener">
              WhatsApp +20 109 922 8486
            </a>
            <a href="tel:+201099228486" className="link-quiet inline-flex min-h-11 w-fit items-center">
              Call +20 109 922 8486
            </a>
            <a href="mailto:3d.print.ittt@gmail.com" className="link-quiet inline-flex min-h-11 w-fit items-center">
              3d.print.ittt@gmail.com
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-7">
          {columns.map((column) => (
            <div key={column.title}>
              <h2 className="text-sm font-semibold text-muted-foreground">{column.title}</h2>
              <ul className="mt-3 space-y-1">
                {column.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="inline-flex min-h-11 items-center text-[15px] text-foreground hover:text-ink">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>© 2021–{new Date().getFullYear()} 3D Print It, New Cairo, Egypt</p>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          <Link to="/privacy-policy" className="inline-flex min-h-11 items-center hover:text-foreground">Privacy</Link>
          <Link to="/terms-of-service" className="inline-flex min-h-11 items-center hover:text-foreground">Terms</Link>
          <Link to="/refund-policy" className="inline-flex min-h-11 items-center hover:text-foreground">Refunds</Link>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
