export type DiscordAttachment = { blob: Blob; filename: string; contentType: string };
export type DiscordSendInput = { webhookUrl: string; content: string; attachments: DiscordAttachment[] };

import { formatDate } from "../time/date.ts";
export function formatDiscordDate(value: string | Date) { return formatDate(value); }
export function buildCivilContent(rpName: string, personName: string, date: string, quantity: string) { return `**Entrega de Kit Civil**\n| Atendio: ${rpName}\n| Nombre del civil: ${personName}\n| Fecha de Entrega: ${date}\n| Cantidad de vendajes: ${quantity}`; }
export function buildPoliceContent(rpName: string, badge: string, date: string, quantity: string) { return `**Entrega de Kit Policial**\n| Atendio: ${rpName}\n| Placa: ${badge}\n| Fecha de Entrega: ${date}\n| Cantidad de vendajes: ${quantity}`; }
export function webhookForType(type: "civil" | "police") { return type === "civil" ? process.env.DISCORD_WEBHOOK_CIVIL : process.env.DISCORD_WEBHOOK_POLICE; }

export async function sendDiscordWebhook({ webhookUrl, content, attachments }: DiscordSendInput) {
  if (!/^https:\/\/discord(?:app)?\.com\/api\/webhooks\//.test(webhookUrl)) throw new Error("webhook no configurado o inválido");
  const form = new FormData(); form.append("payload_json", JSON.stringify({ content }));
  attachments.forEach((attachment, index) => form.append(`files[${index}]`, attachment.blob, attachment.filename));
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 10000);
  try { const response = await fetch(`${webhookUrl}${webhookUrl.includes("?") ? "&" : "?"}wait=true`, { method: "POST", body: form, signal: controller.signal }); const body = await response.text(); if (!response.ok) throw new Error(`Discord ${response.status}${response.status === 429 ? " rate limit" : ""}`); let parsed: { id?: string } = {}; try { parsed = JSON.parse(body) as { id?: string }; } catch { /* Discord may return an empty body for a successful webhook. */ } return { messageId: parsed.id ?? null };
  } catch (error) { if (error instanceof Error && error.name === "AbortError") throw new Error("Discord timeout"); throw error instanceof Error ? error : new Error("Discord request failed"); } finally { clearTimeout(timeout); }
}




