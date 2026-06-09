import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type SessionState = {
  sessionId?: string;
  setSessionId: (sessionId: string) => void;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string>();
  const value = useMemo(() => ({ sessionId, setSessionId }), [sessionId]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
