"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { useAdmin } from "@/hooks/useAdmin";

export default function DashboardSelectionPage() {
  const { isAdmin, loading } = useAdmin();

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-screen items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) return null;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-4xl font-black mb-4">Select a Sport</h1>
        <p className="text-lg text-on-surface-variant mb-12">
          Choose which sport you want to manage tournaments and matches for.
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          <Link
            href="/dashboard/cricket"
            className="group flex flex-col items-center justify-center rounded-2xl border-2 border-outline bg-surface p-10 shadow-sm transition-all hover:-translate-y-1 hover:border-primary hover:shadow-xl"
          >
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-surface-variant text-5xl group-hover:bg-surface-dim transition-colors">
              🏏
            </div>
            <h2 className="text-2xl font-black text-on-surface">Cricket</h2>
            <p className="mt-2 text-on-surface-variant">
              Manage cricket matches, tournaments, and scoring.
            </p>
          </Link>

          <Link
            href="/dashboard/football"
            className="group flex flex-col items-center justify-center rounded-2xl border-2 border-outline bg-surface p-10 shadow-sm transition-all hover:-translate-y-1 hover:border-primary hover:shadow-xl"
          >
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-surface-variant text-5xl group-hover:bg-surface-dim transition-colors">
              ⚽
            </div>
            <h2 className="text-2xl font-black text-on-surface">Football</h2>
            <p className="mt-2 text-on-surface-variant">
              Manage football matches, tournaments, and timer controls.
            </p>
          </Link>

          <Link
            href="/dashboard/pickleball"
            className="group flex flex-col items-center justify-center rounded-2xl border-2 border-outline bg-surface p-10 shadow-sm transition-all hover:-translate-y-1 hover:border-primary hover:shadow-xl"
          >
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-surface-variant text-5xl group-hover:bg-surface-dim transition-colors">
              🏓
            </div>
            <h2 className="text-2xl font-black text-on-surface">Pickleball</h2>
            <p className="mt-2 text-on-surface-variant">
              Manage pickleball sets, matches, and tournaments.
            </p>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
