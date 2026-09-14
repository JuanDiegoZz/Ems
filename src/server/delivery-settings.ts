import { requireActiveProfile, requireAdmin } from "../lib/auth/session.ts";
import { DAILY_FREE_KIT_QUANTITY, getAppLocalDate } from "../lib/deliveries/daily-free-kit.ts";
import { createSupabaseAdminClient } from "../lib/supabase/admin.ts";

type SettingsRow = { police_daily_free_kit_enabled: boolean };

async function readSettings() {
  const { data, error } = await createSupabaseAdminClient().from("app_settings").select("police_daily_free_kit_enabled").eq("id", true).maybeSingle<SettingsRow>();
  if (error) throw new Error("No se pudo consultar la configuración de entregas");
  return { policeDailyFreeKitEnabled: data?.police_daily_free_kit_enabled ?? false };
}

export async function getDeliverySettings() {
  await requireActiveProfile();
  return readSettings();
}

export async function updatePoliceDailyFreeKitEnabled(enabled: boolean) {
  await requireAdmin();
  const { error } = await createSupabaseAdminClient().from("app_settings").upsert({ id: true, police_daily_free_kit_enabled: enabled, updated_at: new Date().toISOString() });
  if (error) throw new Error("No se pudo guardar la configuración de entregas");
  return { policeDailyFreeKitEnabled: enabled };
}

export type PoliceDailyKitStatus = { enabled: boolean; available: boolean; localDate: string; freeQuantity: typeof DAILY_FREE_KIT_QUANTITY; usedDeliveryId: string | null; usedAt: string | null };

export async function getPoliceDailyKitStatus(personId: string): Promise<PoliceDailyKitStatus> {
  await requireActiveProfile();
  const settings = await readSettings();
  const localDate = getAppLocalDate();
  if (!settings.policeDailyFreeKitEnabled) return { enabled: false, available: false, localDate, freeQuantity: DAILY_FREE_KIT_QUANTITY, usedDeliveryId: null, usedAt: null };
  const { data, error } = await createSupabaseAdminClient().from("deliveries").select("id, occurred_at").eq("person_id", personId).eq("is_daily_free_kit", true).eq("daily_free_kit_date", localDate).maybeSingle<{ id: string; occurred_at: string }>();
  if (error) throw new Error("No se pudo consultar el kit diario");
  return { enabled: true, available: !data, localDate, freeQuantity: DAILY_FREE_KIT_QUANTITY, usedDeliveryId: data?.id ?? null, usedAt: data?.occurred_at ?? null };
}
