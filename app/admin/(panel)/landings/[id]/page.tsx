import Link from "next/link";
import { notFound } from "next/navigation";
import { getEditableLanding } from "@/lib/admin/landingService";
import { LandingEditor } from "@/components/admin/LandingEditor";

type Params = { params: Promise<{ id: string }> };

export default async function EditorPage({ params }: Params) {
  const { id } = await params;
  const landing = await getEditableLanding(id);
  if (!landing) notFound();

  return (
    <section className="editor-page">
      <div className="editor-head">
        <div>
          <Link href="/admin" className="back-link">‹ All landings</Link>
          <h1>{landing.name}</h1>
        </div>
        <Link href={`/admin/landings/${landing.id}/preview`} target="_blank" className="btn-secondary">Preview ↗</Link>
      </div>
      <LandingEditor landing={landing} />
    </section>
  );
}
