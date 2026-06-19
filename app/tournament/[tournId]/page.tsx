import Link from "next/link";
import { Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export default async function TournamentPage({ params }: { params: Promise<{ tournId: string }> }) {
  const { tournId } = await params;

  return (
    <AppShell>
      <section className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-pitch text-white">
            <Trophy size={22} />
          </span>
          <div>
            <p className="text-sm font-black uppercase text-pitch">Tournament</p>
            <h1 className="text-2xl font-black">{tournId === "demo" ? "Summer Cup" : tournId}</h1>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {["Qualifier 1", "Eliminator", "Final"].map((round, index) => (
            <div key={round} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-black uppercase text-slate-500">{round}</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-md border border-slate-200 p-3">
                  <p className="font-black">{index === 2 ? "Winner Q1" : "Mumbai Indians"}</p>
                  <p className="text-sm text-slate-500">vs</p>
                  <p className="font-black">{index === 2 ? "Winner Eliminator" : "Chennai Super Kings"}</p>
                </div>
                <Link className="block rounded-md bg-slate-900 px-3 py-2 text-center text-sm font-black text-white" href="/dashboard">
                  Manage Matches
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
