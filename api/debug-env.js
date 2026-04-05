import { json } from "./_lib/http.js";

/**
 * TEMPORARY DIAGNOSTIC ENDPOINT - Remove before production
 * 
 * Used to diagnose environment variable configuration on Netlify Functions.
 * Only responds when ?debug=auth or ?debug=email query param is present (manual safety check).
 * 
 * Accessible via: GET /api/debug-env?debug=auth or /api/debug-env?debug=email
 */
export const handler = async (event) => {
  // Safety check: only respond if debug param is present
  const params = new URLSearchParams(event.queryStringParameters || {});
  const debugValue = params.get('debug');
  if (!params.has('debug') || (debugValue !== 'auth' && debugValue !== 'email')) {
    return json(403, { error: 'Debug mode not enabled. Add ?debug=auth or ?debug=email to enable.' });
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

  const resendFromRaw = (process.env.RESEND_FROM_EMAIL || '').trim();
  const resendFromAddress = (() => {
    if (!resendFromRaw) return '';
    const match = resendFromRaw.match(/<([^>]+)>$/);
    return (match ? match[1] : resendFromRaw).trim().toLowerCase();
  })();
  const resendFromDomain = resendFromAddress.includes('@') ? resendFromAddress.split('@').pop() : '';

  const likelyPersonalDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
  const resendDomainLooksPersonal = Boolean(resendFromDomain && likelyPersonalDomains.includes(resendFromDomain));
  
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
    resend: {
      apiKeyConfigured: Boolean(process.env.RESEND_API_KEY),
      fromConfigured: Boolean(resendFromRaw),
      fromAddressPreview: resendFromAddress || null,
      fromDomain: resendFromDomain || null,
      fromDomainLooksPersonal: resendDomainLooksPersonal,
      ready: Boolean(process.env.RESEND_API_KEY && resendFromRaw && !resendDomainLooksPersonal),
    },
    notes: {
      buildEnv: 'These are Functions-level environment variables',
      frontendVars: 'Build environment vars (VITE_*) are separate and set during build',
      requiredFunctions: [
        'SUPABASE_URL or VITE_SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY',
        'ADMIN_EMAILS (for email fallback)',
        'RESEND_API_KEY (for transactional emails)',
        'RESEND_FROM_EMAIL (must be verified domain in Resend)',
        '/api/auth-password-reset uses SUPABASE_SERVICE_ROLE_KEY + Resend to deliver reset links',
      ],
    },
  };

  console.log('[DEBUG-ENV] Environment diagnostic requested', { diagnostics });

  return json(200, diagnostics);
};
