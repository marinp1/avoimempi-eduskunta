import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

export type TraceItem = {
  table: string;
  pkName: string;
  pkValue: string;
  label: string;
};

type TraceContextValue = {
  traceItem: TraceItem | null;
  setTraceItem: (item: TraceItem | null) => void;
  /** Opens the drawer. Injected by PageDataSourcesDrawer on mount. */
  registerOpenDrawer: (fn: () => void) => void;
  openDrawer: () => void;
};

const TraceContext = createContext<TraceContextValue | null>(null);

export const TraceProvider = ({ children }: { children: ReactNode }) => {
  const [traceItem, setTraceItem] = useState<TraceItem | null>(null);
  const openDrawerRef = useRef<(() => void) | null>(null);

  const registerOpenDrawer = useCallback((fn: () => void) => {
    openDrawerRef.current = fn;
  }, []);

  const openDrawer = useCallback(() => {
    openDrawerRef.current?.();
  }, []);

  return (
    <TraceContext.Provider
      value={{ traceItem, setTraceItem, registerOpenDrawer, openDrawer }}
    >
      {children}
    </TraceContext.Provider>
  );
};

export const useTrace = (): TraceContextValue => {
  const ctx = useContext(TraceContext);
  if (!ctx) throw new Error("useTrace must be used within TraceProvider");
  return ctx;
};
