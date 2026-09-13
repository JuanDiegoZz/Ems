import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicConfig } from "./env";

export function createBrowserSupabaseClient() {
  const { url, publishableKey } = getSupabasePublicConfig({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  return createBrowserClient(url, publishableKey);
}




