import { requireActiveProfile, requireAdmin } from "../lib/auth/session.ts";
import { isDeliverableCivil, isDeliverablePolice, validateCivilDelivery, type CivilDeliveryInput } from "../lib/deliveries/validation.ts";
import { createSupabaseAdminClient } from "../lib/supabase/admin.ts";
import { dispatchDelivery } from "./discord-deliveries.ts";
import { startOfDayInTimeZone } from "../lib/time/date.ts";
import type { PersonRecord } from "./people.ts";
import { DAILY_FREE_KIT_QUANTITY, getAppLocalDate } from "../lib/deliveries/daily-free-kit.ts";
import { getDeliverySettings } from "./delivery-settings.ts";

export type DeliveryRecord = { id: string; client_request_id: string; person_id: string; delivered_by: string; type: "civil" | "police"; quantity_label: string; occurred_at: string; status: "pending" | "sent" | "failed"; is_daily_free_kit?: boolean; daily_free_kit_date?: string | null; discord_message_id?: string | null; discord_error?: string | null; sent_at?: string | null };
export type DeliveryPerson = { id: string; display_name: string; badge_number: string | null; type: "civil" | "police"; ine_path?: string | null; badge_path?: string | null };
export type DeliveryPreselection = { person: PersonRecord | null; reason: "archived" | "ineligible" | "not-found" | null };
export type DeliveryView = DeliveryRecord & { person: DeliveryPerson | null; profile: { id?: string; rp_name: string } | null };
type RawRelation = Record<string, unknown> | Array<Record<string, unknown>> | null;
type RawDelivery = DeliveryRecord & { people?: RawRelation; profiles?: RawRelation };
function relation(value: RawRelation | undefined) { return Array.isArray(value) ? value[0] ?? null : value ?? null; }
function normalizeDelivery(value: RawDelivery): DeliveryView {
  const person = relation(value.people);
  const profile = relation(value.profiles);
  return { ...value, person: person && typeof person.display_name === "string" && typeof person.type === "string" ? { id: typeof person.id === "string" ? person.id : value.person_id, display_name: person.display_name, badge_number: typeof person.badge_number === "string" ? person.badge_number : null, type: person.type === "police" ? "police" : "civil", ine_path: typeof person.ine_path === "string" ? person.ine_path : null, badge_path: typeof person.badge_path === "string" ? person.badge_path : null } : null, profile: profile && typeof profile.rp_name === "string" ? { id: typeof profile.id === "string" ? profile.id : undefined, rp_name: profile.rp_name } : null };
}

export async function listDeliveries(options: { q?: string; type?: string; status?: string; from?: string; to?: string; personId?: string; emsId?: string; page?: number } = {}) {
  await requireActiveProfile(); const client = createSupabaseAdminClient(); const page = Math.max(1, options.page ?? 1); const limit = 25;
  let query = client.from("deliveries").select("*, people(id, display_name, badge_number, type), profiles(id, rp_name)", { count: "exact" }).order("occurred_at", { ascending: false }).range((page - 1) * limit, page * limit - 1);
  if (options.type === "civil" || options.type === "police") query = query.eq("type", options.type);
  if (options.status === "pending" || options.status === "sent" || options.status === "failed") query = query.eq("status", options.status);
  if (options.personId) query = query.eq("person_id", options.personId);
  if (options.emsId) query = query.eq("delivered_by", options.emsId);
  if (options.from) query = query.gte("occurred_at", options.from);
  if (options.to) query = query.lt("occurred_at", options.to);
  const term = options.q?.trim(); if (term) { const safe = term.replace(/[%,()]/g, " "); const [people, profiles] = await Promise.all([client.from("people").select("id").or(`search_name.ilike.%${safe}%,display_name.ilike.%${safe}%,badge_number.ilike.%${safe}%`), client.from("profiles").select("id").ilike("rp_name", `%${safe}%`)]); const personIds = (people.data ?? []).map((person) => person.id); const profileIds = (profiles.data ?? []).map((profile) => profile.id); if (!personIds.length && !profileIds.length) return { data: [] as DeliveryView[], count: 0, page, limit }; if (personIds.length && profileIds.length) query = query.or(`person_id.in.(${personIds.join(",")}),delivered_by.in.(${profileIds.join(",")})`); else if (personIds.length) query = query.in("person_id", personIds); else query = query.in("delivered_by", profileIds); }
  const result = await query; if (result.error) throw new Error("No se pudo consultar el historial"); return { data: (result.data ?? []).map((item) => normalizeDelivery(item as unknown as RawDelivery)), count: result.count ?? 0, page, limit };
}

