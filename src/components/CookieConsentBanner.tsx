import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

const COOKIE_CONSENT_KEY = "cookie-consent:v1";

type ConsentChoice = "accept_all" | "necessary_only";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) {
      setVisible(true);
    }
  }, []);

  function saveChoice(choice: ConsentChoice) {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({ choice, at: new Date().toISOString() }));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] sm:p-4">
      <div className="mx-auto max-w-5xl border-t border-rule bg-card sm:border">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-foreground">Cookies</p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Essential cookies keep your cart and login working. Optional ones help us see what people use. See the <Link to="/privacy-policy" className="link-quiet text-foreground">privacy policy</Link>.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <button
              type="button"
              onClick={() => saveChoice("necessary_only")}
              className="btn-secondary min-h-11 px-4 text-sm"
            >
              Necessary only
            </button>
            <button
              type="button"
              onClick={() => saveChoice("accept_all")}
              className="btn-primary min-h-11 px-4 text-sm"
            >
              Accept all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
