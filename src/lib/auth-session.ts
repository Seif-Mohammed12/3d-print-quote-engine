import { supabase } from "@/lib/supabase";

let tokenInFlight: Promise<string | null> | null = null;
let cachedToken: string | null = null;
let cachedAt = 0;

const TOKEN_CACHE_MS = 1500;

export async function getAccessToken() {
  if (!supabase) return null;

  const now = Date.now();
  if (cachedToken && now - cachedAt < TOKEN_CACHE_MS) {
    return cachedToken;
  }

  if (tokenInFlight) {
    return tokenInFlight;
  }

  tokenInFlight = supabase.auth
    .getSession()
    .then(({ data }) => {
      cachedToken = data.session?.access_token || null;
      cachedAt = Date.now();
      return cachedToken;
    })
    .catch(() => null)
    .finally(() => {
      tokenInFlight = null;
    });

  return tokenInFlight;
}
