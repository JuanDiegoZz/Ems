export type SupabasePublicConfig = Readonly<{
  url: string;
  publishableKey: string;
}>;

export function getSupabasePublicConfig({
  url,
  publishableKey,
}: Partial<SupabasePublicConfig>): SupabasePublicConfig {
  if (!url) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!publishableKey) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  return { url, publishableKey };
}




