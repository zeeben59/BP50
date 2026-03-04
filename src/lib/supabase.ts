import { createClient } from '@supabase/supabase-js';

// Read Supabase connection info from Vite environment variables.
// Do NOT commit real keys into the repository; use .env (see .env.example)
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

if (!supabaseUrl || !supabaseKey) {
	// It's intentional to only warn here — developers should set env vars locally.
	// Running without these will cause runtime errors when attempting DB calls.
	// Rotate any leaked keys immediately and use the anon/public key for client-side.
	// See README.md -> Setup for details.
	// eslint-disable-next-line no-console
	console.warn('Supabase env vars missing: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export { supabase };