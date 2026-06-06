/** @jsxImportSource ../../src/jsx */
import Stat from "./stat";

interface StatProps {
  label: string;
  value: string | number;
  modifier?: string;
  data?: Record<string, string>;
}

interface Props {
  stats: StatProps[];
}

export default function StatRow({ stats }: Props) {
  return (
    <div class="stat-row">
      {stats.map((s) => (
        <Stat {...s} />
      ))}
    </div>
  );
}
