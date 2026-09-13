import { createSupabaseAdminClient } from "../supabase/admin.ts";
import { createServerSupabaseClient } from "../supabase/server.ts";
import type { Profile } from "./types.ts";

export async function getActiveProfile(): Promise<Profile | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const profile = await getProfileById(user.id);

  return profile?.active ? profile : null;
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const { data: profile } = await createSupabaseAdminClient()
    .from("profiles")
    .select("id, username, rp_name, role, active")
    .eq("id", id)
    .maybeSingle<Profile>();

  return profile;
}

export async function requireActiveProfile(): Promise<Profile> {
  const profile = await getActiveProfile();

  if (!profile) {
    throw new Error("Unauthorized");
  }

  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireActiveProfile();

  if (profile.role !== "admin") {
    throw new Error("Forbidden");
  }

  return profile;
}




