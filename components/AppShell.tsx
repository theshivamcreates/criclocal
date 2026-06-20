"use client";

import Link from "next/link";
import { Search, Bell, MessageSquare, User, LayoutDashboard, ShieldAlert, Menu, X } from "lucide-react";
import { FirebaseNotice } from "@/components/FirebaseNotice";
import { ThemeToggle } from "@/components/ThemeToggle";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u && firestore) {
        try {
          const snap = await getDoc(doc(firestore, `users/${u.uid}`));
          setIsAdmin(snap.exists() && snap.data()?.role === "admin");
        } catch (e) {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    });
  }, []);

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Tournaments", href: "/tournaments", match: "/tournament" },
    { name: "Clubs", href: "/clubs" },
    { name: "Players", href: "/players" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <FirebaseNotice />
      
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 w-full border-b border-surface-dim bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6 relative">
          
          {/* Left Side: Mobile Hamburger & Desktop Logo */}
          <div className="flex items-center gap-4 flex-1">
            <button 
              className="md:hidden text-on-surface hover:text-primary transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} strokeWidth={2.5} />
            </button>
            <Link href="/" className="hidden md:flex items-center">
              <span className="font-display text-2xl font-black italic tracking-tighter text-primary">
                KIX XI
              </span>
            </Link>
          </div>

          {/* Center: Mobile Logo & Desktop Navigation */}
          <Link href="/" className="md:hidden absolute left-1/2 -translate-x-1/2 flex items-center">
            <span className="font-display text-2xl font-black italic tracking-tighter text-primary">
              KIX XI
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 justify-center flex-[2]">
            {navLinks.map((link) => {
              const isActive = link.href === "/" 
                ? pathname === "/" 
                : pathname?.startsWith(link.href) || (link.match && pathname?.includes(link.match));
                
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-[11px] font-black uppercase tracking-[0.1em] py-5 transition-colors ${
                    isActive
                      ? "text-primary border-b-2 border-primary"
                      : "text-on-surface hover:text-primary"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Icons */}
          <div className="flex items-center gap-5 text-on-surface flex-1 justify-end">
            <button className="hover:text-primary transition-colors hidden sm:block"><Search size={18} strokeWidth={2.5}/></button>
            <button className="hover:text-primary transition-colors"><Bell size={18} strokeWidth={2.5}/></button>
            <button className="hover:text-primary transition-colors"><MessageSquare size={18} strokeWidth={2.5}/></button>
            
            <div className="hidden md:flex items-center gap-5">
              <div className="h-4 w-px bg-surface-dim mx-1"></div>

              <ThemeToggle />

              {isAdmin && (
                <Link href="/dashboard" className="flex items-center gap-2 border-2 border-on-surface px-3 py-1.5 hover:bg-on-surface hover:text-surface transition-colors" title="Admin Dashboard">
                  <ShieldAlert size={16} strokeWidth={2.5} className="text-primary"/>
                  <span className="text-[11px] font-black uppercase tracking-widest hidden sm:block">Admin</span>
                </Link>
              )}
              
              {user ? (
                <Link href="/profile" className="flex items-center justify-center h-8 w-8 bg-surface-variant text-on-surface hover:bg-primary hover:text-on-primary transition-colors border border-on-surface rounded-md">
                   <User size={18} strokeWidth={2.5}/>
                </Link>
              ) : (
                <Link href="/auth" className="flex items-center justify-center h-8 w-8 bg-surface-variant text-on-surface hover:bg-primary hover:text-on-primary transition-colors border border-on-surface rounded-md" title="Sign In">
                   <User size={18} strokeWidth={2.5}/>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Navigation */}
      <div 
        className={`fixed inset-0 z-[100] flex justify-start transition-opacity duration-300 ${
          isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div 
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            isMobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsMobileMenuOpen(false)}
        />
        <nav 
          className={`relative w-64 max-w-[80vw] h-full bg-surface border-r border-outline p-6 flex flex-col transition-transform duration-300 ease-out ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between mb-8">
            <span className="font-display text-2xl font-black italic tracking-tighter text-primary">
              KIX XI
            </span>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 text-on-surface hover:text-primary transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          <div className="flex flex-col gap-4 flex-1">
            {navLinks.map((link) => {
              const isActive = link.href === "/" 
                ? pathname === "/" 
                : pathname?.startsWith(link.href) || (link.match && pathname?.includes(link.match));
                
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`text-sm font-black uppercase tracking-[0.1em] py-3 px-4 rounded-lg transition-colors border ${
                    isActive
                      ? "text-primary border-primary bg-primary/10"
                      : "text-on-surface border-transparent hover:text-primary hover:bg-surface-dim"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          <div className="pt-6 border-t border-outline flex flex-col gap-6 mt-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Theme</span>
              <ThemeToggle />
            </div>
            
            {isAdmin && (
              <Link 
                href="/dashboard" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 bg-inverse-surface text-white py-3 rounded-lg hover:bg-surface-variant transition-colors"
              >
                <ShieldAlert size={18} className="text-primary"/>
                <span className="text-sm font-black uppercase tracking-widest">Admin Dashboard</span>
              </Link>
            )}
            
            {user ? (
              <Link 
                href="/profile" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 bg-surface border border-outline text-on-surface py-3 rounded-lg hover:bg-surface-dim transition-colors"
              >
                <User size={18} />
                <span className="text-sm font-black uppercase tracking-widest">My Profile</span>
              </Link>
            ) : (
              <Link 
                href="/auth" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-lg hover:bg-primary-container transition-colors"
              >
                <User size={18} />
                <span className="text-sm font-black uppercase tracking-widest">Sign In</span>
              </Link>
            )}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {/* Brutalist Footer */}
      <footer className="bg-inverse-surface text-inverse-on-surface py-16 px-6 mt-auto">
        <div className="max-w-[1280px] mx-auto flex flex-col items-center">
          <span className="font-display text-3xl font-black italic tracking-tighter text-surface-bright mb-8">
            KIX XI
          </span>
          <div className="flex flex-wrap justify-center gap-6 md:gap-12 text-[10px] font-black uppercase tracking-[0.1em] text-secondary-fixed-dim mb-12">
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Contact Us</Link>
            <Link href="#" className="hover:text-white transition-colors">Sponsorships</Link>
          </div>
          <p className="text-[10px] font-bold tracking-widest text-secondary-fixed-dim/60 uppercase">
            © 2026 KIX XI SPORTS ECOSYSTEM. ALL RIGHTS RESERVED.
          </p>
        </div>
      </footer>
    </div>
  );
}
