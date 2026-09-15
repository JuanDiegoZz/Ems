"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";

const ConnectivityContext = createContext({ online: true });
const subscribe = (callback: () => void) => { window.addEventListener("online", callback); window.addEventListener("offline", callback); return () => { window.removeEventListener("online", callback); window.removeEventListener("offline", callback); }; };
const getSnapshot = () => navigator.onLine;
const getServerSnapshot = () => true;

export function ConnectivityProvider({ children }: { children: ReactNode }) {
  const online = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [restored, setRestored] = useState(false);
  useEffect(() => { const onOnline = () => { setRestored(true); window.setTimeout(() => setRestored(false), 4000); }; window.addEventListener("online", onOnline); return () => window.removeEventListener("online", onOnline); }, []);
  return <ConnectivityContext.Provider value={{ online }}>{children}{!online && <div className="connectivity-banner" role="status">Sin conexión. Las acciones que requieren internet están pausadas.</div>}{restored && <div className="connectivity-banner connectivity-restored" role="status">Conexión restaurada</div>}</ConnectivityContext.Provider>;
}
export function useConnectivity() { return useContext(ConnectivityContext); }
