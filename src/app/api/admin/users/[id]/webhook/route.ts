import { NextResponse } from "next/server";
import { deleteWebhook, saveWebhook, webhookStatus, WebhookConfigurationError } from "@/server/shifts";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { try { return NextResponse.json(await webhookStatus((await params).id)); } catch { return NextResponse.json({ error: "No autorizado" }, { status: 403 }); } }
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { const body = await request.json().catch(() => null); try { return NextResponse.json(await saveWebhook((await params).id, body?.webhookUrl)); } catch (error) { return NextResponse.json({ error: error instanceof WebhookConfigurationError ? error.message : "No se pudo guardar la configuración de Discord" }, { status: error instanceof WebhookConfigurationError ? 400 : 500 }); } }
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) { try { return NextResponse.json(await deleteWebhook((await params).id)); } catch { return NextResponse.json({ error: "No se pudo eliminar la configuración de Discord" }, { status: 400 }); } }
