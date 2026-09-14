"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import type { Profile } from "@/lib/auth/types";
import { Icon } from "@/components/ui";

type Mode = "create" | "reset" | "webhook" | null;
type Notice = { tone: "success" | "error"; text: string } | null;

type UserModalProps = {
  mode: Exclude<Mode, null>;
  selected: Profile | null;
  busy: boolean;
  onClose: () => void;
  onCreate: (event: FormEvent<HTMLFormElement>) => void;
  onReset: (event: FormEvent<HTMLFormElement>) => void;
};

async function assertOk(response: Response) {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(body?.error ?? "No se pudo completar la acción");
}

function UserRow({ user, busy, configured, onReset, onToggle, onWebhook }: { user: Profile; busy: boolean; configured: boolean; onReset: () => void; onToggle: () => void; onWebhook: () => void }) {
  return <article className="glass-card card-interactive p-5 md:grid md:grid-cols-[1fr_auto] md:items-center">
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold text-[var(--text)]">{user.rp_name}</h2>
        <span className={`badge ${user.active ? "badge-success" : "badge-neutral"}`}>{user.active ? "Activo" : "Inactivo"}</span>
      </div>
      <p className="mt-1 text-sm text-[var(--muted)]">@{user.username} · {user.role === "admin" ? "Administrador" : "EMS"}</p><p className="mt-2 text-sm">Discord: <strong>{configured ? "Configurado ✅" : "No configurado"}</strong></p>
    </div>
    <div className="mt-4 flex flex-wrap gap-2 md:mt-0">
      <button className="button button-secondary" type="button" disabled={busy} onClick={onReset}>{busy ? "Procesando…" : "Restablecer contraseña"}</button>
      <button className="button button-secondary" type="button" disabled={busy} onClick={onWebhook}>Configurar</button>
      <button className="button button-ghost" type="button" disabled={busy} onClick={onToggle}>{busy ? "Procesando…" : user.active ? "Desactivar" : "Activar"}</button>
    </div>
  </article>;
}

function UserModal({ mode, selected, busy, onClose, onCreate, onReset }: UserModalProps) {
  const title = mode === "create" ? "Nuevo usuario" : mode === "webhook" ? `Webhook de bitácora · ${selected?.rp_name ?? ""}` : `Restablecer contraseña · ${selected?.rp_name ?? ""}`;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="glass-card w-full max-w-lg p-6" role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title">
      <div className="flex items-center justify-between gap-4">
        <h2 id="admin-dialog-title" className="text-xl font-bold">{title}</h2>
        <button className="button button-ghost" type="button" onClick={onClose} disabled={busy}>Cerrar</button>
      </div>
      {mode === "create" ? <form className="mt-5 grid gap-4" onSubmit={onCreate}>
        <label className="field">Nombre RP<input className="field-input" name="rpName" required maxLength={100} /></label>
        <label className="field">Usuario<input className="field-input" name="username" required autoComplete="off" /></label>
        <label className="field">Contraseña<input className="field-input" name="password" type="password" required minLength={6} autoComplete="new-password" /></label>
        <label className="field">Rol<select className="field-input" name="role" defaultValue="ems"><option value="ems">EMS</option><option value="admin">Admin</option></select></label>
        <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Creando…" : "Crear usuario"}</button>
      </form> : mode === "webhook" ? <form className="mt-5 grid gap-4" onSubmit={onReset}>
        <label className="field">Webhook de bitácora<input className="field-input" name="webhookUrl" type="url" autoComplete="off" placeholder="https://discord.com/api/webhooks/..." /></label>
        <p className="text-sm text-[var(--muted)]">La URL se cifra en servidor y no se volverá a mostrar.</p>
        <div className="flex flex-wrap gap-3"><button className="button button-secondary" name="action" value="test" type="submit" disabled={busy}>Probar webhook</button><button className="button button-primary" name="action" value="save" type="submit" disabled={busy}>Guardar</button><button className="button button-danger" name="action" value="delete" type="submit" disabled={busy}>Eliminar configuración</button></div>
      </form> : <form className="mt-5 grid gap-4" onSubmit={onReset}>
        <label className="field">Nueva contraseña<input className="field-input" name="password" type="password" required minLength={6} autoComplete="new-password" /></label>
        <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Actualizando…" : "Actualizar contraseña"}</button>
      </form>}
    </div>
  </div>;
}

