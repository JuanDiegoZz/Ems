import { createSupabaseAdminClient } from "../lib/supabase/admin.ts";
import { buildCivilContent, buildPoliceContent, formatDiscordDate, sendDiscordWebhook, webhookForType } from "../lib/discord/webhook.ts";
import type { DeliveryRecord } from "./deliveries.ts";

function safeName(value: string) { return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "persona"; }
function safeError(error: unknown) { return (error instanceof Error ? error.message : "Discord request failed").replace(/https?:\/\/\S+/gi, "[webhook]").slice(0, 240); }

export async function dispatchDelivery(deliveryId: string) {
  const client = createSupabaseAdminClient();
  const deliveryResult = await client.from("deliveries").select("*").eq("id", deliveryId).maybeSingle<DeliveryRecord>();
  if (!deliveryResult.data) throw new Error("Entrega no encontrada");
  if (deliveryResult.data.status === "sent") return { delivery: deliveryResult.data, discordStatus: "sent" as const };
  const delivery = deliveryResult.data;
  try {
    const person = await client.from("people").select("display_name, badge_number, ine_path, badge_path").eq("id", delivery.person_id).single<{ display_name: string; badge_number: string | null; ine_path: string; badge_path: string | null }>();
    const profile = await client.from("profiles").select("rp_name").eq("id", delivery.delivered_by).single<{ rp_name: string }>();
    if (person.error || !person.data || profile.error || !profile.data) throw new Error("persona o perfil no encontrado");
    const webhook = webhookForType(delivery.type); if (!webhook) throw new Error("webhook no configurado");
    const attachments: { blob: Blob; filename: string; contentType: string }[] = [];
    const ine = await client.storage.from("rp-documents").download(person.data.ine_path); if (ine.error || !ine.data) throw new Error("fallo al descargar INE");
    const ineType = ine.data.type || "image/jpeg"; attachments.push({ blob: ine.data, contentType: ineType, filename: `ine-${safeName(person.data.display_name)}.${ineType.split("/")[1] || "jpg"}` });
    let content = "";
    if (delivery.type === "police") {
      if (!person.data.badge_number || !person.data.badge_path) throw new Error("documento de placa no encontrado");
      const badge = await client.storage.from("rp-documents").download(person.data.badge_path); if (badge.error || !badge.data) throw new Error("fallo al descargar placa");
      const badgeType = badge.data.type || "image/jpeg"; attachments.push({ blob: badge.data, contentType: badgeType, filename: `placa-${safeName(person.data.badge_number)}.${badgeType.split("/")[1] || "jpg"}` });
      content = buildPoliceContent(profile.data.rp_name, person.data.badge_number, formatDiscordDate(delivery.occurred_at), delivery.quantity_label, delivery.is_daily_free_kit === true);
    } else content = buildCivilContent(profile.data.rp_name, person.data.display_name, formatDiscordDate(delivery.occurred_at), delivery.quantity_label);
    const result = await sendDiscordWebhook({ webhookUrl: webhook, content, attachments });
    const update = await client.from("deliveries").update({ status: "sent", discord_message_id: result.messageId, discord_error: null, sent_at: new Date().toISOString() }).eq("id", delivery.id).select("*").single<DeliveryRecord>();
    if (update.error || !update.data) throw new Error("No se pudo actualizar el estado de Discord");
    return { delivery: update.data, discordStatus: "sent" as const };
  } catch (error) {
    const discordError = safeError(error);
    const update = await client.from("deliveries").update({ status: "failed", discord_error: discordError, sent_at: null }).eq("id", delivery.id).select("*").single<DeliveryRecord>();
    return { delivery: update.data ?? delivery, discordStatus: "failed" as const, discordError };
  }
}




