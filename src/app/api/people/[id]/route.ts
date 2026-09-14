import { NextResponse } from "next/server";
import { deletePerson, getPerson, PersonDeleteRequiresForceError, updatePerson } from "@/server/people";
import { getDeliveryPreselection } from "@/server/deliveries";
import { removePersonDocument, uploadPersonDocument } from "@/lib/supabase/documents";
import { perfTimer } from "@/lib/perf";

function isFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const id = (await context.params).id;
    const deliveryType = new URL(request.url).searchParams.get("deliveryType");
    if (deliveryType === "civil" || deliveryType === "police") return NextResponse.json(await getDeliveryPreselection(id, deliveryType));
    return NextResponse.json(await getPerson(id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No encontrada" }, { status: 404 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const done = perfTimer("PATCH /api/people/[id]");
  try {
    const id = (await context.params).id;
    const current = await getPerson(id);
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await request.formData();
      const ine = form.get("ine");
      const badge = form.get("badge");
      let inePath: string | undefined = current.ine_path ?? undefined;
      let badgePath: string | null | undefined = current.badge_path ?? undefined;
      let uploadedIne: string | undefined;
      let uploadedBadge: string | undefined;
      let saved = false;
      try {
        if (isFile(ine)) { uploadedIne = await uploadPersonDocument(id, "ine", ine); inePath = uploadedIne; }
        if (isFile(badge)) { uploadedBadge = await uploadPersonDocument(id, "badge", badge); badgePath = uploadedBadge; }
        if (form.get("removeBadge") === "yes" && !uploadedBadge) badgePath = null;
        const updated = await updatePerson(id, {
          type: current.type,
          firstName: String(form.get("firstName") ?? current.first_name),
          lastName: String(form.get("lastName") ?? current.last_name),
          displayName: String(form.get("displayName") ?? current.display_name),
          badgeNumber: String(form.get("badgeNumber") ?? current.badge_number ?? ""),
          inePath,
          badgePath: badgePath ?? undefined,
        });
        saved = true;
        if (uploadedIne && current.ine_path && current.ine_path !== uploadedIne) await removePersonDocument(current.ine_path).catch(() => undefined);
        if (current.badge_path && current.badge_path !== badgePath) await removePersonDocument(current.badge_path).catch(() => undefined);
        return NextResponse.json(updated);
      } catch (error) {
        if (!saved) {
          if (uploadedIne) await removePersonDocument(uploadedIne).catch(() => undefined);
          if (uploadedBadge) await removePersonDocument(uploadedBadge).catch(() => undefined);
        }
        throw error;
      }
    }
    return NextResponse.json(await updatePerson(id, await request.json()));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo actualizar" }, { status: 400 });
  } finally { done(); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json().catch(() => ({})) as { forceDeleteRelated?: boolean };
    await deletePerson((await context.params).id, body.forceDeleteRelated === true);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PersonDeleteRequiresForceError) return NextResponse.json({ error: error.message, deliveryCount: error.deliveryCount, requiresForce: true }, { status: 409 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo eliminar la persona" }, { status: 403 });
  }
}
