/**
 * The one shared Supabase client for the whole app.
 *
 * Every database query, auth call, file upload and edge-function call goes through
 * this object. Import it with:
 *   import { supabase } from "@/integrations/supabase/client";
 *
 * The URL and key come from .env (see README). The "publishable" (anon) key is safe
 * in the browser: row-level security in the database decides what each user can see.
 */
import { createClient } from '@supabase/supabase-js';
// Database types (generated from the schema) give autocomplete and type-checking on
// table names and columns, e.g. supabase.from("topics").select("topic_name").
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // Keep the login session in localStorage so users stay signed in after a refresh.
    storage: localStorage,
    persistSession: true,
    // Quietly swap expired access tokens for fresh ones in the background.
    autoRefreshToken: true,
  }
});
