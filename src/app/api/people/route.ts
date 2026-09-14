import { NextResponse } from "next/server";
import { createPerson, findPersonDuplicates, listPeople } from "@/server/people";
import { classifyDuplicate } from "@/lib/people/duplicates";
import { uploadPersonDocument, removePersonDocument } from "@/lib/supabase/documents";
import { documentExtension } from "@/lib/people/documents";
import { parsePeopleQuery } from "@/lib/people/pagination";

type CreateStage = "request received" | "form parsed" | "input validated" | "duplicate check" | "duplicate check complete" | "document validation" | "document validation complete" | "INE upload started" | "INE upload success" | "badge upload started" | "badge upload success" | "DB operation started" | "DB success" | "response 201";

function logStage(stage: CreateStage) {
  if (process.env.NODE_ENV === "development") console.log(`[people:create] ${stage}`);
}

function logFailure(stage: CreateStage, error: unknown) {
  if (process.env.NODE_ENV !== "development") return;
  console.error("[people:create] failed", {
    stage,
    errorName: error instanceof Error ? error.name : "Error",
    errorMessage: error instanceof Error ? error.message : String(error),
  });
}

function errorResponse(error: unknown, stage: CreateStage) {
  logFailure(stage, error);
  const message = error instanceof Error ? error.message : "";
  if (message === "Unauthorized") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (message === "Forbidden") return NextResponse.json({ error: "No tienes permisos para registrar personas." }, { status: 403 });
  return NextResponse.json({ error: "No se pudo registrar la persona." }, { status: 500 });
}

function validationResponse(stage: CreateStage, message: string) {
  logFailure(stage, new Error(message));
  return NextResponse.json({ error: message }, { status: 400 });
}

async function cleanupDocuments(paths: string[]) {
  for (const path of paths) {
    try {
      await removePersonDocument(path);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[people:create] cleanup failed", { errorName: error instanceof Error ? error.name : "Error", errorMessage: error instanceof Error ? error.message : String(error) });
    }
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = parsePeopleQuery(url.searchParams);
    const paginated = url.searchParams.has("page") || url.searchParams.has("pageSize");
    const deliveryType = url.searchParams.get("deliveryType");
    const result = await listPeople({ ...query, deliveryType: deliveryType === "civil" || deliveryType === "police" ? deliveryType : undefined, pageSize: paginated ? query.pageSize : 50 });
    return NextResponse.json(paginated ? result : result.items);
  }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 403 }); }
}

export async function POST(request: Request) {
  let stage: CreateStage = "request received";
  const uploadedPaths: string[] = [];
  logStage(stage);
  try {
    const form = await request.formData();
    stage = "form parsed";
    logStage(stage);
    const type = form.get("type") === "police" ? "police" : "civil";
    const firstName = String(form.get("firstName") ?? "").trim();
    const lastName = String(form.get("lastName") ?? "").trim();
    const displayName = String(form.get("displayName") ?? "").trim();
    const badgeNumber = String(form.get("badgeNumber") ?? "").trim();
    const ine = form.get("ine");
    const badge = form.get("badge");
    const hasIne = ine instanceof File && ine.size > 0;
    const hasBadgeImage = badge instanceof File && badge.size > 0;
    if (!firstName || !lastName || !displayName) return validationResponse(stage, "Nombre, apellido y nombre visible son obligatorios");
    if (type === "civil" && !hasIne) return validationResponse(stage, "La INE es obligatoria para civiles");
    if (type === "police" && !hasIne && !hasBadgeImage && !badgeNumber) return validationResponse(stage, "Registra al menos una INE, número de placa o imagen de placa");
    stage = "input validated";
    logStage(stage);

    const id = crypto.randomUUID();
    stage = "duplicate check";
    const duplicate = await findPersonDuplicates({ type, firstName, lastName, displayName, badgeNumber });
    stage = "duplicate check complete";
    logStage(stage);
    const duplicateDecision = classifyDuplicate({ type, matches: duplicate.matches, archivedMatches: duplicate.archivedMatches, possibleMatches: duplicate.possibleMatches, badgeMatches: duplicate.badgeMatches });
    if (duplicateDecision.kind !== "none" && (duplicateDecision.kind !== "possible" || form.get("confirmDuplicates") !== "yes")) return NextResponse.json({ error: "Esta persona ya está registrada.", duplicates: duplicate }, { status: 409 });

    stage = "document validation";
    if (hasIne) documentExtension(ine as File);
    if (hasBadgeImage) documentExtension(badge as File);
    stage = "document validation complete";
    logStage(stage);
    let inePath: string | undefined;
    let badgePath: string | undefined;
    if (hasIne) {
      stage = "INE upload started";
      logStage(stage);
      inePath = await uploadPersonDocument(id, "ine", ine as File);
      uploadedPaths.push(inePath);
      stage = "INE upload success";
      logStage(stage);
    }
    if (type === "police" && hasBadgeImage) {
      stage = "badge upload started";
      logStage(stage);
      badgePath = await uploadPersonDocument(id, "badge", badge as File);
      uploadedPaths.push(badgePath);
      stage = "badge upload success";
      logStage(stage);
    }
    stage = "DB operation started";
    logStage(stage);
    const person = await createPerson({ type, firstName, lastName, displayName, badgeNumber, inePath, badgePath }, id);
    stage = "DB success";
    logStage(stage);
    stage = "response 201";
    logStage(stage);
    return NextResponse.json({ person }, { status: 201 });
  } catch (error) {
    await cleanupDocuments(uploadedPaths);
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) return errorResponse(error, stage);
    if (stage === "request received" || stage === "form parsed" || stage === "document validation") {
      logFailure(stage, error);
      return NextResponse.json({ error: error instanceof Error ? error.message : "Solicitud inválida" }, { status: 400 });
    }
    return errorResponse(error, stage);
  }
}
