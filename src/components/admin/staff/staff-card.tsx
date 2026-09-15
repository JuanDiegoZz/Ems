"use client";

import Link from "next/link";
import { fineLabel, permissionLabel } from "@/lib/staff-control/presentation";
import type { listStaff } from "@/server/staff-control";
import { StaffWebhookControl } from "./staff-webhook-control";

type Staff = Awaited<ReturnType<typeof listStaff>>["items"][number];
const duration = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;

export function StaffCard({ staff, onSanction, onWebhookSaved, compact = false }: { staff: Staff; onSanction: (staff: Staff) => void; onWebhookSaved?: () => void; compact?: boolean }) {
  const critical = staff.status.key === "critical";
  const nearStrike = staff.discipline.activeWarns === staff.discipline.warnsPerStrike - 1;
  return <article className={`staff-card staff-${staff.status.key}`}>
    <div className="staff-card-head"><div className="min-w-0"><h3>{staff.profile.rpName}</h3><p className="staff-role">{staff.profile.role === "admin" ? "Mando EMS" : "EMS"}</p></div><span className={`staff-status status-${staff.status.key}`}>{staff.status.label}</span></div>
    {critical && <p className="staff-critical">CRÍTICO · Strikes {staff.discipline.activeStrikes}/{staff.discipline.criticalStrikes} · Límite alcanzado</p>}
    <div className="staff-primary"><strong>{duration(staff.week.weeklyMinutes)} esta semana</strong><span className={staff.week.goalMet ? "positive" : "negative"}>{staff.week.goalMet ? "✓ Meta 5h cumplida" : "❌ Meta 5h no cumplida"}</span></div>
    {staff.absence.currentlyJustified && staff.absence.permissionUntil && <p className="staff-permission">◷ {permissionLabel(staff.absence.permissionUntil)}</p>}
    <div className="staff-signals"><span>{staff.activity.inactivityLabel}</span><span>Warns {staff.discipline.activeWarns}/{staff.discipline.warnsPerStrike}{nearStrike && " · Próximo warn → Strike"}</span><span>Strikes {staff.discipline.activeStrikes}/{staff.discipline.criticalStrikes}</span>{staff.discipline.activeFineTotal > 0 && <span>Multas esta semana · {fineLabel(staff.discipline.activeFineTotal)}</span>}</div>
    {compact && <div className="staff-webhook-status staff-webhook-compact"><span>Bitácora Discord</span><strong className={staff.webhookConfigured ? "positive" : "negative"}>{staff.webhookConfigured ? "✓ Configurada" : "⚠ Sin configurar"}</strong></div>}
    {!compact && <><div className="staff-webhook-row"><StaffWebhookControl profileId={staff.profile.id} configured={staff.webhookConfigured} onSaved={onWebhookSaved} /></div><div className="staff-card-actions"><button className="button button-secondary" type="button" onClick={() => onSanction(staff)}>Sancionar</button><Link className="button button-ghost" href={`/admin/staff/${staff.profile.id}`}>Ver expediente</Link></div></>}
    {critical && <p className="staff-review">Revisión administrativa requerida</p>}
  </article>;
}
