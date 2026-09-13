import { normalizeUsername } from "../normalization/person.ts";
import { createSupabaseAdminClient } from "../supabase/admin.ts";
import { toInternalEmail } from "./identity.ts";
import { validatePassword } from "./password.ts";
import type { Profile } from "./types.ts";

export async function createInitialAdmin(input: Readonly<{ username: string; rpName: string; password: string }>): Promise<Profile> {
  const username = normalizeUsername(input.username);
  const rpName = input.rpName.trim();
  const domain = process.env.INTERNAL_AUTH_DOMAIN;

  validatePassword(input.password);

  if (!rpName || rpName.length > 100 || !domain) {
    throw new Error("Invalid initial administrator configuration");
  }

  const supabase = createSupabaseAdminClient();
  const { count, error: countError } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");

  if (countError) throw new Error("Could not check existing administrators");
  if (count) throw new Error("An administrator already exists");

  const { data, error } = await supabase.auth.admin.createUser({
    email: toInternalEmail(username, domain), password: input.password, email_confirm: true,
  });
  if (error || !data.user) throw new Error("Could not create auth user");

  const { data: profile, error: profileError } = await supabase.from("profiles")
    .insert({ id: data.user.id, username, rp_name: rpName, role: "admin" })
    .select("id, username, rp_name, role, active").single<Profile>();
  if (profileError || !profile) { await supabase.auth.admin.deleteUser(data.user.id); throw new Error("Could not create profile"); }
  return profile;
}




