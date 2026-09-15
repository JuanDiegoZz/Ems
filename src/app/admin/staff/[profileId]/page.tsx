import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { PageHeader } from "@/components/ui";
import { StaffFileTabs } from "@/components/admin/staff/staff-file-tabs";
import { StaffFileActions } from "@/components/admin/staff/staff-file-actions";
import { getActiveProfile } from "@/lib/auth/session";
import { getStaffFile } from "@/server/staff-control";
export default async function StaffFilePage({ params, searchParams }: { params: Promise<{ profileId: string }>; searchParams: Promise<Record<string, string | undefined>> }) { const profile = await getActiveProfile(); if (!profile || profile.role !== "admin") redirect("/"); const { profileId } = await params; const data = await getStaffFile(profileId, await searchParams); return <AppShell profile={profile}><div className="flex flex-wrap items-start justify-between gap-4"><PageHeader eyebrow="Expediente EMS" title={data.staff.profile.rpName} description={`${data.staff.status.label} · ${data.staff.activity.inactivityLabel}`} /><StaffFileActions profileId={profileId} /></div><StaffFileTabs data={data} profileId={profileId} /></AppShell>; }
