import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { PageHeader } from "@/components/ui";
import { getActiveProfile } from "@/lib/auth/session";
import { PersonCreateForm } from "@/components/people/person-create-form";
import { DniRegressionLab } from "@/components/people/dni-regression-lab";
import { parseDeliveryReturnTo } from "@/lib/deliveries/navigation";
export default async function NewPersonPage({ searchParams }: { searchParams: Promise<{ type?: string; returnTo?: string; searchHint?: string }> }) { const profile = await getActiveProfile(); if (!profile) redirect("/login"); const params = await searchParams; const debug = process.env.NEXT_PUBLIC_OCR_DEBUG === "true"; const initialType = params.type === "police" ? "police" : "civil"; const returnTo = parseDeliveryReturnTo(params.returnTo); const searchHint = typeof params.searchHint === "string" ? params.searchHint.slice(0, 80) : ""; return <AppShell profile={profile}><PageHeader eyebrow="Personas" title="Registrar persona" description="Guarda los datos y documentos requeridos." /><PersonCreateForm initialType={initialType} returnTo={returnTo} searchHint={searchHint} />{debug && <DniRegressionLab />}</AppShell>; }




