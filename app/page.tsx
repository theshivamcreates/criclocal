"use client";

import Link from "next/link";
import { ArrowRight, Trophy, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  return (
    <AppShell>
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center bg-inverse-surface overflow-hidden text-on-primary">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=2000" 
            alt="Athletic Football Player" 
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-inverse-surface/90 via-inverse-surface/60 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface via-transparent to-transparent"></div>
        </div>

        <div className="relative z-10 w-full max-w-[1280px] mx-auto px-6 py-20">
          <div className="max-w-2xl">
            <div className="inline-block bg-inverse-surface border border-outline px-3 py-1 mb-6">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-bright">
                System Online
              </span>
            </div>
            
            <h1 className="font-display text-6xl md:text-7xl lg:text-[80px] font-black leading-[0.9] tracking-tighter mb-8 uppercase">
              Control the pace.<br/>
              <span className="text-primary italic">Dominate the pitch.</span>
            </h1>
            
            <p className="text-lg md:text-xl font-medium text-inverse-on-surface opacity-80 leading-relaxed mb-12 max-w-xl">
              The definitive sports ecosystem engineered for high-performance athletes, elite clubs, and relentless organizers. Built with brutal efficiency.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              {user ? (
                <>
                  <Link 
                    href="/scores" 
                    className="bg-primary text-on-primary font-bold uppercase tracking-widest text-sm px-8 py-4 flex items-center justify-center gap-2 hover:bg-primary-container transition-colors"
                  >
                    See Recent Matches <ArrowRight size={18} strokeWidth={3}/>
                  </Link>
                  <Link 
                    href="/" 
                    className="bg-inverse-surface/50 backdrop-blur border-2 border-on-primary text-on-primary font-bold uppercase tracking-widest text-sm px-8 py-4 flex items-center justify-center hover:bg-on-primary hover:text-inverse-surface transition-colors"
                  >
                    Explore Network
                  </Link>
                </>
              ) : (
                <>
                  <Link 
                    href="/signup" 
                    className="bg-primary text-on-primary font-bold uppercase tracking-widest text-sm px-8 py-4 flex items-center justify-center gap-2 hover:bg-primary-container transition-colors"
                  >
                    Join the Community <ArrowRight size={18} strokeWidth={3}/>
                  </Link>
                  <Link 
                    href="/" 
                    className="bg-inverse-surface/50 backdrop-blur border-2 border-on-primary text-on-primary font-bold uppercase tracking-widest text-sm px-8 py-4 flex items-center justify-center hover:bg-on-primary hover:text-inverse-surface transition-colors"
                  >
                    Explore Network
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* The Arsenal Section */}
      <section className="bg-surface py-24 px-6">
        <div className="max-w-[1280px] mx-auto">
          
          <div className="mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-black uppercase tracking-tighter border-b-4 border-primary inline-block pb-2 mb-6">
              The Arsenal
            </h2>
            <p className="text-on-surface-variant font-medium max-w-2xl text-lg">
              Core modules designed to streamline operations and amplify performance across the board.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Club Management (Span 2) */}
            <div className="md:col-span-2 relative h-[400px] bg-inverse-surface overflow-hidden group">
              <img 
                src="https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=800" 
                alt="Club" 
                className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500 grayscale"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface to-transparent opacity-80"></div>
              
              <div className="relative z-10 p-10 h-full flex flex-col justify-end">
                <div className="flex items-center gap-3 text-primary mb-4">
                  <Users size={24} strokeWidth={2.5}/>
                </div>
                <h3 className="font-display text-3xl font-black text-on-primary uppercase tracking-tight mb-3">
                  Club Management
                </h3>
                <p className="text-inverse-on-surface opacity-80 max-w-md mb-8">
                  Take total control of your roster. Streamline day-to-day operations, track critical finances, and coordinate match schedules with uncompromising precision.
                </p>
                <Link href="#" className="text-primary font-bold uppercase tracking-widest text-xs flex items-center gap-2 hover:text-primary-container">
                  Manage Club <ArrowRight size={14} strokeWidth={3}/>
                </Link>
              </div>
            </div>

            {/* Tournament Registration */}
            <div className="bg-inverse-surface p-10 h-[400px] flex flex-col">
              <div className="w-12 h-12 bg-surface text-primary flex items-center justify-center mb-auto shadow-sm">
                <Trophy size={24} strokeWidth={2.5}/>
              </div>
              <h3 className="font-display text-3xl font-black text-on-primary uppercase tracking-tight mb-4 mt-12">
                Tournament Registration
              </h3>
              <p className="text-inverse-on-surface opacity-80 mb-8">
                Enter the arena. Discover, evaluate, and register for top-tier competitive events instantly. No friction, just competition.
              </p>
              <Link href="/tournaments" className="bg-surface text-on-surface text-center font-bold uppercase tracking-widest text-xs py-4 hover:bg-surface-variant transition-colors">
                View Brackets
              </Link>
            </div>

            {/* Player Networking (Full Span Split) */}
            <div className="md:col-span-3 bg-surface-container flex flex-col md:flex-row h-auto md:h-[400px]">
              <div className="flex-1 p-10 md:p-16 flex flex-col justify-center">
                <span className="text-primary font-bold uppercase tracking-[0.2em] text-[10px] mb-4">Global Network</span>
                <h3 className="font-display text-4xl font-black text-on-surface uppercase tracking-tight mb-6">
                  Player Networking
                </h3>
                <p className="text-on-surface-variant max-w-md mb-10 text-lg">
                  Connect with elite peers, get scouted by top clubs, and build a professional athletic profile in a high-stakes, data-driven environment.
                </p>
                <div>
                  <Link href="/profile" className="border-2 border-primary text-primary font-bold uppercase tracking-widest text-xs px-8 py-3 hover:bg-primary hover:text-on-primary transition-colors inline-block">
                    Build Profile
                  </Link>
                </div>
              </div>
              <div className="flex-1 relative min-h-[300px]">
                 <img 
                  src="https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=1200" 
                  alt="Tennis Players" 
                  className="absolute inset-0 w-full h-full object-cover grayscale opacity-100"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Sports Ticker */}
      <div className="bg-inverse-surface border-t border-b border-outline-variant text-surface-bright overflow-hidden flex whitespace-nowrap py-3">
        <div className="animate-marquee inline-block font-display font-bold uppercase tracking-widest text-sm">
          <span className="text-primary mr-2">● LIVE:</span> RED DRAGONS FC 2 - 1 METRO UTD 
          <span className="mx-8 text-inverse-on-surface opacity-30">{"///"}</span> 
          <span>No friction, just competition</span>
          <span className="mx-8 text-inverse-on-surface opacity-30">{"///"}</span> 
          <span>Control the pace</span>
          <span className="mx-8 text-inverse-on-surface opacity-30">{"///"}</span> 
          <span>Dominate the pitch</span>
          <span className="mx-8 text-inverse-on-surface opacity-30">{"///"}</span> 
          <span>System Online</span>
          <span className="mx-8 text-inverse-on-surface opacity-30">{"///"}</span> 
          <span>High-performance athletes</span>
          <span className="mx-8 text-inverse-on-surface opacity-30">{"///"}</span> 
          <span>Elite clubs</span>
          <span className="mx-8 text-inverse-on-surface opacity-30">{"///"}</span> 
          <span>Relentless organizers</span>
          <span className="mx-8 text-inverse-on-surface opacity-30">{"///"}</span>
        </div>
      </div>
    </AppShell>
  );
}
