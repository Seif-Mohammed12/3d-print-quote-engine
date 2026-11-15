// Where a password-reset link is allowed to land.

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function originOf(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

/** Origins this deployment serves the site from. `env` and `host` are injectable for tests. */
export function allowedSiteOrigins(host, env = process.env) {
  const origins = new Set();
  // Netlify sets URL (production), DEPLOY_PRIME_URL and DEPLOY_URL (this deploy).
  for (const candidate of [env.URL, env.DEPLOY_PRIME_URL, env.DEPLOY_URL, env.VITE_AUTH_REDIRECT_URL]) {
    const url = originOf(candidate);
    if (url) origins.add(url.origin);
  }

  const hostname = String(host || "").toLowerCase().replace(/:\d+$/, "");
  if (hostname) {
    // The function is served from the site's own host, so that host is the site.
    origins.add(`${LOCAL_HOSTS.has(hostname) ? "http" : "https"}://${String(host).toLowerCase()}`);
  }
  return origins;
}

/**
 * Returns the requested redirect when it points at this site, otherwise the site's own
 * /reset-password page. Never returns an off-site URL.
 */
export function resolveResetRedirect(requested, event, env = process.env) {
  const host = event?.headers?.host || event?.headers?.Host || "";
  const allowed = allowedSiteOrigins(host, env);
  const url = originOf(requested);

  if (url && allowed.has(url.origin)) {
    const isLocal = LOCAL_HOSTS.has(url.hostname);
    if (url.protocol === "https:" || isLocal) return url.toString();
  }

  const fallbackOrigin = originOf(env.URL)?.origin || [...allowed][0];
  return `${fallbackOrigin}/reset-password`;
}
