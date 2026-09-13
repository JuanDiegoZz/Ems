import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { PageHeader } from "@/components/ui";
import { getActiveProfile } from "@/lib/auth/session";
import { PersonCreateForm } from "@/components/people/person-create-form";
import { DniRegressionLab } from "@/components/people/dni-regression-lab";
export default async function NewPersonPage() { const profile = await getActiveProfile(); if (!profile) redirect("/login"); const debug = process.env.NEXT_PUBLIC_OCR_DEBUG === "true"; return <AppShell profile={profile}><PageHeader eyebrow="Personas" title="Registrar persona" description="Guarda los datos y documentos requeridos." /><PersonCreateForm />{debug && <DniRegressionLab />}</AppShell>; }




