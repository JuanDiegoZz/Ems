import { createSupabaseAdminClient } from "./admin.ts";
import { documentExtension } from "../people/documents.ts";

export async function uploadPersonDocument(personId: string, kind: "ine" | "badge", file: File) {
  const extension = documentExtension(file);
  const path = `people/${personId}/${kind}-${crypto.randomUUID()}.${extension}`;
  const { error } = await createSupabaseAdminClient().storage.from("rp-documents").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error("No se pudo guardar el documento");
  return path;
}

export async function signedPersonDocument(path: string) {
  const { data, error } = await createSupabaseAdminClient().storage.from("rp-documents").createSignedUrl(path, 300);
  if (error || !data?.signedUrl) throw new Error("No se pudo abrir el documento");
  return data.signedUrl;
}

export async function removePersonDocument(path: string) {
  const { error } = await createSupabaseAdminClient().storage.from("rp-documents").remove([path]);
  if (error) throw new Error("No se pudo eliminar el documento anterior");
}




