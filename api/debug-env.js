import { json } from "./_lib/http.js";

/**
 * TEMPORARY DIAGNOSTIC ENDPOINT - Remove before production
 * 
 * Used to diagnose environment variable configuration on Netlify Functions.
 * Only responds when ?debug=auth query param is present (manual safety check).
 * 
 * Accessible via: GET /api/debug-env?debug=auth
 */
export const handler = async (event) => {
  // Safety check: only respond if debug param is present
  const params = new URLSearchParams(event.queryStringParameters || {});
  if (!params.has('debug') || params.get('debug') !== 'auth') {
    return json(403, { error: 'Debug mode not enabled. Add ?debug=auth to enable.' });
  }

  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const timestamp = new Date().toISOString();
  
  // Check for Supabase config
  const supabaseUrlSet = Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const serviceRoleSet = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const anonKeySet = Boolean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);
  
  // Check for admin emails config
  const adminEmailsRaw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '';
  const adminEmails = adminEmailsRaw
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  
  const diagnostics = {
    timestamp,
    environment: process.env.NODE_ENV || 'unknown',
    supabase: {
      urlConfigured: supabaseUrlSet,
      serviceRoleKeyConfigured: serviceRoleSet,
      anonKeyConfigured: anonKeySet,
      allConfigured: supabaseUrlSet && serviceRoleSet && anonKeySet,
    },
    admin: {
      emailsConfigured: adminEmailsRaw.length > 0,
      emailsCount: adminEmails.length,
      sampleEmails: adminEmails.slice(0, 3), // Only show first 3 for privacy
    },
    notes: {
      buildEnv: 'These are Functions-level environment variables',
      frontendVars: 'Build environment vars (VITE_*) are separate and set during build',
      requiredFunctions: [
        'SUPABASE_URL or VITE_SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY',
        'ADMIN_EMAILS (for email fallback)',
      ],
    },
  };

  console.log('[DEBUG-ENV] Environment diagnostic requested', { diagnostics });

  return json(200, diagnostics);
};
