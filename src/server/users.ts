import { normalizeUsername } from "../lib/normalization/person.ts";
import { toInternalEmail } from "../lib/auth/identity.ts";
import { validatePassword } from "../lib/auth/password.ts";
import { requireAdmin } from "../lib/auth/session.ts";
import type { AppRole, Profile } from "../lib/auth/types.ts";
import { createSupabaseAdminClient } from "../lib/supabase/admin.ts";

export type CreateManagedUserInput = Readonly<{
  username: string;
  rpName: string;
  password: string;
  role: AppRole;
}>;

function validateUserInput({ username, rpName, password, role }: CreateManagedUserInput) {
  if (!rpName.trim() || rpName.trim().length > 100) {
    throw new Error("Invalid RP name");
  }

  validatePassword(password);

  if (role !== "admin" && role !== "ems") {
    throw new Error("Invalid role");
  }

  return { username: normalizeUsername(username), rpName: rpName.trim(), password, role };
}

async function createUser(input: CreateManagedUserInput): Promise<Profile> {
  const user = validateUserInput(input);
  const supabase = createSupabaseAdminClient();
  const domain = process.env.INTERNAL_AUTH_DOMAIN;

  if (!domain) {
    throw new Error("Missing required environment variable: INTERNAL_AUTH_DOMAIN");
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: toInternalEmail(user.username, domain),
    password: user.password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error("Could not create auth user");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .insert({ id: data.user.id, username: user.username, rp_name: user.rpName, role: user.role })
    .select("id, username, rp_name, role, active")
    .single<Profile>();

  if (profileError || !profile) {
    await supabase.auth.admin.deleteUser(data.user.id);
    throw new Error("Could not create profile");
  }

  return profile;
}

export async function createManagedUser(input: CreateManagedUserInput): Promise<Profile> {
  await requireAdmin();
  return createUser(input);
}

export async function listManagedUsers(): Promise<Profile[]> {
  await requireAdmin();
  const { data, error } = await createSupabaseAdminClient()
    .from("profiles")
    .select("id, username, rp_name, role, active")
    .order("created_at");

  if (error) {
    throw new Error("Could not list users");
  }

  return data as Profile[];
}

export async function setManagedUserActive(id: string, active: boolean): Promise<void> {
  const actor = await requireAdmin();

  if (actor.id === id && !active) {
    throw new Error("Administrators cannot deactivate themselves");
  }

  const { error } = await createSupabaseAdminClient().from("profiles").update({ active }).eq("id", id);

  if (error) {
    throw new Error("Could not update user status");
  }
}

export async function resetManagedUserPassword(id: string, password: string): Promise<void> {
  await requireAdmin();

  validatePassword(password);

  const { error } = await createSupabaseAdminClient().auth.admin.updateUserById(id, { password });

  if (error) {
    throw new Error("Could not reset password");
  }
}




