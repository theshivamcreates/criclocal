"use client";

import { use } from "react";
import { AppShell } from "@/components/AppShell";
import { db, auth, firestore } from "@/lib/firebase";
import { ref as dbRef, onValue, push, set } from "firebase/database";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Trophy, Calendar, MapPin, Users, Award, X, Users2 } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Script from "next/script";
import { PlayerProfileModal } from "@/components/PlayerProfileModal";
import { useSearchParams } from "next/navigation";
import { getUserTeam, sendNotification } from "@/lib/teamUtils";
import { update } from "firebase/database";

interface Team {
  id: string;
  name: string;
  logo?: string;
  color?: string;
  userId?: string;
  roster?: { name: string; role: string }[];
}

interface TournamentData {
  id: string;
  name: string;
  entryFee?: string;
  maxTeams?: string;
  startDate?: string;
  location?: string;
  skillLevel?: string;
  status?: string;
  bannerUrl?: string;
  createdAt: number;
  sport?: string;
  settings?: {
    format?: string;
    maxSets?: number;
    pointsToWin?: number;
    maxPlayersPerTeam?: number | string;
  };
  teams?: Record<string, Team>;
}

export default function PublicTournamentPage({
  params,
}: {
  params: Promise<{ sport: string; tournamentId: string }>;
}) {
  const resolvedParams = use(params);
  const { sport, tournamentId } = resolvedParams;

  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isParticipating, setIsParticipating] = useState(false);
  const searchParams = useSearchParams();
  const urlPayForTeamKey = searchParams.get("payForTeam");

  const [showFootballRosterSelection, setShowFootballRosterSelection] = useState(false);
  const [footballTeamData, setFootballTeamData] = useState<any>(null);
  const [selectedFootballPlayers, setSelectedFootballPlayers] = useState<string[]>([]);


  useEffect(() => {
    // Determine the Firebase DB path based on the sport parameter
    const dbPath =
      sport === "football"
        ? `football/tournaments/${tournamentId}`
        : sport === "pickleball"
        ? `pickleball/tournaments/${tournamentId}`
        : `tournaments/${tournamentId}`;

    const tRef = dbRef(db, dbPath);
    const unsubscribe = onValue(tRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setTournament({ ...data, id: tournamentId });
      } else {
        setTournament(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [sport, tournamentId]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center p-8 text-on-surface-variant font-medium">
          <div className="flex flex-col items-center gap-4">
            <Trophy className="animate-pulse text-primary" size={48} />
            <p>Loading tournament details...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!tournament) {
    return (
      <AppShell>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center mt-10">
          <Trophy size={64} className="text-outline mb-6" />
          <h2 className="text-3xl font-black mb-2 text-on-surface">Tournament Not Found</h2>
          <p className="text-on-surface-variant mb-8 max-w-md">
            This tournament may have been deleted, or the URL is incorrect.
          </p>
          <Link
            href="/tournaments"
            className="px-6 py-3 bg-primary hover:bg-primary-container text-white rounded-lg font-black transition-colors"
          >
            Browse Tournaments
          </Link>
        </div>
      </AppShell>
    );
  }

  const teamList = tournament.teams
    ? Object.keys(tournament.teams).map((k) => ({
        ...tournament.teams![k],
        id: k,
      }))
    : [];

  const userPendingPaymentTeamId = auth?.currentUser?.uid
    ? teamList.find(t => {
        if (sport === "football") {
          return (t as any).pendingPaymentsFrom?.includes(auth?.currentUser?.uid);
        }
        return (t as any).pendingPaymentFrom === auth?.currentUser?.uid;
      })?.id
    : undefined;
  const payForTeamKey = urlPayForTeamKey || userPendingPaymentTeamId;

  const isSingles = tournament?.sport === "pickleball" && tournament?.settings?.format === "Singles";

  const finalizeParticipation = async (userData: any, pickleballTeam?: any) => {
    try {
      const dbPath =
        sport === "football"
          ? `football/tournaments/${tournamentId}`
          : sport === "pickleball"
          ? `pickleball/tournaments/${tournamentId}`
          : `tournaments/${tournamentId}`;
          
      if (payForTeamKey && !isSingles) {
        // This is the second player completing the payment
        const teamPath = `${dbPath}/teams/${payForTeamKey}`;
        await update(dbRef(db, teamPath), {
          paymentStatus: "confirmed",
          pendingPaymentFrom: null
        });
        
        // Notify owner
        const teamData = tournament?.teams?.[payForTeamKey] as any;
        if (teamData?.userId) {
          await sendNotification({
            userId: teamData.userId,
            title: "Registration Confirmed",
            message: `${userData.name} completed their payment for ${tournament?.name}!`,
            type: "general"
          });
        }
        
        if (sport === "football") {
          const currentPending = teamData?.pendingPaymentsFrom || [];
          const newPending = currentPending.filter((id: string) => id !== auth!.currentUser!.uid);
          
          if (newPending.length === 0) {
            await update(dbRef(db, teamPath), {
              paymentStatus: "confirmed",
              pendingPaymentsFrom: null
            });
            alert("Your payment is complete. The team is now fully registered!");
          } else {
            await update(dbRef(db, teamPath), {
              pendingPaymentsFrom: newPending
            });
            alert("Your payment is complete! Waiting for other teammates.");
          }
        } else {
          // Pickleball / default logic
          await update(dbRef(db, teamPath), {
            paymentStatus: "confirmed",
            pendingPaymentFrom: null
          });
          alert("Registration confirmed! Your team is now enrolled.");
        }
      } else {
        const newTeamRef = push(dbRef(db, `${dbPath}/teams`));
        
        const newTeam: any = {
          name: isSingles ? (userData.name || "Unknown") : (pickleballTeam ? pickleballTeam.name : `${userData.name}'s Team`),
          logo: (pickleballTeam && pickleballTeam.logoURL) ? pickleballTeam.logoURL : (userData.photoURL || null),
          userId: auth!.currentUser!.uid,
        };
        
        if (sport === "football" && footballTeamData) {
          newTeam.name = footballTeamData.name;
          newTeam.logo = footballTeamData.logoURL || null;
          
          newTeam.roster = footballTeamData.playerDetails
            .filter((p: any) => selectedFootballPlayers.includes(p.id))
            .map((p: any) => ({
               name: p.name,
               userId: p.id,
               role: p.id === footballTeamData.ownerId ? "Captain" : "Player"
            }));
            
          const pendingIds = selectedFootballPlayers.filter(id => id !== auth!.currentUser!.uid);
          
          if (pendingIds.length > 0) {
            newTeam.paymentStatus = "partial";
            newTeam.pendingPaymentsFrom = pendingIds;
            newTeam.totalFeeSplits = selectedFootballPlayers.length;
          } else {
            newTeam.paymentStatus = "confirmed";
          }
          
          await set(newTeamRef, newTeam);
          
          if (pendingIds.length > 0) {
            for (const tId of pendingIds) {
              await sendNotification({
                userId: tId,
                title: "Tournament Payment Required",
                message: `${userData.name} registered ${footballTeamData.name} for ${tournament?.name}. Please pay your share to confirm!`,
                type: "payment_required",
                actionUrl: `/tournaments/${sport}/${tournamentId}?payForTeam=${newTeamRef.key}`
              });
            }
            alert("Your share is paid! Notifications sent to teammates to complete the registration.");
          } else {
            alert("Successfully registered for the tournament!");
          }
        } else if (!isSingles && pickleballTeam && pickleballTeam.playerDetails) {
          newTeam.roster = pickleballTeam.playerDetails.map((p: any) => ({
            name: p.name,
            userId: p.id,
            role: p.id === pickleballTeam.ownerId ? "Captain" : "Player"
          }));
          
          const teammateId = pickleballTeam.players.find((id: string) => id !== auth!.currentUser!.uid);
          
          newTeam.paymentStatus = "partial";
          newTeam.pendingPaymentFrom = teammateId;
          
          await set(newTeamRef, newTeam);
          
          // Send notification to teammate
          await sendNotification({
            userId: teammateId,
            title: "Tournament Payment Required",
            message: `${userData.name} registered ${pickleballTeam.name} for ${tournament?.name}. Please pay your share to confirm!`,
            type: "payment_required",
            actionUrl: `/tournaments/${sport}/${tournamentId}?payForTeam=${newTeamRef.key}`
          });
          
          alert("Your half is paid! We sent a notification to your teammate to complete the registration.");
        } else {
          if (!isSingles) {
            newTeam.roster = [{ name: userData.name || "Unknown", role: "Captain" }];
          }
          await set(newTeamRef, newTeam);
          alert("Successfully registered for the tournament!");
        }
      }
      
    } catch (err) {
      console.error("Error saving team:", err);
      alert("An error occurred while joining the tournament. Please contact admin.");
    } finally {
      setIsParticipating(false);
    }
  };

  const handleParticipate = async () => {
    if (!auth || !auth.currentUser) {
      alert("You must be logged in to participate.");
      return;
    }
    
    setIsParticipating(true);
    try {
      const userDoc = await getDoc(doc(firestore, `users/${auth.currentUser.uid}`));
      if (!userDoc.exists()) {
        alert("Could not find your user profile.");
        setIsParticipating(false);
        return;
      }
      
      const userData = userDoc.data();
      let pickleballTeam = null;

      // Football Team Check
      if (sport === "football" && !payForTeamKey) {
        const team = await getUserTeam(auth.currentUser.uid, "Football");
        if (!team) {
          alert("You must create or join a Football club first.");
          setIsParticipating(false);
          return;
        }
        
        // Fetch player details
        const playerDetails = [];
        for (const pId of team.players) {
          const pDoc = await getDoc(doc(firestore, `users/${pId}`));
          if (pDoc.exists()) {
            playerDetails.push({ id: pDoc.id, ...pDoc.data() });
          }
        }
        setFootballTeamData({ ...team, playerDetails });
        setSelectedFootballPlayers(team.coachId === auth.currentUser.uid ? [] : [auth.currentUser.uid]);
        setShowFootballRosterSelection(true);
        setIsParticipating(false);
        return;
      }

      // Pickleball Doubles Team Check
      if (!isSingles && !payForTeamKey && sport === "pickleball") {
        const team = await getUserTeam(auth.currentUser.uid, "Pickleball");
        if (!team) {
          alert("You must create or join a Pickleball team first.");
          setIsParticipating(false);
          return;
        }
        if (team.players.length < 2) {
          alert("Your Pickleball team must have 2 players to register for a doubles tournament.");
          setIsParticipating(false);
          return;
        }
        // Fetch player details to embed in roster
        const playerDetails = [];
        for (const pId of team.players) {
          const pDoc = await getDoc(doc(firestore, `users/${pId}`));
          if (pDoc.exists()) {
            playerDetails.push({ id: pDoc.id, ...pDoc.data() });
          }
        }
        pickleballTeam = { ...team, playerDetails };
      }
      
      // Calculate fee
      let numericFee = 0;
      if (tournament?.entryFee) {
        // Strip out non-numeric characters except the decimal point
        const parsed = parseFloat(tournament.entryFee.replace(/[^\d.]/g, ""));
        if (!isNaN(parsed)) {
          numericFee = parsed;
        }
      }
      
      if (!isSingles && sport === "pickleball") {
         numericFee = numericFee / 2; // Split payment
      }

      // Proceed to Razorpay if fee > 0
      if (numericFee > 0) {
        // Razorpay expects amount in the smallest currency unit (e.g., paisa = rupees * 100)
        // We round it to avoid floating point precision issues (e.g. 10.05 * 100 = 1004.9999999999999)
        const amountInPaisa = Math.round(numericFee * 100);

        const res = await fetch("/api/razorpay/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amountInPaisa }) // amount in paisa
        });
        
        if (!res.ok) {
          throw new Error("Failed to create Razorpay order");
        }
        
        const data = await res.json();
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: data.order.amount,
          currency: data.order.currency,
          name: "Cricket Overlay",
          description: `Entry fee for ${tournament?.name}`,
          order_id: data.order.id,
          handler: async function (response: any) {
            // Payment success handler
            await finalizeParticipation(userData, pickleballTeam);
          },
          prefill: {
            name: userData.name,
            email: auth!.currentUser!.email || "",
          },
          theme: {
            color: "#ed1c24", 
          },
        };
        
        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
           console.error(response.error);
           alert("Payment Failed: " + response.error.description);
           setIsParticipating(false);
        });
        rzp.open();
      } else {
        // No fee or invalid fee, just participate directly
        await finalizeParticipation(userData, pickleballTeam);
      }
    } catch (err) {
      console.error("Error participating:", err);
      alert("An error occurred while preparing the checkout.");
      setIsParticipating(false);
    }
  };

  const getRequiredTeamSize = () => {
    if (tournament?.settings?.maxPlayersPerTeam) return Number(tournament.settings.maxPlayersPerTeam);
    if (tournament?.settings?.format) {
      const match = tournament.settings.format.match(/(\d+)v\d+/i);
      if (match) return parseInt(match[1]);
    }
    return 11;
  };

  const proceedWithFootballPayment = async () => {
    const requiredSize = getRequiredTeamSize();
    if (selectedFootballPlayers.length !== requiredSize) {
      alert(`You must select exactly ${requiredSize} players for this tournament format.`);
      return;
    }
    setShowFootballRosterSelection(false);
    setIsParticipating(true);
    try {
      const userDoc = await getDoc(doc(firestore, `users/${auth!.currentUser!.uid}`));
      const userData = userDoc.data();
      
      let numericFee = 0;
      if (tournament?.entryFee) {
        const parsed = parseFloat(tournament.entryFee.replace(/[^\d.]/g, ""));
        if (!isNaN(parsed)) {
          numericFee = parsed;
        }
      }
      
      const isCoach = footballTeamData?.coachId === auth!.currentUser!.uid;

      if (numericFee > 0 && selectedFootballPlayers.length > 0) {
        numericFee = numericFee / selectedFootballPlayers.length;
      }
      
      if (numericFee > 0 && !isCoach) {
        const amountInPaisa = Math.round(numericFee * 100);
        const res = await fetch("/api/razorpay/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amountInPaisa })
        });
        
        if (!res.ok) throw new Error("Failed to create Razorpay order");
        const data = await res.json();
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: data.order.amount,
          currency: data.order.currency,
          name: "Kixxi",
          description: `Entry fee for ${tournament?.name}`,
          order_id: data.order.id,
          handler: async function (response: any) {
            await finalizeParticipation(userData, null);
          },
          prefill: {
            name: userData?.name,
            email: auth!.currentUser!.email || "",
          },
          theme: { color: "#ed1c24" },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
           alert("Payment Failed: " + response.error.description);
           setIsParticipating(false);
        });
        rzp.open();
      } else {
        await finalizeParticipation(userData, null);
      }
    } catch (err) {
      console.error(err);
      alert("Error processing payment.");
      setIsParticipating(false);
    }
  };

  const isAlreadyParticipating = teamList.some(t => 
    t.userId === auth?.currentUser?.uid || t.roster?.some((r: any) => r.userId === auth?.currentUser?.uid)
  );
  const isFull = teamList.length >= parseInt(tournament?.maxTeams || "16");

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "registering":
        return "bg-primary text-white";
      case "ongoing":
        return "bg-emerald-500 text-white";
      case "completed":
        return "bg-surface-variant text-on-surface-variant";
      case "upcoming":
      default:
        return "bg-surface-dim border border-outline text-on-surface";
    }
  };

  const isSelectedTeamOwn = Boolean(selectedTeam && auth?.currentUser && (
    selectedTeam.userId === auth.currentUser.uid || 
    selectedTeam.roster?.some((p: any) => p.userId === auth?.currentUser?.uid)
  ));

  return (
    <AppShell>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      {/* Hero Section */}
      <div className="relative w-full bg-surface-dim border-b border-outline">
        {tournament.bannerUrl && (
          <div className="absolute inset-0 z-0 overflow-hidden">
            <img
              src={tournament.bannerUrl}
              alt={tournament.name}
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          </div>
        )}
        
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-12 md:py-20 flex flex-col items-start gap-6">
          <Link
            href="/tournaments"
            className="text-sm font-bold text-on-surface-variant hover:text-primary flex items-center gap-2 mb-2 transition-colors bg-surface/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-outline/50"
          >
            <ArrowLeft size={16} /> Back to Hub
          </Link>
          
          <div className="flex flex-wrap items-center gap-4">
            <span
              className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full ${getStatusColor(
                tournament.status || "Upcoming"
              )}`}
            >
              {tournament.status || "Upcoming"}
            </span>
            <span className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-inverse-surface text-inverse-on-surface">
              {sport}
            </span>
          </div>

          <div>
            <h1 className="text-4xl md:text-6xl font-black text-on-surface tracking-tight mb-4">
              {tournament.name}
            </h1>
            
            <div className="flex flex-wrap items-center gap-6 text-on-surface-variant font-medium">
              {tournament.startDate && (
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-primary" />
                  <span>{tournament.startDate}</span>
                </div>
              )}
              {tournament.location && (
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-primary" />
                  <span>{tournament.location}</span>
                </div>
              )}
              {tournament.skillLevel && (
                <div className="flex items-center gap-2">
                  <Award size={18} className="text-primary" />
                  <span>{tournament.skillLevel} Division</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-4">
            {tournament.entryFee && (
              <div className="bg-surface/80 backdrop-blur-md border border-outline rounded-xl px-5 py-3 flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                  {payForTeamKey ? "Your Share" : "Entry Fee"}
                </span>
                <span className="text-xl font-black text-primary">
                  ₹{payForTeamKey && !isNaN(parseFloat(tournament.entryFee.replace(/[^\d.]/g, "")))
                      ? (parseFloat(tournament.entryFee.replace(/[^\d.]/g, "")) / ((tournament?.teams?.[payForTeamKey] as any)?.totalFeeSplits || 2))
                      : tournament.entryFee}
                </span>
              </div>
            )}
            <div className="bg-surface/80 backdrop-blur-md border border-outline rounded-xl px-5 py-3 flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">{isSingles ? "Players" : "Teams"}</span>
              <span className="text-xl font-black text-on-surface">
                {teamList.length} <span className="text-base text-on-surface-variant font-medium">/ {tournament.maxTeams || "16"}</span>
              </span>
            </div>
            {(!isAlreadyParticipating && !isFull || payForTeamKey) && (
              <button
                onClick={handleParticipate}
                disabled={isParticipating}
                className="bg-primary hover:bg-primary-container text-white px-6 py-4 rounded-xl font-black transition-colors self-stretch flex items-center"
              >
                {isParticipating ? "Processing..." : (payForTeamKey ? "Pay your share now" : "Participate Now")}
              </button>
            )}
            {(isAlreadyParticipating && !payForTeamKey) && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 px-6 py-4 rounded-xl font-black self-stretch flex items-center">
                You are participating
              </div>
            )}
            {(isFull && !isAlreadyParticipating) && (
              <div className="bg-surface-variant border border-outline text-on-surface-variant px-6 py-4 rounded-xl font-black self-stretch flex items-center">
                Tournament is full
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl w-full px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-on-surface flex items-center gap-3">
            <Users2 className="text-primary" size={24} /> 
            {isSingles ? "Participating Players" : "Participating Teams"}
          </h2>
          <span className="bg-surface-variant text-on-surface-variant px-3 py-1 rounded-full text-sm font-bold">
            {teamList.length} Registered
          </span>
        </div>

        {teamList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline bg-surface-dim p-12 text-center text-on-surface-variant">
            <Trophy className="mx-auto mb-4 opacity-50" size={48} />
            <h3 className="text-xl font-black mb-2 text-on-surface">{isSingles ? "No players registered yet" : "No teams registered yet"}</h3>
            <p>Registration might be opening soon. Check back later to see the participating {isSingles ? "players" : "teams"}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamList.map((team) => (
              <button
                key={team.id}
                onClick={() => {
                  if (isSingles && team.userId) {
                    setSelectedUserId(team.userId);
                  } else {
                    setSelectedTeam(team);
                  }
                }}
                className={`group flex flex-col bg-surface border border-outline transition-all duration-300 rounded-2xl p-6 text-left relative overflow-hidden shadow-sm hover:bg-surface-dim hover:border-primary hover:shadow-md cursor-pointer`}
              >
                <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: team.color || "#ef4444" }} />
                
                <div className="flex items-center gap-5 ml-2">
                  {team.logo ? (
                    <img
                      src={team.logo}
                      alt={team.name}
                      className="h-16 w-16 rounded-full border border-outline object-cover shadow-sm bg-surface-variant shrink-0"
                    />
                  ) : (
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-full border border-outline bg-surface-variant text-xl font-black shadow-sm text-white shrink-0"
                      style={{ backgroundColor: team.color || "#ef4444" }}
                    >
                      {team.name.substring(0, 3).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-xl text-on-surface truncate group-hover:text-primary transition-colors">
                      {team.name}
                    </h3>
                    {!isSingles && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-on-surface-variant font-medium">
                        <Users size={16} />
                        <span>{team.roster?.length || 0} Players</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Player Profile Modal */}
      {selectedUserId && (
        <PlayerProfileModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}

      {/* Football Player Selection Modal */}
      {showFootballRosterSelection && footballTeamData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-outline rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-outline flex items-center justify-between">
               <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter text-on-surface">Select Roster</h2>
                  <p className="text-xs font-bold text-on-surface-variant mt-1">Select exactly {getRequiredTeamSize()} players for {tournament?.settings?.format || "this match"}.</p>
               </div>
               <button onClick={() => setShowFootballRosterSelection(false)} className="text-on-surface-variant hover:text-primary">
                 <X size={24} />
               </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-3">
                 {footballTeamData.playerDetails.map((player: any) => {
                    const isSelected = selectedFootballPlayers.includes(player.id);
                    const isSelf = player.id === auth?.currentUser?.uid;
                    
                    return (
                      <div 
                        key={player.id} 
                        onClick={() => {
                          if (isSelf) return; // cannot deselect self
                          setSelectedFootballPlayers(prev => 
                            prev.includes(player.id)
                              ? prev.filter(id => id !== player.id)
                              : [...prev, player.id]
                          );
                        }}
                        className={`flex items-center gap-4 p-4 rounded-xl border transition-colors cursor-pointer ${
                          isSelected 
                            ? "bg-primary/5 border-primary/30" 
                            : "bg-surface-dim border-outline hover:border-primary/50"
                        } ${isSelf ? "opacity-75 cursor-not-allowed" : ""}`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                          isSelected ? "bg-primary border-primary" : "border-outline bg-surface"
                        }`}>
                          {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                        </div>
                        {player.photoURL ? (
                           <img src={player.photoURL} alt={player.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                           <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center font-bold text-primary text-sm">
                             {player.name?.[0]?.toUpperCase() || "?"}
                           </div>
                        )}
                        <div className="flex-1">
                          <p className="font-bold text-sm text-on-surface">{player.name}</p>
                          <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">{isSelf ? "Captain (Required)" : "Player"}</p>
                        </div>
                      </div>
                    );
                 })}
              </div>
            </div>
            <div className="p-6 border-t border-outline bg-surface-dim flex items-center justify-between">
              <span className="text-sm font-black uppercase tracking-widest text-on-surface-variant">
                <span className={selectedFootballPlayers.length === getRequiredTeamSize() ? "text-primary" : ""}>
                  {selectedFootballPlayers.length}
                </span> / {getRequiredTeamSize()} Selected
              </span>
              <button 
                onClick={proceedWithFootballPayment}
                disabled={selectedFootballPlayers.length !== getRequiredTeamSize() || isParticipating}
                className="bg-primary hover:bg-primary-container text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest transition-colors disabled:opacity-50"
              >
                {isParticipating ? "Processing..." : "Proceed"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Roster Popup Modal (For non-singles without userId profile) */}
      {selectedTeam && !selectedUserId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedTeam(null)}
          />
          <div className="relative w-full max-w-lg bg-surface rounded-2xl shadow-2xl border border-outline flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 flex items-center justify-between border-b border-outline bg-surface-dim rounded-t-2xl">
              <div className="flex items-center gap-4">
                 {selectedTeam.logo ? (
                    <img
                      src={selectedTeam.logo}
                      alt={selectedTeam.name}
                      className="h-12 w-12 rounded-full border border-outline object-cover bg-surface shrink-0"
                    />
                  ) : (
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-full border border-outline bg-surface text-sm font-black text-white shrink-0"
                      style={{ backgroundColor: selectedTeam.color || "#ef4444" }}
                    >
                      {selectedTeam.name.substring(0, 3).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="text-2xl font-black text-on-surface">{selectedTeam.name}</h3>
                    <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">
                      Team Roster
                    </p>
                  </div>
              </div>
              <button
                onClick={() => setSelectedTeam(null)}
                className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto">
              {!selectedTeam.roster || selectedTeam.roster.length === 0 ? (
                <div className="text-center py-12 text-on-surface-variant">
                  <Users2 size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No players have been assigned to this team&apos;s roster yet.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {selectedTeam.roster.map((player: any, idx: number) => (
                    <li 
                      key={idx} 
                      onClick={() => {
                        if (player.userId) {
                           setSelectedUserId(player.userId);
                        }
                      }}
                      className="flex items-center justify-between p-4 rounded-xl border border-outline hover:border-primary/50 transition-colors bg-surface-dim cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-primary w-6 text-center">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-on-surface text-lg group-hover:text-primary transition-colors">{player.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSelectedTeamOwn && tournament?.entryFee && (
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            (selectedTeam as any).paymentStatus === "partial" && (selectedTeam as any).pendingPaymentFrom === player.userId 
                              ? "bg-rose-500/10 text-rose-500 border border-rose-500/30" 
                              : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                          }`}>
                            {(selectedTeam as any).paymentStatus === "partial" && (selectedTeam as any).pendingPaymentFrom === player.userId ? "Unpaid" : "Paid"}
                          </span>
                        )}
                        <span className="text-xs font-black uppercase tracking-widest px-3 py-1 bg-surface rounded-full border border-outline-variant text-on-surface-variant">
                          {player.role}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t border-outline bg-surface-dim rounded-b-2xl flex justify-end">
              <button
                onClick={() => setSelectedTeam(null)}
                className="px-6 py-2 bg-inverse-surface text-white hover:bg-surface-variant hover:text-on-surface rounded-lg font-black transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
