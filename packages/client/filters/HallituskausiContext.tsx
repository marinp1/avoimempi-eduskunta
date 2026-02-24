import React from "react";

const HALLITUSKAUSI_PARAM = "hallituskausi";

export interface HallituskausiPeriod {
  id: string;
  name: string;
  label: string;
  startDate: string;
  endDate: string | null;
}

interface DateRangeInput {
  startDate?: string;
  endDate?: string;
}

interface HallituskausiContextValue {
  hallituskaudet: HallituskausiPeriod[];
  selectedHallituskausiId: string;
  selectedHallituskausi: HallituskausiPeriod | null;
  setSelectedHallituskausiId: (id: string) => void;
  loading: boolean;
}

const HallituskausiContext = React.createContext<
  HallituskausiContextValue | undefined
>(undefined);

const normalizeDate = (value?: string | null) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toComparableDate = (value?: string | null) => {
  const normalized = normalizeDate(value);
  if (!normalized) return undefined;
  if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) return normalized.slice(0, 10);
  return undefined;
};

const maxDate = (a: string, b: string) => (a > b ? a : b);

const minDate = (a: string, b: string) => (a < b ? a : b);

export const buildHallituskausiLabel = (row: {
  name: string;
  startDate: string;
  endDate: string | null;
}) => `${row.name} (${row.startDate} - ${row.endDate ?? "..."})`;

const getSelectedIdFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get(HALLITUSKAUSI_PARAM) || "";
};

const writeSelectedIdToUrl = (id: string) => {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set(HALLITUSKAUSI_PARAM, id);
  else url.searchParams.delete(HALLITUSKAUSI_PARAM);
  window.history.pushState({}, "", url.toString());
};

const clearSelectedIdFromUrl = () => {
  const url = new URL(window.location.href);
  url.searchParams.delete(HALLITUSKAUSI_PARAM);
  window.history.replaceState({}, "", url.toString());
};

export const intersectDateRangeWithHallituskausi = (
  localRange: DateRangeInput,
  hallituskausi: HallituskausiPeriod | null,
): DateRangeInput => {
  const localStart = normalizeDate(localRange.startDate);
  const localEnd = normalizeDate(localRange.endDate);

  if (!hallituskausi) {
    return {
      startDate: localStart,
      endDate: localEnd,
    };
  }

  const starts = [localStart, hallituskausi.startDate].filter(
    Boolean,
  ) as string[];
  const ends = [localEnd, hallituskausi.endDate || undefined].filter(
    Boolean,
  ) as string[];

  const startDate = starts.length > 0 ? starts.reduce(maxDate) : undefined;
  const endDate = ends.length > 0 ? ends.reduce(minDate) : undefined;

  return {
    startDate,
    endDate,
  };
};

export const isDateWithinHallituskausi = (
  date: string,
  hallituskausi: HallituskausiPeriod | null,
) => {
  const candidate = toComparableDate(date);
  if (!candidate) return false;
  if (!hallituskausi) return true;
  if (candidate < hallituskausi.startDate) return false;
  if (hallituskausi.endDate && candidate > hallituskausi.endDate) return false;
  return true;
};

export const HallituskausiProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [hallituskaudet, setHallituskaudet] = React.useState<
    HallituskausiPeriod[]
  >([]);
  const [selectedHallituskausiId, setSelectedHallituskausiIdState] =
    React.useState<string>(() => getSelectedIdFromUrl());
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    const onPopState = () => {
      setSelectedHallituskausiIdState(getSelectedIdFromUrl());
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    const loadHallituskaudet = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/hallituskaudet");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data: HallituskausiPeriod[] = await response.json();
        const normalized = data.map((row) => ({
          ...row,
          label: row.label || buildHallituskausiLabel(row),
        }));
        if (!cancelled) {
          setHallituskaudet(normalized);
        }
      } catch {
        if (!cancelled) {
          setHallituskaudet([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadHallituskaudet();

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (loading) return;
    if (selectedHallituskausiId === "") return;
    const exists = hallituskaudet.some(
      (row) => row.id === selectedHallituskausiId,
    );
    if (!exists) {
      setSelectedHallituskausiIdState("");
      clearSelectedIdFromUrl();
    }
  }, [hallituskaudet, loading, selectedHallituskausiId]);

  const selectedHallituskausi = React.useMemo(
    () =>
      hallituskaudet.find((row) => row.id === selectedHallituskausiId) || null,
    [hallituskaudet, selectedHallituskausiId],
  );

  const setSelectedHallituskausiId = React.useCallback((id: string) => {
    setSelectedHallituskausiIdState(id);
    writeSelectedIdToUrl(id);
  }, []);

  const value = React.useMemo(
    () => ({
      hallituskaudet,
      selectedHallituskausiId,
      selectedHallituskausi,
      setSelectedHallituskausiId,
      loading,
    }),
    [
      hallituskaudet,
      selectedHallituskausiId,
      selectedHallituskausi,
      setSelectedHallituskausiId,
      loading,
    ],
  );

  return (
    <HallituskausiContext.Provider value={value}>
      {children}
    </HallituskausiContext.Provider>
  );
};

export const useHallituskausi = () => {
  const context = React.useContext(HallituskausiContext);
  if (!context) {
    throw new Error(
      "useHallituskausi must be used within HallituskausiProvider",
    );
  }
  return context;
};
