import { listLandings } from "@/lib/admin/landingService";
import { StatisticsView } from "@/components/admin/StatisticsView";

export default async function StatsPage() {
  const landings = await listLandings();
  return (
    <section>
      <h1>Statistics</h1>
      <StatisticsView landings={landings.map((l) => ({ id: l.id, name: l.name }))} />
    </section>
  );
}
