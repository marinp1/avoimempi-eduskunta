type DateLikeValue = string | null | undefined;

const toDate = (value: DateLikeValue): Date | null => {
  if (!value) return null;
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDateFi = (
  value: DateLikeValue,
  fallback = "-",
  options?: Intl.DateTimeFormatOptions,
): string => {
  const parsed = toDate(value);
  if (!parsed) return fallback;
  return parsed.toLocaleDateString("fi-FI", options);
};

export const formatDateLongFi = (
  value: DateLikeValue,
  fallback = "-",
): string =>
  formatDateFi(value, fallback, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export const formatTimeFi = (value: DateLikeValue, fallback = "-"): string => {
  const parsed = toDate(value);
  if (!parsed) return fallback;
  return parsed.toLocaleTimeString("fi-FI", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDateTimeFi = (
  value: DateLikeValue,
  fallback = "-",
  options?: Intl.DateTimeFormatOptions,
): string => {
  const parsed = toDate(value);
  if (!parsed) return fallback;
  if (options) return parsed.toLocaleString("fi-FI", options);
  return parsed.toLocaleString("fi-FI");
};

export const formatDateTimeCompactFi = (
  value: DateLikeValue,
  fallback = "-",
): string =>
  formatDateTimeFi(value, fallback, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
