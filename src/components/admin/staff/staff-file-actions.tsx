"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AbsenceDialog } from "./absence-dialog";

export function StaffFileActions({ profileId }: { profileId: string }) { const [open, setOpen] = useState(false); const router = useRouter(); return <><button className="button button-secondary" type="button" onClick={() => setOpen(true)}>Registrar permiso</button><AbsenceDialog open={open} profileId={profileId} onClose={() => setOpen(false)} onSaved={() => router.refresh()} /></>; }
