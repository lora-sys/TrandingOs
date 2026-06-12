import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type SessionState = {
  sessionId?: string;
  setSessionId: (sessionId: string | undefined) => void;
};

const SessionContext = createContext<SessionState | null>(null);

const STORAGE_KEY = "trandingos-session-id";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    return localStorage.getItem(STORAGE_KEY) ?? undefined;
  });

  const handleSetSessionId = (newId: string | undefined) => {
    setSessionId(newId);
    if (newId) {
      localStorage.setItem(STORAGE_KEY, newId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const value = useMemo(() => ({ sessionId, setSessionId: handleSetSessionId }), [sessionId]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
