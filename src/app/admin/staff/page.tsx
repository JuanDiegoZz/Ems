import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { PageHeader } from "@/components/ui";
import { StaffCenter } from "@/components/admin/staff/staff-center";
import { getActiveProfile } from "@/lib/auth/session";
import { listStaff } from "@/server/staff-control";
import type { StaffFilter } from "@/lib/staff-control/presentation";

export default async function StaffPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) { const profile = await getActiveProfile(); if (!profile || profile.role !== "admin") redirect("/"); const params = await searchParams; const data = await listStaff(params); return <AppShell profile={profile}><PageHeader eyebrow="Administración" title="Personal EMS" description="Detecta lo crítico y actúa antes de que afecte al equipo." /><StaffCenter data={data} filter={(params.filter as StaffFilter | undefined) ?? "all"} query={params.q ?? ""} /></AppShell>; }
