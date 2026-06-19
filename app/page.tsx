import Link from "next/link";
import { Radio, Smartphone, Tv, Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export default function HomePage() {
  return (
    <AppShell>
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-16">
        <div>
          <p className="mb-3 text-sm font-black uppercase text-pitch">Live cricket scoring</p>
          <h1 className="max-w-3xl text-5xl font-black leading-tight text-ink md:text-6xl">CricLocal</h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">
            Create a match, score every ball from your phone, share a public scoreboard, and feed a compact transparent overlay into OBS or vMix.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="rounded-lg bg-pitch px-5 py-3 font-black text-white shadow-sm hover:bg-emerald-800" href="/dashboard">
              Create Match
            </Link>
            <Link className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-black text-slate-900 hover:bg-slate-50" href="/match/demo/live">
              View Demo Scoreboard
            </Link>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-glow">
          <div className="rounded-lg bg-ink p-5 text-white">
            <div className="flex items-center justify-between">
              <p className="font-black text-emerald-300">Mumbai Indians</p>
              <p className="rounded-md bg-white/10 px-2 py-1 text-xs font-black">LIVE</p>
            </div>
            <p className="mt-4 text-6xl font-black">124/4</p>
            <p className="text-lg font-bold text-slate-200">(14.3/20) RR 8.55</p>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {["1", "4", "0", "W", "2", "6"].map((ball, index) => (
                <span key={`${ball}-${index}`} className="grid h-12 place-items-center rounded-md bg-white/10 text-xl font-black">
                  {ball}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 md:grid-cols-4">
          {[
            { icon: Smartphone, label: "Phone scorer", text: "Large tap targets for every ball event." },
            { icon: Radio, label: "Live sync", text: "Realtime Database updates every view." },
            { icon: Tv, label: "Stream overlay", text: "Transparent compact browser source." },
            { icon: Trophy, label: "Tournaments", text: "Group matches into simple brackets." }
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-200 p-4">
              <item.icon className="text-pitch" size={24} />
              <h2 className="mt-3 font-black">{item.label}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
