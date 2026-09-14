import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell/app-shell";
import { Card, PageHeader } from "@/components/ui";
import { EmsPerformanceFilters } from "@/components/admin/ems-performance-filters";
import { getActiveProfile } from "@/lib/auth/session";
import { formatDuration } from "@/lib/shifts/time";
import { listEmsPerformance } from "@/server/ems-performance";

export default async function EmsPerformancePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const profile = await getActiveProfile(); if (!profile || profile.role !== "admin") redirect("/");
  const params = await searchParams; const data = await listEmsPerformance(params); const query = new URLSearchParams(params as Record<string, string>).toString();
  const role = (value: "ems" | "admin") => value === "admin" ? "Admin" : "EMS";
  return <AppShell profile={profile}><PageHeader eyebrow="Administración" title="Rendimiento EMS" description={`Rango analizado: ${data.range.label}`} /><EmsPerformanceFilters initialRange={params.range} initialFrom={params.from} initialTo={params.to} /><div className="responsive-data-cards md:hidden">{data.items.map((item) => <Link className="glass-card responsive-data-card card-interactive block" href={`/admin/ems-performance/${item.profile.id}?${query}`} key={item.profile.id}><div className="flex items-center gap-2"><p className="font-semibold">{item.profile.rp_name}</p><span className="badge badge-info">{role(item.profile.role)}</span></div><dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm"><div><dt className="text-[var(--muted)]">Horas</dt><dd className="mt-1 font-bold">{formatDuration(item.hoursMilliseconds)}</dd></div><div><dt className="text-[var(--muted)]">Entregas</dt><dd className="mt-1 font-bold">{item.deliveries}</dd></div><div><dt className="text-[var(--muted)]">Civil</dt><dd className="mt-1 font-bold">{item.civil}</dd></div><div><dt className="text-[var(--muted)]">Policía</dt><dd className="mt-1 font-bold">{item.police}</dd></div></dl><p className="mt-4 text-sm font-semibold text-blue-300">Ver rendimiento →</p></Link>)}</div><Card className="hidden overflow-x-auto p-0 md:block"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b border-[var(--border)] text-[var(--muted)]"><th className="p-4">EMS</th><th>Horas trabajadas</th><th>Entregas totales</th><th>Civil</th><th>Policía</th></tr></thead><tbody>{data.items.map((item) => <tr className="border-b border-[var(--border)] last:border-0" key={item.profile.id}><td className="p-4 font-semibold"><Link href={`/admin/ems-performance/${item.profile.id}?${query}`}>{item.profile.rp_name}</Link><span className="badge badge-info ml-2">{role(item.profile.role)}</span></td><td>{formatDuration(item.hoursMilliseconds)}</td><td>{item.deliveries}</td><td>{item.civil}</td><td>{item.police}</td></tr>)}</tbody></table></Card></AppShell>;
}
