import { Link } from "react-router-dom";
import { Printer, Mail, Phone, MapPin } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border/50 bg-card/30 backdrop-blur-sm">
    <div className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1">
          <Link to="/" className="flex items-center gap-2 mb-4">
            <Printer className="w-5 h-5 text-primary" />
            <span className="font-heading font-bold text-foreground">
              3D Print <span className="text-primary">It</span>
            </span>
          </Link>
          <p className="text-sm text-muted-foreground">
            Bringing your ideas to life, one layer at a time.
          </p>
        </div>

        <div>
          <h4 className="font-heading font-semibold text-foreground mb-3 text-sm">Quick Links</h4>
          <div className="flex flex-col gap-2">
            {["/services", "/gallery", "/about", "/quote"].map((path) => (
              <Link key={path} to={path} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                {path.slice(1).charAt(0).toUpperCase() + path.slice(2)}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-heading font-semibold text-foreground mb-3 text-sm">Services</h4>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <span>Custom 3D Printing</span>
            <span>Rapid Prototyping</span>
            <span>Bulk Orders</span>
            <span>Design Assistance</span>
          </div>
        </div>

        <div>
          <h4 className="font-heading font-semibold text-foreground mb-3 text-sm">Contact</h4>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><Mail className="w-4 h-4" /> 3d.print.ittt@gmail.com</span>
            <span className="flex items-center gap-2"><Phone className="w-4 h-4" /> +20 109 922 8486</span>
            <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> New Cairo, Egypt</span>
          </div>
        </div>
      </div>

      <div className="mt-10 pt-6 border-t border-border/30 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <p>© 2021 - {new Date().getFullYear()} 3D Print It. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link to="/terms-of-service" className="hover:text-primary transition-colors">Terms of Service</Link>
          <Link to="/refund-policy" className="hover:text-primary transition-colors">Refund Policy</Link>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
