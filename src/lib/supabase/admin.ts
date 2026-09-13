import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicConfig } from "./env.ts";

export function createSupabaseAdminClient() {
  const { url } = getSupabasePublicConfig({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing required environment variable: SUPABASE_SECRET_KEY");
  }

  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}




