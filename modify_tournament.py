import re

with open("app/tournaments/[sport]/[tournamentId]/page.tsx", "r") as f:
    content = f.read()

# Imports
content = content.replace(
    'import { PlayerProfileModal } from "@/components/PlayerProfileModal";',
    'import { PlayerProfileModal } from "@/components/PlayerProfileModal";\nimport { useSearchParams } from "next/navigation";\nimport { getUserTeam, sendNotification } from "@/lib/teamUtils";\nimport { update } from "firebase/database";'
)

# Component State & Hook
content = content.replace(
    '  const [isParticipating, setIsParticipating] = useState(false);',
    '  const [isParticipating, setIsParticipating] = useState(false);\n  const searchParams = useSearchParams();\n  const payForTeamKey = searchParams.get("payForTeam");'
)

# finalizeParticipation
old_finalize = """  const finalizeParticipation = async (userData: any) => {
    try {
      const dbPath =
        sport === "football"
          ? `football/tournaments/${tournamentId}`
          : sport === "pickleball"
          ? `pickleball/tournaments/${tournamentId}`
          : `tournaments/${tournamentId}`;
          
      const newTeamRef = push(dbRef(db, `${dbPath}/teams`));
      
      const newTeam: Omit<Team, "id"> = {
        name: isSingles ? (userData.name || "Unknown") : `${userData.name}'s Team`,
        logo: userData.photoURL || null,
        userId: auth!.currentUser!.uid,
      };
      
      if (!isSingles) {
        newTeam.roster = [{ name: userData.name || "Unknown", role: "Captain" }];
      }
      
      await set(newTeamRef, newTeam);
      
    } catch (err) {
      console.error("Error saving team:", err);
      alert("An error occurred while joining the tournament. Please contact admin.");
    } finally {
      setIsParticipating(false);
    }
  };"""

new_finalize = """  const finalizeParticipation = async (userData: any, pickleballTeam?: any) => {
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
            message: `${userData.name} completed the payment. Your team is fully registered for ${tournament?.name}!`,
            type: "general"
          });
        }
        
        alert("Registration confirmed! Your team is now enrolled.");
      } else {
        const newTeamRef = push(dbRef(db, `${dbPath}/teams`));
        
        const newTeam: any = {
          name: isSingles ? (userData.name || "Unknown") : (pickleballTeam ? pickleballTeam.name : `${userData.name}'s Team`),
          logo: (pickleballTeam && pickleballTeam.logoURL) ? pickleballTeam.logoURL : (userData.photoURL || null),
          userId: auth!.currentUser!.uid,
        };
        
        if (!isSingles && pickleballTeam && pickleballTeam.playerDetails) {
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
  };"""

content = content.replace(old_finalize, new_finalize)

# handleParticipate
old_handle = """  const handleParticipate = async () => {
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
      
      // Calculate fee
      let numericFee = 0;
      if (tournament?.entryFee) {
        // Strip out non-numeric characters except the decimal point
        const parsed = parseFloat(tournament.entryFee.replace(/[^\d.]/g, ""));
        if (!isNaN(parsed)) {
          numericFee = parsed;
        }
      }

      // Proceed to Razorpay if fee > 0
      if (numericFee > 0) {
        // Razorpay expects amount in the smallest currency unit (e.g., paisa = rupees * 100)
        // We round it to avoid floating point precision issues (e.g. 10.05 * 100 = 1004.9999999999999)
        const amountInPaisa = Math.round(numericFee * 100);"""

new_handle = """  const handleParticipate = async () => {
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
        const amountInPaisa = Math.round(numericFee * 100);"""

content = content.replace(old_handle, new_handle)

# Success callback
content = content.replace(
    'await finalizeParticipation(userData);',
    'await finalizeParticipation(userData, pickleballTeam);'
)

# Button UI logic
old_btn = """        {isAlreadyParticipating ? (
          <div className="bg-surface border border-outline rounded-xl p-6 text-center">
            <Trophy className="mx-auto text-primary mb-2" size={32} />
            <h3 className="font-black text-on-surface uppercase tracking-widest">You're In!</h3>
            <p className="text-on-surface-variant font-bold text-sm">You are registered for this tournament.</p>
          </div>
        ) : isFull ? (
          <div className="bg-surface border border-outline rounded-xl p-6 text-center">
            <Users2 className="mx-auto text-on-surface-variant mb-2" size={32} />
            <h3 className="font-black text-on-surface uppercase tracking-widest">Tournament Full</h3>
            <p className="text-on-surface-variant font-bold text-sm">Registration is closed.</p>
          </div>
        ) : ("""

new_btn = """        {isAlreadyParticipating && !payForTeamKey ? (
          <div className="bg-surface border border-outline rounded-xl p-6 text-center">
            <Trophy className="mx-auto text-primary mb-2" size={32} />
            <h3 className="font-black text-on-surface uppercase tracking-widest">You're In!</h3>
            <p className="text-on-surface-variant font-bold text-sm">You are registered for this tournament.</p>
          </div>
        ) : isFull && !payForTeamKey ? (
          <div className="bg-surface border border-outline rounded-xl p-6 text-center">
            <Users2 className="mx-auto text-on-surface-variant mb-2" size={32} />
            <h3 className="font-black text-on-surface uppercase tracking-widest">Tournament Full</h3>
            <p className="text-on-surface-variant font-bold text-sm">Registration is closed.</p>
          </div>
        ) : ("""

content = content.replace(old_btn, new_btn)

# Button text
content = content.replace(
    '{isParticipating ? "Processing..." : tournament?.entryFee ? `Pay ${tournament.entryFee} & Register` : "Register Now"}',
    '{isParticipating ? "Processing..." : payForTeamKey ? "Complete Registration Payment" : tournament?.entryFee ? `Pay ${!isSingles && sport === "pickleball" ? (parseFloat(tournament.entryFee.replace(/[^\\\\d.]/g, ""))/2) : tournament.entryFee} & Register` : "Register Now"}'
)


with open("app/tournaments/[sport]/[tournamentId]/page.tsx", "w") as f:
    f.write(content)
