import { requireActiveProfile, requireAdmin } from "../lib/auth/session.ts";
import { normalizePersonInput, type PersonInput } from "../lib/people/validation.ts";
import { createSupabaseAdminClient } from "../lib/supabase/admin.ts";
import { normalizePersonName } from "../lib/normalization/person.ts";
import { rankPeople } from "../lib/people/search.ts";
import { canHardDelete } from "../lib/people/delete-policy.ts";

export type PersonRecord = { id: string; type: "civil" | "police"; first_name: string; last_name: string; display_name: string; search_name: string; badge_number: string | null; ine_path: string | null; badge_path: string | null; created_by: string; created_at: string; updated_at: string; archived_at: string | null };

export class PersonDeleteRequiresForceError extends Error {
  constructor(public readonly deliveryCount: number) {
    super("La persona tiene entregas relacionadas");
    this.name = "PersonDeleteRequiresForceError";
  }
}

function safeTerm(value: string) { return value.replace(/[%,()]/g, " ").trim(); }

export async function listPeople(options: { q?: string; type?: string; includeArchived?: boolean; limit?: number; offset?: number } = {}) {
  const profile = await requireActiveProfile();
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const client = createSupabaseAdminClient();
  let query = client.from("people").select("*").order("created_at", { ascending: false });
  if (!options.includeArchived || profile.role !== "admin") query = query.is("archived_at", null);
  if (options.type === "civil" || options.type === "police") query = query.eq("type", options.type);
  const term = safeTerm(normalizePersonName(options.q ?? ""));
  if (term) {
    const pattern = `%${term.slice(0, Math.min(3, term.length))}%`;
    query = options.type === "civil" ? query.ilike("search_name", pattern) : query.or(`search_name.ilike.${pattern},badge_number.ilike.${pattern}`);
    const { data, error } = await query.limit(200);
    if (error) throw new Error("No se pudieron consultar las personas");
    return rankPeople((data ?? []) as PersonRecord[], term).slice(options.offset ?? 0, (options.offset ?? 0) + limit);
  }
  query = query.range(options.offset ?? 0, (options.offset ?? 0) + limit - 1);
  const { data, error } = await query;
  if (error) throw new Error("No se pudieron consultar las personas");
  return (data ?? []) as PersonRecord[];
}

export async function findPersonDuplicates(input: PersonInput) {
  await requireActiveProfile();
  const normalized = normalizePersonInput({ ...input, inePath: input.inePath || "placeholder", badgePath: input.badgePath || (input.type === "police" ? "placeholder" : undefined) });
  const client = createSupabaseAdminClient();
  const names = await client.from("people").select("id, display_name, type, badge_number").eq("search_name", normalized.searchName).is("archived_at", null).limit(10);
  let badgeMatch = false;
  if (normalized.badgeNumber) {
    const result = await client.from("people").select("id").eq("badge_number", normalized.badgeNumber).eq("type", "police").is("archived_at", null).maybeSingle();
    badgeMatch = Boolean(result.data);
  }
  return { matches: names.data ?? [], badgeMatch };
}

export async function getPerson(id: string, includeArchived = false) {
  const profile = await requireActiveProfile();
  const { data, error } = await createSupabaseAdminClient().from("people").select("*").eq("id", id).maybeSingle<PersonRecord>();
  if (error || !data || (data.archived_at && (!includeArchived || profile.role !== "admin"))) throw new Error("Persona no encontrada");
  return data;
}

export async function createPerson(input: PersonInput, id = crypto.randomUUID()) {
  const profile = await requireActiveProfile();
  const normalized = normalizePersonInput(input);
  const { data, error } = await createSupabaseAdminClient().from("people").insert({ id, type: normalized.type, first_name: normalized.firstName, last_name: normalized.lastName, display_name: normalized.displayName, search_name: normalized.searchName, badge_number: normalized.badgeNumber, ine_path: normalized.inePath, badge_path: normalized.badgePath, created_by: profile.id }).select("*").single<PersonRecord>();
  if (error || !data) throw new Error(error?.code === "23505" ? "El número de placa ya está activo" : "No se pudo crear la persona");
  return data;
}

export async function updatePerson(id: string, input: PersonInput) {
  await requireActiveProfile();
  const normalized = normalizePersonInput(input);
  const { data, error } = await createSupabaseAdminClient().from("people").update({ type: normalized.type, first_name: normalized.firstName, last_name: normalized.lastName, display_name: normalized.displayName, search_name: normalized.searchName, badge_number: normalized.badgeNumber, ine_path: normalized.inePath, badge_path: normalized.badgePath, updated_at: new Date().toISOString() }).eq("id", id).select("*").single<PersonRecord>();
  if (error || !data) throw new Error(error?.code === "23505" ? "El número de placa ya está activo" : "No se pudo actualizar la persona");
  return data;
}

export async function setPersonArchived(id: string, archived: boolean) {
  await requireAdmin();
  const { error } = await createSupabaseAdminClient().from("people").update({ archived_at: archived ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error("No se pudo actualizar el archivo de la persona");
}

export async function countPersonDeliveries(id: string) {
  await requireActiveProfile();
  const { count, error } = await createSupabaseAdminClient().from("deliveries").select("id", { count: "exact", head: true }).eq("person_id", id);
  if (error) throw new Error("No se pudo consultar el historial de la persona");
  return count ?? 0;
}

export async function deletePerson(id: string, forceDeleteRelated = false) {
  const profile = await requireAdmin();
  if (!canHardDelete(profile.role)) throw new Error("Forbidden");
  const client = createSupabaseAdminClient();
  const { data: person, error: personError } = await client.from("people").select("id, ine_path, badge_path").eq("id", id).maybeSingle<{ id: string; ine_path: string | null; badge_path: string | null }>();
  if (personError || !person) throw new Error("Persona no encontrada");

  const { count, error: countError } = await client.from("deliveries").select("id", { count: "exact", head: true }).eq("person_id", id);
  if (countError) throw new Error("No se pudo comprobar el historial de la persona");
  const deliveryCount = count ?? 0;
  if (deliveryCount > 0 && !forceDeleteRelated) throw new PersonDeleteRequiresForceError(deliveryCount);

  const paths = [person.ine_path, person.badge_path].filter((path): path is string => Boolean(path));
  if (paths.length) {
    const { error: storageError } = await client.storage.from("rp-documents").remove(paths);
    if (storageError) throw new Error("No se pudieron eliminar los documentos privados");
  }
  if (deliveryCount > 0) {
    const { error: deliveriesError } = await client.from("deliveries").delete().eq("person_id", id);
    if (deliveriesError) throw new Error("No se pudieron eliminar las entregas relacionadas");
  }
  const { error } = await client.from("people").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar la persona");
}




