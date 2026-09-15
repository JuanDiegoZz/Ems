"use client";

import type { listStaff } from "@/server/staff-control";
import { StaffCard } from "./staff-card";
type Staff = Awaited<ReturnType<typeof listStaff>>["items"][number];
export function AttentionQueue({ items, onSanction }: { items: Staff[]; onSanction: (staff: Staff) => void }) { if (!items.length) return null; return <section className="attention-queue" aria-labelledby="attention-title"><div><p className="eyebrow">Prioridad operativa</p><h2 id="attention-title">Requieren atención</h2><p>Personal que necesita revisión administrativa.</p></div><div className="attention-grid">{items.slice(0, 4).map((staff) => <StaffCard compact key={staff.profile.id} staff={staff} onSanction={onSanction} />)}</div></section>; }
