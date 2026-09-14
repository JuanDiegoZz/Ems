import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { getActiveProfile } from "@/lib/auth/session";
import { formatDate, formatDateTime } from "@/lib/time/date";
import { countPersonDeliveries, getPerson } from "@/server/people";
import { listPersonDeliveries } from "@/server/deliveries";
import { PersonActions } from "@/components/people/person-actions";
import { DocumentViewer } from "@/components/documents/document-viewer";
import { deliveryActionsForPerson } from "@/lib/deliveries/navigation";

export default async function PersonPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ upgraded?: string }> }) {
  const profile = await getActiveProfile();
  if (!profile) redirect("/login");
  const id = (await params).id;
  const upgraded = (await searchParams).upgraded === "1";
  let person;
  try { person = await getPerson(id, profile.role === "admin"); } catch { notFound(); }
  const [deliveries, deliveryCount] = await Promise.all([listPersonDeliveries(id), countPersonDeliveries(id)]);
  const deliveryActions = deliveryActionsForPerson(person);
  return <AppShell profile={profile}>{upgraded && <p className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-sm text-emerald-300" role="status">Datos policiales agregados correctamente.</p>}<PageHeader eyebrow="Ficha de persona" title={person.display_name} description={`${person.first_name} ${person.last_name}`} action={<Button href="/people" variant="secondary">Volver</Button>} /><div className="mb-4 grid gap-3"><div className="flex flex-wrap gap-3"><Button href={`/people/${person.id}/edit`} variant="secondary">Editar</Button><PersonActions id={person.id} personName={person.display_name} archived={Boolean(person.archived_at)} isAdmin={profile.role === "admin"} deliveryCount={deliveryCount} showDelete={false} /></div>{deliveryActions.length > 0 && <div className="flex flex-wrap gap-3"><Button href={`/deliveries/civil?personId=${person.id}`}>Entrega civil</Button>{deliveryActions.includes("police") && <Button href={`/deliveries/police?personId=${person.id}`} variant="secondary">Entrega policial</Button>}</div>}{profile.role === "admin" && <div className="border-t border-[var(--border)] pt-3"><PersonActions id={person.id} personName={person.display_name} archived={Boolean(person.archived_at)} isAdmin={true} deliveryCount={deliveryCount} showArchive={false} /></div>}</div><div className="grid gap-4 md:grid-cols-2"><Card><p className="text-sm text-[var(--muted)]">Tipo</p><p className="mt-1 font-semibold">{person.type === "police" ? "Policía" : "Civil"}</p><p className="mt-4 text-sm text-[var(--muted)]">Estado</p><Badge tone={person.archived_at ? "neutral" : "success"}>{person.archived_at ? "Archivada" : "Activa"}</Badge>{person.badge_number && <><p className="mt-4 text-sm text-[var(--muted)]">Placa</p><p className="font-semibold">{person.badge_number}</p></>}</Card><Card><p className="font-semibold">Documentos privados</p><div className="mt-4 flex flex-wrap gap-3">{person.ine_path && <DocumentViewer personId={person.id} personName={person.display_name} kind="ine" label="Ver INE" />}{person.badge_path && <DocumentViewer personId={person.id} personName={person.display_name} kind="badge" label="Ver placa" />}</div><p className="mt-5 text-sm text-[var(--muted)]">Registrada el {formatDate(person.created_at)}</p></Card></div><Card className="mt-4"><div className="flex items-center justify-between"><p className="font-semibold">Historial de entregas</p><a className="text-sm text-blue-600" href={`/history?personId=${person.id}`}>Ver historial completo</a></div>{deliveries.length ? <div className="mt-4 grid gap-3">{deliveries.map((delivery) => <a className="rounded-xl border border-[var(--border)] bg-slate-900/30 p-3" href={`/history/${delivery.id}`} key={delivery.id}><p className="font-medium">{delivery.quantity_label}{delivery.is_daily_free_kit ? " · Kit diario gratuito" : ""}</p><p className="text-sm text-[var(--muted)]">{formatDateTime(delivery.occurred_at)} · {delivery.profile?.rp_name ?? "EMS no disponible"} · {delivery.status}</p></a>)}</div> : <p className="mt-3 text-sm text-[var(--muted)]">No hay entregas registradas.</p>}</Card></AppShell>;
}
