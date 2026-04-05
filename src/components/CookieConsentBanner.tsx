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
    <div className="fixed inset-x-0 bottom-0 z-[70] p-3 sm:p-4">
      <div className="mx-auto max-w-5xl rounded-xl border border-border bg-background/95 backdrop-blur shadow-xl">
        <div className="p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-foreground">This site uses cookies</p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              We use essential cookies for core functionality and optional analytics cookies to improve your experience.
              Read our <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <button
              type="button"
              onClick={() => saveChoice("necessary_only")}
              className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
            >
              Necessary only
            </button>
            <button
              type="button"
              onClick={() => saveChoice("accept_all")}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              Accept all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
