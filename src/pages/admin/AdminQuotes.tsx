import AdminShell from "@/components/admin/AdminShell";
import { Panel } from "@/components/admin/ui";

/**
 * Quotes are not connected. Custom quotes are "coming soon" on the site, the old STL upload and
 * quote email endpoints are switched off, and the 3D Print OS quoter keeps its quotes in its
 * own database with no server-to-server API this site can read. This page says so plainly
 * instead of showing an inbox with nothing behind it.
 */
export default function AdminQuotes() {
  return (
    <AdminShell title="Quotes" description="Custom print quotes.">
      <div className="max-w-3xl space-y-5">
        <Panel>
          <div className="px-5 py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-300">Not connected</p>
            <h2 className="mt-2 text-xl font-bold">Quotes are not connected yet</h2>
            <p className="mt-2 text-muted-foreground">
              The website's quote page says “coming soon” and sends people to WhatsApp, so no quote requests reach this admin. Quote
              requests sent on WhatsApp or by email aren't tracked here either.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href="https://wa.me/201099228486" className="adm-btn" rel="noopener" target="_blank">
                Open WhatsApp
              </a>
              <a href="/quote" className="adm-btn" target="_blank" rel="noopener">
                See the quote page
              </a>
            </div>
          </div>
        </Panel>

        <Panel title="What's in place today">
          <dl className="divide-y divide-border text-sm">
            <div className="grid gap-1 px-5 py-3 sm:grid-cols-[180px_1fr]">
              <dt className="text-muted-foreground">Website quote page</dt>
              <dd>Static “coming soon” page with a WhatsApp button.</dd>
            </div>
            <div className="grid gap-1 px-5 py-3 sm:grid-cols-[180px_1fr]">
              <dt className="text-muted-foreground">Old STL upload flow</dt>
              <dd>Switched off on the server. It stays off unless the legacy flag is set, which this admin doesn't do.</dd>
            </div>
            <div className="grid gap-1 px-5 py-3 sm:grid-cols-[180px_1fr]">
              <dt className="text-muted-foreground">3D Print OS quoter</dt>
              <dd>
                A separate system with its own database. Its embeddable quoter takes quotes and orders from visitors and shows them in the
                3D Print OS console. It has no API this site can read quotes from, and its backend currently runs on a temporary tunnel.
              </dd>
            </div>
          </dl>
        </Panel>

        <Panel title="What connecting them would take">
          <ol className="list-decimal space-y-2 py-4 pl-10 pr-5 text-sm">
            <li>Move the 3D Print OS backend to a stable public address (not the studio PC tunnel).</li>
            <li>
              Add a server-to-server API in 3D Print OS for this shop: list quotes and quote orders, read one quote, with a secret key that
              only this site's Netlify functions hold (never the browser).
            </li>
            <li>Or, instead of reading on demand, have 3D Print OS send a signed webhook to a new Netlify function when a quote or order is created.</li>
            <li>Add an admin function here that checks the admin role, calls that API with the secret key, and returns quotes to this page.</li>
            <li>Then this page can become an inbox: list, open, and link a quote to its order.</li>
          </ol>
        </Panel>
      </div>
    </AdminShell>
  );
}