export async function listDeliveryOperators() { await requireActiveProfile(); const { data, error } = await createSupabaseAdminClient().from("profiles").select("id, rp_name").order("rp_name"); if (error) throw new Error("No se pudieron consultar los EMS"); return (data ?? []) as Array<{ id: string; rp_name: string }>; }
export async function getDeliveryPreselection(id: string, type: "civil" | "police"): Promise<DeliveryPreselection> { await requireActiveProfile(); const { data, error } = await createSupabaseAdminClient().from("people").select("*").eq("id", id).maybeSingle<PersonRecord>(); if (error || !data) return { person: null, reason: "not-found" }; if (data.archived_at) return { person: null, reason: "archived" }; if (type === "civil" ? !isDeliverableCivil(data) : !isDeliverablePolice(data)) return { person: null, reason: "ineligible" }; return { person: data, reason: null }; }

export async function getDelivery(id: string) { await requireActiveProfile(); const { data, error } = await createSupabaseAdminClient().from("deliveries").select("*, people(id, display_name, badge_number, type, ine_path, badge_path), profiles(id, rp_name)").eq("id", id).maybeSingle(); if (error || !data) throw new Error("Entrega no encontrada"); return normalizeDelivery(data as unknown as RawDelivery); }
export async function listPersonDeliveries(personId: string) { await requireActiveProfile(); const { data, error } = await createSupabaseAdminClient().from("deliveries").select("id, quantity_label, occurred_at, status, is_daily_free_kit, profiles(id, rp_name)").eq("person_id", personId).order("occurred_at", { ascending: false }).limit(5); if (error) throw new Error("No se pudo consultar el historial"); return (data ?? []).map((item) => { const raw = item as unknown as { id: string; quantity_label: string; occurred_at: string; status: string; is_daily_free_kit?: boolean; profiles?: RawRelation }; const profile = relation(raw.profiles); return { id: raw.id, quantity_label: raw.quantity_label, occurred_at: raw.occurred_at, status: raw.status, is_daily_free_kit: raw.is_daily_free_kit === true, profile: profile && typeof profile.rp_name === "string" ? { rp_name: profile.rp_name } : null }; }); }

export async function deliveryStats() { await requireActiveProfile(); const client = createSupabaseAdminClient(); const start = startOfDayInTimeZone(); const [today, people, latest] = await Promise.all([client.from("deliveries").select("id", { count: "exact", head: true }).gte("occurred_at", start.toISOString()), client.from("people").select("id", { count: "exact", head: true }).is("archived_at", null), client.from("deliveries").select("occurred_at, people!inner(display_name)").order("occurred_at", { ascending: false }).limit(1).maybeSingle()]); return { deliveriesToday: today.count ?? 0, activePeople: people.count ?? 0, latest: latest.data ?? null }; }
export async function updateDeliveryQuantity(id: string, quantityLabel: string) { await requireAdmin(); const value = quantityLabel.trim(); if (!/^\d{1,12}\s*[xX×]\s*\d{1,12}$/.test(value) || value.length > 32) throw new Error("Cantidad inválida"); const { error } = await createSupabaseAdminClient().from("deliveries").update({ quantity_label: value }).eq("id", id); if (error) throw new Error("No se pudo corregir la cantidad"); }

