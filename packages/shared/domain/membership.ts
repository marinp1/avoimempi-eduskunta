export interface DateBounded {
  end_date: string | null;
}

export function isCurrentMembership(
  endDate: string | null | undefined,
  referenceDate?: Date,
): boolean {
  const cutoff = (referenceDate ?? new Date()).toISOString().slice(0, 10);
  return !endDate || endDate >= cutoff;
}

export function findCurrentGroup<T extends DateBounded>(
  memberships: T[],
  referenceDate?: Date,
): T | undefined {
  return memberships.find((g) =>
    isCurrentMembership(g.end_date, referenceDate),
  );
}

export function findCurrentDistrict<T extends DateBounded>(
  districts: T[],
): T | undefined {
  return districts.find((d) => !d.end_date);
}
