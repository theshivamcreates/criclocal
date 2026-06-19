import Link from "next/link";
import { Activity, LayoutDashboard, Trophy } from "lucide-react";
import { FirebaseNotice } from "@/components/FirebaseNotice";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-paper">
      <FirebaseNotice />
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-black tracking-normal text-ink">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-pitch text-white">
              <Activity size={20} />
            </span>
            CricLocal
          </Link>
          <nav className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <Link className="flex items-center gap-1 rounded-md px-3 py-2 hover:bg-slate-100" href="/dashboard">
              <LayoutDashboard size={16} />
              Dashboard
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </main>
  );
}
