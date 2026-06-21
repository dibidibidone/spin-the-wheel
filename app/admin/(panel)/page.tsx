import Link from "next/link";
import { listLandings } from "@/lib/admin/landingService";
import { NewLandingButton } from "@/components/admin/NewLandingButton";

export default async function Dashboard() {
  const landings = await listLandings();
  return (
    <section>
      <div className="dash-head">
        <h1>Landings</h1>
        <NewLandingButton />
      </div>

      <table className="landings-table">
        <thead>
          <tr><th>Name</th><th>Slug</th><th>Status</th><th>Domains</th></tr>
        </thead>
        <tbody>
          {landings.map((l) => (
            <tr key={l.id}>
              <td><Link href={`/admin/landings/${l.id}`}>{l.name}</Link></td>
              <td>{l.slug}</td>
              <td><span className={`status-pill status-${l.status}`}>{l.status}</span></td>
              <td>{l.domainCount}</td>
            </tr>
          ))}
          {landings.length === 0 && (
            <tr><td colSpan={4} className="empty">No landings yet — create your first one.</td></tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
