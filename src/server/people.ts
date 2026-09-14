import { requireActiveProfile, requireAdmin } from "../lib/auth/session.ts";
import { normalizePersonInput, type PersonInput } from "../lib/people/validation.ts";
import { createSupabaseAdminClient } from "../lib/supabase/admin.ts";
import { normalizePersonName } from "../lib/normalization/person.ts";
import { rankPeople } from "../lib/people/search.ts";
import { canHardDelete } from "../lib/people/delete-policy.ts";
import { normalizeDuplicateLookupInput, type DuplicateCandidate } from "../lib/people/duplicates.ts";
import { getPeoplePageMeta, normalizePeoplePage, normalizePeoplePageSize, PEOPLE_PAGE_SIZE } from "../lib/people/pagination.ts";

export type PersonRecord = { id: string; type: "civil" | "police"; first_name: string; last_name: string; display_name: string; search_name: string; badge_number: string | null; ine_path: string | null; badge_path: string | null; created_by: string; created_at: string; updated_at: string; archived_at: string | null };

export class PersonDeleteRequiresForceError extends Error {
  constructor(public readonly deliveryCount: number) {
    super("La persona tiene entregas relacionadas");
    this.name = "PersonDeleteRequiresForceError";
  }
}

function safeTerm(value: string) { return value.replace(/[%,()]/g, " ").trim(); }

export type PeoplePage = {
  items: PersonRecord[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export async function listPeople(options: { q?: string; search?: string; type?: string; includeArchived?: boolean; page?: number; pageSize?: number; limit?: number; offset?: number } = {}): Promise<PeoplePage> {
  const profile = await requireActiveProfile();
  const pageSize = normalizePeoplePageSize(options.pageSize ?? options.limit ?? PEOPLE_PAGE_SIZE);
  const page = normalizePeoplePage(options.page ?? (options.offset === undefined ? 1 : Math.floor(Math.max(options.offset, 0) / pageSize) + 1));
  const client = createSupabaseAdminClient();
  let query = client.from("people").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (!options.includeArchived || profile.role !== "admin") query = query.is("archived_at", null);
  if (options.type === "civil" || options.type === "police") query = query.eq("type", options.type);
  const term = safeTerm(normalizePersonName(options.search ?? options.q ?? ""));
  if (term) {
    const pattern = `%${term.slice(0, Math.min(3, term.length))}%`;
    query = options.type === "civil" ? query.ilike("search_name", pattern) : query.or(`search_name.ilike.${pattern},badge_number.ilike.${pattern}`);
  }
  const load = async (targetPage: number) => {
    const { data, count, error } = await query.range((targetPage - 1) * pageSize, targetPage * pageSize - 1);
    if (error) throw new Error("No se pudieron consultar las personas");
    return { items: (data ?? []) as PersonRecord[], total: count ?? 0 };
  };
  const first = await load(page);
  const meta = getPeoplePageMeta(first.total, page, pageSize);
  const result = meta.page === page ? first : await load(meta.page);
  const items = term ? rankPeople(result.items, term) : result.items;
  return { items, ...meta };
}

export async function findPersonDuplicates(input: unknown) {
  await requireActiveProfile();
  const normalized = normalizeDuplicateLookupInput(input);
  const client = createSupabaseAdminClient();
  const fields = "id, display_name, type, badge_number, search_name";
  const names = normalized.searchName
    ? await client.from("people").select(fields).eq("search_name", normalized.searchName).is("archived_at", null).limit(10)
    : { data: [], error: null };
  const prefix = normalized.searchName.slice(0, Math.min(3, normalized.searchName.length));
  const possible = prefix
    ? await client.from("people").select(fields).ilike("search_name", `%${safeTerm(prefix)}%`).is("archived_at", null).limit(100)
    : { data: [], error: null };
  if (names.error || possible.error) throw new Error("No se pudo comprobar duplicados");
  const possibleMatches = normalized.searchName
    ? rankPeople((possible.data ?? []) as PersonRecord[], normalized.searchName).filter((person) => person.search_name !== normalized.searchName).slice(0, 5)
    : [];
  let badgeMatch = false;
  let badgeMatches: DuplicateCandidate[] = [];
  if (normalized.type === "police" && normalized.badgeNumber) {
    const result = await client.from("people").select(fields).eq("badge_number", normalized.badgeNumber).eq("type", "police").is("archived_at", null).maybeSingle<DuplicateCandidate>();
    if (result.error) throw new Error("No se pudo comprobar duplicados");
    badgeMatch = Boolean(result.data);
    badgeMatches = result.data ? [result.data] : [];
  }
  return { matches: (names.data ?? []) as DuplicateCandidate[], possibleMatches, badgeMatch, badgeMatches };
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




