import { NextResponse } from "next/server";
import { requireActiveProfile } from "@/lib/auth/session";
import { dispatchDelivery } from "@/server/discord-deliveries";
export async function POST(_: Request, context: { params: Promise<{ id: string }> }) { try { await requireActiveProfile(); const result = await dispatchDelivery((await context.params).id); return NextResponse.json({ ...result.delivery, discordStatus: result.discordStatus, discordError: result.discordError }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo reintentar" }, { status: 400 }); } }




