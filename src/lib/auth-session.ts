import { supabase } from "@/lib/supabase";

let tokenInFlight: Promise<string | null> | null = null;
let cachedToken: string | null = null;
let cachedAt = 0;
let listenerInitialized = false;
let isDebugMode = false;

const TOKEN_CACHE_MS = 1500;

function initDebugMode() {
  try {
    const params = new URLSearchParams(window.location.search);
    isDebugMode = params.has('debug') && params.get('debug') === 'auth';
  } catch {
    isDebugMode = false;
  }
}

function logDebugToken(message: string, data?: Record<string, unknown>) {
  if (!isDebugMode) return;
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
  console.log(`[AUTH-DEBUG ${timestamp}] Token: ${message}${dataStr}`);
}

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
  
  initDebugMode();
  ensureAuthListener();

  const now = Date.now();
  if (cachedToken && now - cachedAt < TOKEN_CACHE_MS) {
    logDebugToken('Cache hit', { age: now - cachedAt });
    return cachedToken;
  }

  if (tokenInFlight) {
    logDebugToken('Returning in-flight token');
    return tokenInFlight;
  }

  tokenInFlight = (async () => {
    // Retry briefly to tolerate login/session propagation races.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      logDebugToken(`Fetch attempt ${attempt + 1}/3`);
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token || null;
      if (token) {
        cachedToken = token;
        cachedAt = Date.now();
        logDebugToken('Token fetch succeeded', { attempt: attempt + 1 });
        return token;
      }
      if (attempt < 2) {
        logDebugToken(`Retrying after 150ms`);
        await sleep(150);
      }
    }
    cachedToken = null;
    cachedAt = Date.now();
    logDebugToken('All attempts exhausted, returning null');
    return null;
  })()
    .catch((err) => {
      logDebugToken('Token fetch error', { error: String(err) });
      return null;
    })
    .finally(() => {
      tokenInFlight = null;
    });

  return tokenInFlight;
}
