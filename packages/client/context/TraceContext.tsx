import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { getTraceItemKey } from "#client/components/traceExplorerModel";

export type TraceItem = {
  table: string;
  pkName: string;
  pkValue: string;
  label: string;
};

type TraceContextValue = {
  traceItem: TraceItem | null;
  setTraceItem: (item: TraceItem | null) => void;
  /** All traceable items currently mounted on the page. */
  pageItems: TraceItem[];
  /** Register a traceable item; returns an unregister cleanup function. */
  registerPageItem: (item: TraceItem) => () => void;
  /** Opens the drawer. Injected by PageDataSourcesDrawer on mount. */
  registerOpenDrawer: (fn: () => void) => void;
  openDrawer: () => void;
};

const TraceContext = createContext<TraceContextValue | null>(null);

export const TraceProvider = ({ children }: { children: ReactNode }) => {
  const [traceItem, setTraceItem] = useState<TraceItem | null>(null);
  const [pageItems, setPageItems] = useState<TraceItem[]>([]);
  const openDrawerRef = useRef<(() => void) | null>(null);

  const registerPageItem = useCallback((item: TraceItem) => {
    const key = getTraceItemKey(item);
    setPageItems((prev) => {
      if (prev.some((i) => getTraceItemKey(i) === key)) return prev;
      return [...prev, item];
    });
    return () => {
      setPageItems((prev) => prev.filter((i) => getTraceItemKey(i) !== key));
    };
  }, []);

  const registerOpenDrawer = useCallback((fn: () => void) => {
    openDrawerRef.current = fn;
  }, []);

  const openDrawer = useCallback(() => {
    openDrawerRef.current?.();
  }, []);

  return (
    <TraceContext.Provider
      value={{
        traceItem,
        setTraceItem,
        pageItems,
        registerPageItem,
        registerOpenDrawer,
        openDrawer,
      }}
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

export const TraceRegistration = ({
  table,
  pkName,
  pkValue,
  label,
}: TraceItem) => {
  const { registerPageItem } = useTrace();

  useEffect(() => {
    return registerPageItem({ table, pkName, pkValue, label });
  }, [label, pkName, pkValue, registerPageItem, table]);

  return null;
};
