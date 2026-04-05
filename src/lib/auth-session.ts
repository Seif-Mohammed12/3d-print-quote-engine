import { supabase } from "@/lib/supabase";

let tokenInFlight: Promise<string | null> | null = null;
let cachedToken: string | null = null;
let cachedAt = 0;
let listenerInitialized = false;

const TOKEN_CACHE_MS = 1500;

function ensureAuthListener() {
  if (!supabase || listenerInitialized) return;
  listenerInitialized = true;

  supabase.auth.onAuthStateChange((_event, session) => {
    cachedToken = session?.access_token || null;
    cachedAt = Date.now();
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function getAccessToken() {
  if (!supabase) return null;
  ensureAuthListener();

  const now = Date.now();
  if (cachedToken && now - cachedAt < TOKEN_CACHE_MS) {
    return cachedToken;
  }

  if (tokenInFlight) {
    return tokenInFlight;
  }

  tokenInFlight = (async () => {
    // Retry briefly to tolerate login/session propagation races.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token || null;
      if (token) {
        cachedToken = token;
        cachedAt = Date.now();
        return token;
      }
      if (attempt < 2) await sleep(150);
    }
    cachedToken = null;
    cachedAt = Date.now();
    return null;
  })()
    .catch(() => null)
    .finally(() => {
      tokenInFlight = null;
    });

  return tokenInFlight;
}
