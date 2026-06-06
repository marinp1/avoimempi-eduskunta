/** @jsxImportSource ../../src/jsx */
import Stat from "./stat";

interface StatProps {
  /** Stat label shown above the value. */
  label: string;
  /** Numeric or string value. */
  value: string | number;
  /** Optional CSS modifier appended to `stat__value`. */
  modifier?: string;
}

interface Props {
  /** Array of stat configurations to render in a row. */
  stats: StatProps[];
}

/** Horizontal row of stat blocks, used for key-number summaries. */
export default function StatRow({ stats }: Props) {
  return (
    <div class="stat-row">
      {stats.map((s) => (
        <Stat {...s} />
      ))}
    </div>
  );
}
