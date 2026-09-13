import { NextResponse } from "next/server";
import { createPerson, findPersonDuplicates, listPeople } from "@/server/people";
import { uploadPersonDocument } from "@/lib/supabase/documents";

export async function GET(request: Request) {
  try { const url = new URL(request.url); return NextResponse.json(await listPeople({ q: url.searchParams.get("q") ?? "", type: url.searchParams.get("type") ?? "", includeArchived: url.searchParams.get("archived") === "1" })); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 403 }); }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const type = form.get("type") === "police" ? "police" : "civil";
    const id = crypto.randomUUID();
    const ine = form.get("ine"); const badge = form.get("badge");
    const hasIne = ine instanceof File && ine.size > 0;
    const hasBadgeImage = badge instanceof File && badge.size > 0;
    const hasBadgeNumber = Boolean(String(form.get("badgeNumber") ?? "").trim());
    if (type === "civil" && !hasIne) return NextResponse.json({ error: "La INE es obligatoria para civiles" }, { status: 400 });
    if (type === "police" && !hasIne && !hasBadgeImage && !hasBadgeNumber) return NextResponse.json({ error: "Registra al menos una INE, número de placa o imagen de placa" }, { status: 400 });
    const duplicate = await findPersonDuplicates({ type, firstName: String(form.get("firstName") ?? ""), lastName: String(form.get("lastName") ?? ""), displayName: String(form.get("displayName") ?? ""), badgeNumber: String(form.get("badgeNumber") ?? ""), inePath: "placeholder", badgePath: type === "police" ? "placeholder" : undefined });
    if ((duplicate.matches.length || duplicate.badgeMatch) && form.get("confirmDuplicates") !== "yes") return NextResponse.json({ error: "Posible duplicado detectado", duplicates: duplicate }, { status: 409 });
    const inePath = hasIne ? await uploadPersonDocument(id, "ine", ine as File) : undefined;
    const badgePath = type === "police" && hasBadgeImage ? await uploadPersonDocument(id, "badge", badge as File) : undefined;
    const person = await createPerson({ type, firstName: String(form.get("firstName") ?? ""), lastName: String(form.get("lastName") ?? ""), displayName: String(form.get("displayName") ?? ""), badgeNumber: String(form.get("badgeNumber") ?? ""), inePath, badgePath }, id);
    return NextResponse.json(person, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo crear" }, { status: 400 }); }
}