export async function createCivilDelivery(input: CivilDeliveryInput) {
  const profile = await requireActiveProfile();
  const delivery = validateCivilDelivery(input);
  const client = createSupabaseAdminClient();
  const person = await client.from("people").select("id, archived_at, ine_path").eq("id", delivery.personId).maybeSingle<{ id: string; archived_at: string | null; ine_path: string | null }>();
  if (!person.data || !isDeliverableCivil(person.data)) throw new Error("La persona no está disponible para una entrega civil");
  const { data, error } = await client.from("deliveries").insert({ client_request_id: delivery.clientRequestId, person_id: delivery.personId, delivered_by: profile.id, type: "civil", quantity_label: delivery.quantityLabel, occurred_at: new Date().toISOString(), status: "pending" }).select("*").single<DeliveryRecord>();
  if (!error && data) { const result = await dispatchDelivery(data.id); return { ...result.delivery, discordStatus: result.discordStatus, discordError: result.discordError }; }
  if (error?.code === "23505") {
    const existing = await client.from("deliveries").select("*").eq("client_request_id", delivery.clientRequestId).maybeSingle<DeliveryRecord>();
    if (existing.data) { const result = await dispatchDelivery(existing.data.id); return { ...result.delivery, discordStatus: result.discordStatus, discordError: result.discordError }; }
  }
  throw new Error("No se pudo registrar la entrega");
}

export type PoliceDeliveryInput = CivilDeliveryInput & { acceptChargedDailyKit?: boolean };

export class DailyFreeKitConfirmationError extends Error {
  constructor(public readonly code: "DAILY_FREE_KIT_ALREADY_USED" | "DAILY_FREE_KIT_5X5_ONLY", message: string) { super(message); this.name = "DailyFreeKitConfirmationError"; }
}

export async function createPoliceDelivery(input: PoliceDeliveryInput) {
  const profile = await requireActiveProfile();
  const delivery = validateCivilDelivery(input);
  const client = createSupabaseAdminClient();
  const person = await client.from("people").select("id, type, badge_number, ine_path, badge_path, archived_at").eq("id", delivery.personId).maybeSingle<{ id: string; type: "civil" | "police"; badge_number: string | null; ine_path: string; badge_path: string | null; archived_at: string | null }>();
  if (!person.data || !isDeliverablePolice(person.data)) throw new Error("El policía no está disponible para una entrega");
  const { policeDailyFreeKitEnabled } = await getDeliverySettings();
  const localDate = getAppLocalDate();
  const used = policeDailyFreeKitEnabled ? await client.from("deliveries").select("id").eq("person_id", delivery.personId).eq("is_daily_free_kit", true).eq("daily_free_kit_date", localDate).maybeSingle<{ id: string }>() : { data: null, error: null };
  if (used.error) throw new Error("No se pudo comprobar el kit diario");
  const dailyFree = policeDailyFreeKitEnabled && delivery.quantityLabel === DAILY_FREE_KIT_QUANTITY && !used.data;
  if (policeDailyFreeKitEnabled && !dailyFree && input.acceptChargedDailyKit !== true) throw new DailyFreeKitConfirmationError(used.data ? "DAILY_FREE_KIT_ALREADY_USED" : "DAILY_FREE_KIT_5X5_ONLY", used.data ? "Este oficial ya recibió su kit gratuito de hoy. Esta entrega sí se cobra." : "El kit gratuito diario corresponde a 5x5. Esta entrega se cobrará.");
  const { data, error } = await client.from("deliveries").insert({ client_request_id: delivery.clientRequestId, person_id: delivery.personId, delivered_by: profile.id, type: "police", quantity_label: delivery.quantityLabel, occurred_at: new Date().toISOString(), status: "pending", is_daily_free_kit: dailyFree, daily_free_kit_date: dailyFree ? localDate : null }).select("*").single<DeliveryRecord>();
  if (!error && data) { const result = await dispatchDelivery(data.id); return { ...result.delivery, discordStatus: result.discordStatus, discordError: result.discordError }; }
  if (error?.code === "23505") { const existing = await client.from("deliveries").select("*").eq("client_request_id", delivery.clientRequestId).maybeSingle<DeliveryRecord>(); if (existing.data) { const result = await dispatchDelivery(existing.data.id); return { ...result.delivery, discordStatus: result.discordStatus, discordError: result.discordError }; } if (dailyFree && input.acceptChargedDailyKit !== true) throw new DailyFreeKitConfirmationError("DAILY_FREE_KIT_ALREADY_USED", "Este oficial acaba de recibir su kit gratuito de hoy. Esta entrega sí se cobra."); }
  throw new Error("No se pudo registrar la entrega policial");
}





