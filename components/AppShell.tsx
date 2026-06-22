"use client";

import Link from "next/link";
import { Search, Bell, MessageSquare, User, LayoutDashboard, ShieldAlert, Menu, X } from "lucide-react";
import { FirebaseNotice } from "@/components/FirebaseNotice";
import { ThemeToggle } from "@/components/ThemeToggle";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [gamePlayed, setGamePlayed] = useState<string[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [pendingTeamRequests, setPendingTeamRequests] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState<any[]>([]);
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!auth) return;
    
    let unsubRequests: () => void;
    let unsubTeamRequests: () => void;
    let unsubNotifications: () => void;
    let unsubChats: () => void;
    
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u && firestore) {
        try {
          const snap = await getDoc(doc(firestore, `users/${u.uid}`));
          if (snap.exists()) {
            const data = snap.data();
            setIsAdmin(data?.role === "admin");
            setGamePlayed(data?.gamePlayed || []);
          } else {
            setIsAdmin(false);
            setGamePlayed([]);
          }
        } catch (e) {
          setIsAdmin(false);
          setGamePlayed([]);
        }
        setIsAuthLoaded(true);

        const { collection, query, where, onSnapshot } = await import("firebase/firestore");

        // Subscribe to friend requests
        const q = query(
          collection(firestore, "friendRequests"),
          where("to", "==", u.uid),
          where("status", "==", "pending")
        );
        unsubRequests = onSnapshot(q, async (snap) => {
          const reqs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          
          // Fetch from details
          const { fetchUsersProfiles } = await import("@/lib/chatUtils");
          const fromUids = reqs.map(r => r.from as string);
          if (fromUids.length > 0) {
            const profiles = await fetchUsersProfiles(fromUids);
            const enrichedReqs = reqs.map(r => ({ ...r, fromProfile: profiles[r.from as string] }));
            setPendingRequests(enrichedReqs);
          } else {
            setPendingRequests([]);
          }
        });

        // Subscribe to team requests
        const tq = query(
          collection(firestore, "teamRequests"),
          where("to", "==", u.uid),
          where("status", "==", "pending")
        );
        unsubTeamRequests = onSnapshot(tq, async (snap) => {
          const reqs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          const { fetchUsersProfiles } = await import("@/lib/chatUtils");
          const fromUids = reqs.map(r => r.from as string);
          if (fromUids.length > 0) {
            const profiles = await fetchUsersProfiles(fromUids);
            const enrichedReqs = reqs.map(r => ({ ...r, fromProfile: profiles[r.from as string] }));
            setPendingTeamRequests(enrichedReqs);
          } else {
            setPendingTeamRequests([]);
          }
        });

        // Subscribe to general notifications
        const nq = query(
          collection(firestore, "notifications"),
          where("userId", "==", u.uid),
          where("read", "==", false)
        );
        unsubNotifications = onSnapshot(nq, (snap) => {
          setUnreadNotifications(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
        });

        // Subscribe to unread chats
        const chatQ = query(collection(firestore, "chats"), where("participants", "array-contains", u.uid));
        unsubChats = onSnapshot(chatQ, (snap) => {
          let count = 0;
          snap.forEach(d => {
            const data = d.data();
            if (data.unreadBy && data.unreadBy.includes(u.uid)) {
              count++;
            }
          });
          setUnreadChatsCount(count);
        });

      } else {
        setIsAdmin(false);
        setGamePlayed([]);
        setIsAuthLoaded(true);
        setPendingRequests([]);
        setPendingTeamRequests([]);
        setUnreadNotifications([]);
        setUnreadChatsCount(0);
        if (unsubRequests) unsubRequests();
        if (unsubTeamRequests) unsubTeamRequests();
        if (unsubNotifications) unsubNotifications();
        if (unsubChats) unsubChats();
      }
    });
    
    return () => {
      unsubAuth();
      if (unsubRequests) unsubRequests();
      if (unsubTeamRequests) unsubTeamRequests();
      if (unsubNotifications) unsubNotifications();
      if (unsubChats) unsubChats();
    };
  }, []);

  const primarySport = gamePlayed[0];
  const teamLink = primarySport?.toLowerCase() === "football" 
    ? { name: "Clubs", href: "/clubs" } 
    : { name: "Teams", href: "/teams" };

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Tournaments", href: "/tournaments", match: "/tournament" },
    teamLink,
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
            {(navLinks as Array<{name: string, href: string, match?: string}>).map((link) => {
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
                  } ${!isAuthLoaded && (link.name === "Clubs" || link.name === "Teams") ? "opacity-0" : "opacity-100 transition-opacity duration-300"}`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Icons */}
          <div className="flex items-center gap-5 text-on-surface flex-1 justify-end relative">
            <div className="relative flex items-center">
              <button 
                className="hover:text-primary transition-colors relative flex items-center justify-center"
                onClick={() => setIsBellOpen(!isBellOpen)}
              >
                <Bell size={18} strokeWidth={2.5}/>
                {(pendingRequests.length > 0 || pendingTeamRequests.length > 0 || unreadNotifications.length > 0) && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-surface"></span>
                )}
              </button>
              
              {isBellOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-outline rounded-xl shadow-lg z-50 p-4 max-h-[80vh] overflow-y-auto">
                  
                  {/* Notifications */}
                  {unreadNotifications.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-black text-sm uppercase tracking-widest text-on-surface-variant mb-3 border-b border-outline pb-2">Notifications</h3>
                      <div className="space-y-3">
                        {unreadNotifications.map(notif => (
                          <div key={notif.id} className={`bg-surface-variant p-3 rounded-lg flex justify-between items-start gap-2 ${notif.actionUrl ? 'cursor-pointer hover:bg-surface-dim transition-colors' : ''}`} onClick={async () => {
                            if (notif.actionUrl) {
                              router.push(notif.actionUrl);
                              const { markNotificationRead } = await import("@/lib/teamUtils");
                              await markNotificationRead(notif.id);
                              setIsBellOpen(false);
                            }
                          }}>
                            <div>
                              <p className="text-xs font-black text-on-surface mb-1">{notif.title}</p>
                              <p className="text-[10px] text-on-surface-variant leading-tight">{notif.message}</p>
                            </div>
                            <button 
                              onClick={async () => {
                                const { markNotificationRead } = await import("@/lib/teamUtils");
                                await markNotificationRead(notif.id);
                              }}
                              className="text-on-surface-variant hover:text-primary transition-colors p-1"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Team Requests */}
                  {pendingTeamRequests.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-black text-sm uppercase tracking-widest text-on-surface-variant mb-3 border-b border-outline pb-2">Team Invites</h3>
                      <div className="space-y-3">
                        {pendingTeamRequests.map(req => (
                          <div key={req.id} className="flex flex-col gap-2 bg-surface-variant p-3 rounded-lg">
                            <div className="flex items-center gap-2">
                              {req.fromProfile?.photoURL ? (
                                <img src={req.fromProfile.photoURL} alt="Profile" className="w-8 h-8 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-surface-dim flex items-center justify-center font-bold text-primary shrink-0">
                                  {req.fromProfile?.name?.[0]?.toUpperCase() || "?"}
                                </div>
                              )}
                              <div>
                                <p className="text-xs font-bold text-on-surface"><span className="text-primary">{req.fromProfile?.name}</span> invited you</p>
                                <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">To: {req.teamName}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 w-full mt-1">
                              <button 
                                onClick={async () => {
                                  const { acceptTeamInvite } = await import("@/lib/teamUtils");
                                  await acceptTeamInvite(req.id, req.teamId, user!.uid, req.from, req.teamName);
                                }}
                                className="flex-1 py-1.5 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded hover:bg-emerald-600 transition-colors"
                              >
                                Accept
                              </button>
                              <button 
                                onClick={async () => {
                                  const { declineTeamInvite } = await import("@/lib/teamUtils");
                                  await declineTeamInvite(req.id, req.from, req.teamName, user!.uid);
                                }}
                                className="flex-1 py-1.5 bg-surface-dim text-on-surface-variant text-[10px] font-black uppercase tracking-widest rounded hover:bg-red-500 hover:text-white transition-colors"
                              >
                                Deny
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Friend Requests */}
                  <h3 className="font-black text-sm uppercase tracking-widest text-on-surface-variant mb-3 border-b border-outline pb-2">Friend Requests</h3>
                  {pendingRequests.length === 0 && pendingTeamRequests.length === 0 && unreadNotifications.length === 0 ? (
                    <p className="text-xs text-on-surface-variant text-center py-4">No pending requests.</p>
                  ) : (
                    <div className="space-y-3">
                      {pendingRequests.map(req => (
                        <div key={req.id} className="flex items-center justify-between gap-3 bg-surface-variant p-2 rounded-lg">
                          <div className="flex items-center gap-2 overflow-hidden">
                            {req.fromProfile?.photoURL ? (
                              <img src={req.fromProfile.photoURL} alt="Profile" className="w-8 h-8 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-surface-dim flex items-center justify-center font-bold text-primary shrink-0">
                                {req.fromProfile?.name?.[0]?.toUpperCase() || "?"}
                              </div>
                            )}
                            <div className="overflow-hidden">
                              <p className="text-xs font-bold text-on-surface truncate">{req.fromProfile?.name || "Unknown"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button 
                              onClick={async () => {
                                const { acceptFriendRequest } = await import("@/lib/chatUtils");
                                await acceptFriendRequest(req.id, req.from, user!.uid);
                              }}
                              className="px-2 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded hover:bg-emerald-600 transition-colors"
                            >
                              Accept
                            </button>
                            <button 
                              onClick={async () => {
                                const { declineFriendRequest } = await import("@/lib/chatUtils");
                                await declineFriendRequest(req.id);
                              }}
                              className="px-2 py-1 bg-surface-dim text-on-surface-variant text-[10px] font-bold rounded hover:bg-red-500 hover:text-white transition-colors"
                            >
                              Deny
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Link href="/chat" className="hover:text-primary transition-colors relative flex items-center justify-center">
              <MessageSquare size={18} strokeWidth={2.5}/>
              {unreadChatsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-surface"></span>
              )}
            </Link>
            
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
            {(navLinks as Array<{name: string, href: string, match?: string}>).map((link) => {
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

      {/* Brutalist Footer - Hide on chat pages to prevent full page scroll */}
      {!pathname.startsWith("/chat") && (
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
      )}
    </div>
  );
}
