import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { getActiveProfile } from "@/lib/auth/session";
import { countPersonDeliveries, getPerson } from "@/server/people";
import { PersonEditForm } from "@/components/people/person-edit-form";
import { PersonActions } from "@/components/people/person-actions";
export default async function EditPersonPage({ params }: { params: Promise<{ id: string }> }) { const profile = await getActiveProfile(); if (!profile) redirect("/login"); let person; try { person = await getPerson((await params).id); } catch { notFound(); } const deliveryCount = await countPersonDeliveries(person.id); return <AppShell profile={profile}><PersonEditForm person={person} /><div className="mt-5"><PersonActions id={person.id} personName={person.display_name} archived={Boolean(person.archived_at)} isAdmin={profile.role === "admin"} deliveryCount={deliveryCount} /></div></AppShell>; }




