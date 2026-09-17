import "server-only";

import { requireActiveProfile, requireAdmin } from "../lib/auth/session.ts";
import { createSupabaseAdminClient } from "../lib/supabase/admin.ts";
import { validatePriceInput, type PriceCatalogItem, type PriceInput } from "../lib/prices/catalog.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FIELDS = "id, name, category, price, unit, description, active, sort_order, updated_at, updated_by";

export type PriceCatalogErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION_ERROR" | "NOT_FOUND" | "INTERNAL_ERROR";

export class PriceCatalogError extends Error {
  readonly code: PriceCatalogErrorCode;
  constructor(code: PriceCatalogErrorCode, message: string) { super(message); this.code = code; this.name = "PriceCatalogError"; }
}

function fail(code: PriceCatalogErrorCode, message: string): never { throw new PriceCatalogError(code, message); }
function id(value: unknown) { if (typeof value !== "string" || !UUID.test(value)) fail("VALIDATION_ERROR", "Precio inválido"); return value; }
function row(value: Record<string, unknown>): PriceCatalogItem { return { id: String(value.id), name: String(value.name), category: String(value.category), price: Number(value.price), unit: value.unit ? String(value.unit) : null, description: value.description ? String(value.description) : null, active: Boolean(value.active), sortOrder: Number(value.sort_order), updatedAt: value.updated_at ? String(value.updated_at) : null, updatedBy: value.updated_by ? String(value.updated_by) : null }; }
function validate(input: PriceInput) { try { return validatePriceInput(input); } catch (cause) { fail("VALIDATION_ERROR", cause instanceof Error ? cause.message : "Datos de precio inválidos."); } }
async function admin() { try { return await requireAdmin(); } catch (cause) { const message = cause instanceof Error ? cause.message : ""; fail(message === "Forbidden" ? "FORBIDDEN" : message === "Unauthorized" ? "UNAUTHORIZED" : "INTERNAL_ERROR", message === "Forbidden" ? "No tienes permisos para modificar precios." : message === "Unauthorized" ? "No autorizado." : "No se pudo validar la sesión."); } }

export async function listPrices(): Promise<PriceCatalogItem[]> {
  const profile = await requireActiveProfile();
  const client = createSupabaseAdminClient();
  let query = client.from("price_catalog").select(FIELDS).order("sort_order", { ascending: true }).order("name", { ascending: true });
  if (profile.role !== "admin") query = query.eq("active", true);
  const result = await query;
  if (result.error) fail("INTERNAL_ERROR", "No se pudo consultar el catálogo de precios.");
  return (result.data ?? []).map((item) => row(item as Record<string, unknown>));
}

export async function createPrice(input: PriceInput): Promise<PriceCatalogItem> {
  const actor = await admin();
  const value = validate(input);
  const result = await createSupabaseAdminClient().from("price_catalog").insert({ name: value.name, category: value.category, price: value.price, unit: value.unit, description: value.description, active: value.active, sort_order: value.sortOrder, updated_by: actor.id }).select(FIELDS).single();
  if (result.error || !result.data) fail("INTERNAL_ERROR", "No se pudo crear el precio.");
  return row(result.data as Record<string, unknown>);
}

export async function updatePrice(priceId: unknown, input: PriceInput): Promise<PriceCatalogItem> {
  const actor = await admin();
  const value = validate(input);
  const result = await createSupabaseAdminClient().from("price_catalog").update({ name: value.name, category: value.category, price: value.price, unit: value.unit, description: value.description, sort_order: value.sortOrder, updated_at: new Date().toISOString(), updated_by: actor.id }).eq("id", id(priceId)).select(FIELDS).maybeSingle();
  if (result.error) fail("INTERNAL_ERROR", "No se pudo actualizar el precio.");
  if (!result.data) fail("NOT_FOUND", "Precio no encontrado.");
  return row(result.data as Record<string, unknown>);
}

export async function setPriceActive(priceId: unknown, active: unknown): Promise<PriceCatalogItem> {
  const actor = await admin();
  if (typeof active !== "boolean") fail("VALIDATION_ERROR", "El estado activo es inválido.");
  const result = await createSupabaseAdminClient().from("price_catalog").update({ active, updated_at: new Date().toISOString(), updated_by: actor.id }).eq("id", id(priceId)).select(FIELDS).maybeSingle();
  if (result.error) fail("INTERNAL_ERROR", "No se pudo actualizar el estado del precio.");
  if (!result.data) fail("NOT_FOUND", "Precio no encontrado.");
  return row(result.data as Record<string, unknown>);
}
