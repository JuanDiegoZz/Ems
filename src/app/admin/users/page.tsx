import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { Card, PageHeader } from "@/components/ui";
import { UsersPanel } from "@/components/admin/users-panel";
import { getActiveProfile } from "@/lib/auth/session";
import { listManagedUsers } from "@/server/users";

export default async function UsersPage() {
  const profile = await getActiveProfile();
  if (!profile || profile.role !== "admin") redirect("/");
  const users = await listManagedUsers();
  return <AppShell profile={profile}><PageHeader eyebrow="Administración" title="Personal EMS" description="Gestiona accesos y mantén el equipo listo para operar." /><Card><UsersPanel initialUsers={users} /></Card></AppShell>;
}




