import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { Button, PageHeader } from "@/components/ui";
import { getActiveProfile } from "@/lib/auth/session";
import { parsePeopleQuery, PEOPLE_PAGE_SIZE } from "@/lib/people/pagination";
import { listPeople } from "@/server/people";
import { PeopleBrowser } from "@/components/people/people-browser";

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ search?: string; q?: string; type?: string; page?: string }> }) {
  const profile = await getActiveProfile();
  if (!profile) redirect("/login");
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  else if (params.q) query.set("q", params.q);
  if (params.type) query.set("type", params.type);
  if (params.page) query.set("page", params.page);
  const parsed = parsePeopleQuery(query);
  const people = await listPeople({ ...parsed, pageSize: PEOPLE_PAGE_SIZE });
  return <AppShell profile={profile}><PageHeader eyebrow="Personas" title="Personas" description="Busca civiles y policías por nombre o placa." action={<Button href="/people/new" icon="plus">Registrar persona</Button>} /><PeopleBrowser initial={people} initialSearch={parsed.search} initialType={parsed.type} /></AppShell>;
}
