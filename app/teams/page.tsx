import { AppShell } from "@/components/AppShell";
import { Users } from "lucide-react";

export default function TeamsPage() {
  return (
    <AppShell>
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center bg-background p-6">
        <Users size={64} className="mb-6 text-outline" />
        <h1 className="mb-2 text-center text-3xl font-black uppercase tracking-widest text-on-background md:text-4xl">
          Team Management
        </h1>
        <p className="text-center font-bold text-on-surface-variant">
          Coming Soon
        </p>
      </div>
    </AppShell>
  );
}
