import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type EncryptedWebhook = { iv: string; ciphertext: string; auth_tag: string };

function keyFrom(value: string) { const key = Buffer.from(value, "base64"); if (key.length !== 32 || key.toString("base64") !== value) throw new Error("EMS_WEBHOOK_ENCRYPTION_KEY debe ser una clave base64 de 32 bytes"); return key; }
export function getWebhookEncryptionKey() { const key = process.env.EMS_WEBHOOK_ENCRYPTION_KEY; if (!key) throw new Error("Falta configurar EMS_WEBHOOK_ENCRYPTION_KEY"); return keyFrom(key); }
export function encryptWebhook(webhook: string, encodedKey = process.env.EMS_WEBHOOK_ENCRYPTION_KEY ?? "") : EncryptedWebhook { const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", keyFrom(encodedKey), iv); const ciphertext = Buffer.concat([cipher.update(webhook, "utf8"), cipher.final()]); return { iv: iv.toString("base64"), ciphertext: ciphertext.toString("base64"), auth_tag: cipher.getAuthTag().toString("base64") }; }
export function decryptWebhook(value: EncryptedWebhook, encodedKey = process.env.EMS_WEBHOOK_ENCRYPTION_KEY ?? "") { const decipher = createDecipheriv("aes-256-gcm", keyFrom(encodedKey), Buffer.from(value.iv, "base64")); decipher.setAuthTag(Buffer.from(value.auth_tag, "base64")); return Buffer.concat([decipher.update(Buffer.from(value.ciphertext, "base64")), decipher.final()]).toString("utf8"); }
export function isDiscordWebhookUrl(value: string) { try { const url = new URL(value); return url.protocol === "https:" && (url.hostname === "discord.com" || url.hostname === "discordapp.com") && /^\/api\/webhooks\/\d+\/[\w-]+/.test(url.pathname); } catch { return false; } }
export function buildShiftOpenContent(rpName: string, startedAt: string) { return `**Bitácora EMS abierta**\n| EMS: ${rpName}\n| Inicio: ${startedAt}\n| Estado: En servicio`; }
export function buildShiftCloseContent(rpName: string, startedAt: string, endedAt: string, duration: string) { return `**Bitácora EMS cerrada**\n| EMS: ${rpName}\n| Inicio: ${startedAt}\n| Fin: ${endedAt}\n| Tiempo trabajado: ${duration}`; }
