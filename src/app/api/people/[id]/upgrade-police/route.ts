import { NextResponse } from "next/server";
import { documentExtension } from "@/lib/people/documents";
import { runPoliceUpgradeMutation } from "@/lib/people/police-upgrade";
import { removePersonDocument, uploadPersonDocument } from "@/lib/supabase/documents";
import { assertPoliceBadgeAvailable, getPersonForPoliceUpgrade, PoliceUpgradeError, promoteCivilToPolice } from "@/server/people";

type UpgradeStage = "request" | "document validation" | "INE upload" | "badge upload" | "database";

function isFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

function errorResponse(error: unknown, stage: UpgradeStage, badgeNumber: string) {
  if (process.env.NODE_ENV === "development") console.error("[people:upgrade-police] failed", { stage, errorName: error instanceof Error ? error.name : "Error", errorMessage: error instanceof Error ? error.message : String(error) });
  if (error instanceof PoliceUpgradeError) {
    const message = error.code === "not-found" ? "Persona no encontrada." : error.code === "archived" ? "La persona está archivada y no se puede actualizar automáticamente." : error.code === "already-police" ? "La persona ya fue actualizada. Recarga el registro." : error.code === "badge-conflict" ? `La placa ${badgeNumber || "indicada"} ya está asociada a otra persona.` : "La persona fue modificada mientras realizabas esta operación.";
    return NextResponse.json({ error: message }, { status: error.code === "not-found" ? 404 : 409 });
  }
  const message = error instanceof Error ? error.message : "";
  if (message === "Unauthorized") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (message === "Forbidden") return NextResponse.json({ error: "No tienes permisos para actualizar personas." }, { status: 403 });
  if (message === "Agrega un número o una imagen de placa" || message === "Usa una imagen JPG, PNG o WEBP." || message === "La imagen supera el tamaño máximo permitido de 1.5 MB.") return NextResponse.json({ error: message }, { status: 400 });
  if (stage === "badge upload") return NextResponse.json({ error: "No se pudo guardar la imagen de la placa." }, { status: 500 });
  if (stage === "INE upload") return NextResponse.json({ error: "No se pudo guardar la INE." }, { status: 500 });
  return NextResponse.json({ error: "No se pudieron agregar los datos policiales." }, { status: 500 });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const uploadedPaths: string[] = [];
  let stage: UpgradeStage = "request";
  let badgeNumber = "";
  try {
    const id = (await context.params).id;
    const form = await request.formData();
    badgeNumber = String(form.get("badgeNumber") ?? "").trim();
    const ine = form.get("ine");
    const badge = form.get("badge");
    stage = "document validation";
    if (isFile(ine)) documentExtension(ine);
    if (isFile(badge)) documentExtension(badge);
    const current = await getPersonForPoliceUpgrade(id);
    if (!badgeNumber && !isFile(badge) && !current.badge_path) throw new Error("Agrega un número o una imagen de placa");
    await assertPoliceBadgeAvailable(badgeNumber, id);
    let inePath = current.ine_path;
    let badgePath = current.badge_path;
    const person = await runPoliceUpgradeMutation({
      upload: async () => {
        if (!inePath && isFile(ine)) {
          stage = "INE upload";
          inePath = await uploadPersonDocument(id, "ine", ine);
          uploadedPaths.push(inePath);
        }
        if (isFile(badge)) {
          stage = "badge upload";
          badgePath = await uploadPersonDocument(id, "badge", badge);
          uploadedPaths.push(badgePath);
        }
        return uploadedPaths;
      },
      save: async () => { stage = "database"; return promoteCivilToPolice(id, { badgeNumber, inePath, badgePath }); },
      cleanup: async (paths) => { await Promise.all(paths.map((path) => removePersonDocument(path).catch(() => undefined))); uploadedPaths.length = 0; },
    });
    if (current.badge_path && current.badge_path !== person.badge_path) await removePersonDocument(current.badge_path).catch(() => undefined);
    return NextResponse.json({ person, message: "Datos policiales agregados correctamente." }, { status: 200 });
  } catch (error) {
    if (uploadedPaths.length) await Promise.all(uploadedPaths.map((path) => removePersonDocument(path).catch(() => undefined)));
    return errorResponse(error, stage, badgeNumber);
  }
}
