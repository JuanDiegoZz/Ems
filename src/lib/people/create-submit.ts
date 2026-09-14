export type PersonCreatePostResult =
  | { kind: "http"; response: Response; payload: unknown }
  | { kind: "network"; error: unknown };

export function buildPersonCreateFormData(form: FormData, type: "civil" | "police", ineFile: File | null, badgeFile: File | null, confirmDuplicates = false) {
  form.set("type", type);
  form.delete("ine");
  form.delete("badge");
  form.delete("confirmDuplicates");
  if (ineFile) form.set("ine", ineFile, ineFile.name);
  if (type === "police" && badgeFile) form.set("badge", badgeFile, badgeFile.name);
  if (confirmDuplicates) form.set("confirmDuplicates", "yes");
  return form;
}

export async function postPersonCreate(formData: FormData, fetcher: typeof fetch = fetch): Promise<PersonCreatePostResult> {
  try {
    const response = await fetcher("/api/people", { method: "POST", body: formData });
    const payload = await response.json().catch(() => null);
    return { kind: "http", response, payload };
  } catch (error) {
    return { kind: "network", error };
  }
}

export function personCreateHttpMessage(status: number, payload: unknown): string {
  const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : "";
  if (status === 401) return "Tu sesión expiró. Inicia sesión de nuevo.";
  if (status === 403) return "No tienes permisos para registrar personas.";
  if (message) return message;
  if (status === 409) return "Posible duplicado detectado";
  if (status >= 500) return "No se pudo registrar la persona.";
  return "No se pudo validar el registro.";
}
