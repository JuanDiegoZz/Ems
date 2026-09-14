import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { getActiveProfile } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/time/date";
import { getDelivery } from "@/server/deliveries";
import { DocumentViewer } from "@/components/documents/document-viewer";

export default async function DeliveryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getActiveProfile();
  if (!profile) redirect("/login");
  let delivery;
  try { delivery = await getDelivery((await params).id); } catch { notFound(); }
  const personName = delivery.person?.display_name ?? "Persona no disponible";
  return <AppShell profile={profile}><PageHeader eyebrow="Detalle de entrega" title={personName} description={delivery.type === "police" ? `Policía${delivery.person?.badge_number ? ` · Placa ${delivery.person.badge_number}` : ""}` : "Civil"} action={<Button href="/history" variant="secondary">Volver</Button>} /><div className="grid gap-4 md:grid-cols-2"><Card><p><strong>EMS:</strong> {delivery.profile?.rp_name ?? "EMS no disponible"}</p><p className="mt-2"><strong>Vendajes:</strong> {delivery.quantity_label}</p>{delivery.is_daily_free_kit && <p className="mt-2"><strong>Beneficio:</strong> <Badge tone="success">Kit diario gratuito</Badge></p>}<p className="mt-2"><strong>Fecha:</strong> {formatDateTime(delivery.occurred_at)}</p><p className="mt-2"><strong>Discord:</strong> <Badge tone={delivery.status === "sent" ? "success" : delivery.status === "failed" ? "neutral" : "info"}>{delivery.status}</Badge></p>{delivery.discord_message_id && <p className="mt-2 text-sm">Mensaje: {delivery.discord_message_id}</p>}{delivery.discord_error && <p className="mt-2 text-sm text-red-600">{delivery.discord_error}</p>}</Card><Card><p className="font-semibold">Documentos</p>{delivery.person ? <div className="mt-4 flex flex-wrap gap-3">{delivery.person.ine_path && <DocumentViewer personId={delivery.person_id} personName={personName} kind="ine" label="Ver INE" />}{delivery.type === "police" && delivery.person.badge_path && <DocumentViewer personId={delivery.person_id} personName={personName} kind="badge" label="Ver placa" />}</div> : <p className="mt-3 text-sm text-[var(--muted)]">Documentos no disponibles.</p>}</Card></div></AppShell>;
}







