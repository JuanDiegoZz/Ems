import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { PageHeader } from "@/components/ui";
import { getActiveProfile } from "@/lib/auth/session";
import { listPeople } from "@/server/people";
import { PeopleBrowser } from "@/components/people/people-browser";
export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) { const profile = await getActiveProfile(); if (!profile) redirect("/login"); const params = await searchParams; const people = await listPeople({ q: params.q, type: params.type }); return <AppShell profile={profile}><PageHeader eyebrow="Personas" title="Personas" description="Busca civiles y policías por nombre o placa." /><PeopleBrowser initial={people} /></AppShell>; }