export function UsersPanel({ initialUsers, initialWebhookIds }: { initialUsers: Profile[]; initialWebhookIds: string[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [mode, setMode] = useState<Mode>(null);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [webhookIds, setWebhookIds] = useState(() => new Set(initialWebhookIds));

  function closeModal() {
    if (!busy) {
      setMode(null);
      setSelected(null);
    }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rpName: form.get("rpName"),
          username: form.get("username"),
          password: form.get("password"),
          role: form.get("role"),
        }),
      });
      const body = await response.json().catch(() => null) as { user?: Profile; error?: string } | null;
      if (!response.ok || !body?.user) throw new Error(body?.error ?? "No se pudo crear el usuario");
      setUsers((current) => [...current, body.user as Profile]);
      setNotice({ tone: "success", text: "Usuario creado correctamente" });
      setMode(null);
      setSelected(null);
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "No se pudo crear el usuario" });
    } finally {
      setBusy(false);
    }
  }

  async function toggle(user: Profile) {
    if (user.active && !window.confirm(`¿Desactivar a ${user.rp_name}?`)) return;
    setBusy(true);
    setNotice(null);
    try {
      await assertOk(await fetch("/api/admin/users/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: user.id, active: !user.active }),
      }));
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, active: !item.active } : item));
      setNotice({ tone: "success", text: user.active ? "Usuario desactivado" : "Usuario activado" });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "No se pudo actualizar el usuario" });
    } finally {
      setBusy(false);
    }
  }

  async function reset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setNotice(null);
    const form = new FormData(event.currentTarget);
    if (mode === "webhook") { const action = ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value; try { const url = `/api/admin/users/${selected.id}/webhook${action === "test" ? "/test" : ""}`; const response = await fetch(url, action === "delete" ? { method: "DELETE" } : { method: action === "test" ? "POST" : "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ webhookUrl: form.get("webhookUrl") }) }); await assertOk(response); if (action === "test") setNotice({ tone: "success", text: "Webhook probado correctamente. Guárdalo para aplicarlo." }); else { setWebhookIds((current) => { const next = new Set(current); if (action === "delete") next.delete(selected.id); else next.add(selected.id); return next; }); setNotice({ tone: "success", text: action === "delete" ? "Configuración eliminada" : "Webhook guardado correctamente" }); closeModal(); } } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "No se pudo configurar el webhook" }); } finally { setBusy(false); } return; }
    try {
      await assertOk(await fetch("/api/admin/users/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: selected.id, password: form.get("password") }),
      }));
      setNotice({ tone: "success", text: "Contraseña actualizada" });
      closeModal();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "No se pudo actualizar la contraseña" });
    } finally {
      setBusy(false);
    }
  }

  return <section className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-[var(--muted)]">{users.length} usuario{users.length === 1 ? "" : "s"}</p>
      <button className="button button-primary" type="button" onClick={() => { setNotice(null); setMode("create"); }}><Icon name="plus" size={17} />Nuevo usuario</button>
    </div>
    {notice && <p className={notice.tone === "success" ? "toast toast-success" : "toast toast-error"} role="status">{notice.text}</p>}
    {users.length === 0 ? <div className="p-8 text-center text-sm text-[var(--muted)]">No hay usuarios administrados.</div> : <div className="grid gap-3">{users.map((user) => <UserRow key={user.id} user={user} busy={busy} configured={webhookIds.has(user.id)} onReset={() => { setSelected(user); setMode("reset"); }} onWebhook={() => { setSelected(user); setMode("webhook"); }} onToggle={() => toggle(user)} />)}</div>}
    {mode && <UserModal mode={mode} selected={selected} busy={busy} onClose={closeModal} onCreate={create} onReset={reset} />}
  </section>;
}
