import type { InputHTMLAttributes, ReactNode } from "react";

export type IconName = "home" | "users" | "history" | "user" | "shield" | "heart" | "badge" | "logout" | "upload" | "search" | "file" | "plus" | "edit" | "refresh" | "check" | "alert" | "settings" | "chevron";

const paths: Record<IconName, string> = {
  home: "M3 11.5 12 4l9 7.5M5.5 10v9h13v-9M9 19v-5h6v5",
  users: "M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM17 11a3 3 0 1 0 0-6M16 14.5h1a4 4 0 0 1 4 4V20",
  history: "M3 12a9 9 0 1 0 3-6.7M3 4v6h6M12 7v5l3 2",
  user: "M19 20a7 7 0 0 0-14 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  shield: "M12 3 20 6v6c0 5-3.3 8-8 9-4.7-1-8-4-8-9V6l8-3ZM9 12l2 2 4-4",
  heart: "M20.8 8.8c0 5.2-8.8 10-8.8 10s-8.8-4.8-8.8-10A4.8 4.8 0 0 1 12 6a4.8 4.8 0 0 1 8.8 2.8Z",
  badge: "M7 3h10v18H7zM9 7h6M9 11h6M9 15h4",
  logout: "M10 17l5-5-5-5M15 12H3M21 4v16",
  upload: "M12 16V4M7 9l5-5 5 5M4 20h16",
  search: "m21 21-4.4-4.4M10.8 18a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4Z",
  file: "M6 3h8l4 4v14H6zM14 3v5h5M9 13h6M9 17h6",
  plus: "M12 5v14M5 12h14",
  edit: "m4 16 10-10 4 4L8 20l-4 1zM13 7l4 4",
  refresh: "M20 11a8 8 0 0 0-14.8-3L3 11M3 5v6h6M4 13a8 8 0 0 0 14.8 3L21 13M21 19v-6h-6",
  check: "m5 12 4 4L19 6",
  alert: "M12 4 3 20h18L12 4ZM12 10v4M12 17h.01",
  settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 1.7-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20h-2.4v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L8 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H6v-2.4h.9a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L8 8.6l1.7-1.7.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V5h2.4v.8a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.7 1.7-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1V14h-.1a1.7 1.7 0 0 0-1.4 1Z",
  chevron: "m7 10 5 5 5-5"
};

export function Icon({ name, size = 18, strokeWidth = 1.8 }: { name: IconName; size?: number; strokeWidth?: number }) { return <svg aria-hidden="true" fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg"><path d={paths[name]} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} /></svg>; }
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) { return <div className={`glass-card ${className}`}>{children}</div>; }
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "info" | "success" }) { return <span className={`badge badge-${tone}`}>{children}</span>; }
export function Button({ children, href, variant = "primary", icon }: { children: ReactNode; href?: string; variant?: "primary" | "secondary" | "ghost" | "danger"; icon?: IconName }) { const className = `button button-${variant}`; const content = <>{icon && <Icon name={icon} size={17} />}{children}</>; return href ? <a className={className} href={href}>{content}</a> : <button className={className} type="button">{content}</button>; }
export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) { return <header className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-start"><div><p className="eyebrow">{eyebrow}</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">{title}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">{description}</p></div>{action}</header>; }
export function EmptyState({ title, description, icon = "file", action }: { title: string; description: string; icon?: IconName; action?: ReactNode }) { return <Card className="grid justify-items-center gap-3 py-12 text-center"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-500/15 text-blue-300"><Icon name={icon} size={24} /></span><p className="text-lg font-semibold">{title}</p><p className="max-w-sm text-sm text-[var(--muted)]">{description}</p>{action}</Card>; }
export function Input(props: InputHTMLAttributes<HTMLInputElement>) { return <input className="field-input" {...props} />; }
export function SearchField(props: InputHTMLAttributes<HTMLInputElement>) { return <label className="search-field"><Icon name="search" size={17} /><input aria-label="Buscar" type="search" {...props} /></label>; }
export function LoadingState({ label = "Cargando…" }: { label?: string }) { return <Card><p className="text-sm text-[var(--muted)]" aria-live="polite">{label}</p></Card>; }
export function Toast({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "error" }) { return <div className={`toast toast-${tone}`} role="status">{children}</div>; }
export function Modal({ children, open = false }: { children: ReactNode; open?: boolean }) { return <dialog className="modal glass-card" open={open}>{children}</dialog>; }
