import re

with open("components/AppShell.tsx", "r") as f:
    content = f.read()

# Chunk 1
content = content.replace(
    "const [pendingRequests, setPendingRequests] = useState<any[]>([]);",
    "const [pendingRequests, setPendingRequests] = useState<any[]>([]);\n  const [pendingTeamRequests, setPendingTeamRequests] = useState<any[]>([]);\n  const [unreadNotifications, setUnreadNotifications] = useState<any[]>([]);"
)

# Chunk 2
content = content.replace(
    "let unsubRequests: () => void;\n    let unsubChats: () => void;",
    "let unsubRequests: () => void;\n    let unsubTeamRequests: () => void;\n    let unsubNotifications: () => void;\n    let unsubChats: () => void;"
)

# Chunk 3
chunk3_target = """          } else {
            setPendingRequests([]);
          }
        });

        // Subscribe to unread chats"""

chunk3_replacement = """          } else {
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

        // Subscribe to unread chats"""

content = content.replace(chunk3_target, chunk3_replacement)

# Chunk 4 (cleanup)
chunk4_target = """      } else {
        setIsAdmin(false);
        setGamePlayed([]);
        setPendingRequests([]);
        setUnreadChatsCount(0);
        if (unsubRequests) unsubRequests();
        if (unsubChats) unsubChats();
      }
    });
    
    return () => {
      unsubAuth();
      if (unsubRequests) unsubRequests();
      if (unsubChats) unsubChats();
    };"""

chunk4_replacement = """      } else {
        setIsAdmin(false);
        setGamePlayed([]);
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
    };"""

content = content.replace(chunk4_target, chunk4_replacement)

# Chunk 5 (UI)
chunk5_target = """                <Bell size={18} strokeWidth={2.5}/>
                {pendingRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-surface"></span>
                )}
              </button>
              
              {isBellOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-surface border border-outline rounded-xl shadow-lg z-50 p-4">
                  <h3 className="font-black text-sm uppercase tracking-widest text-on-surface-variant mb-3 border-b border-outline pb-2">Friend Requests</h3>
                  {pendingRequests.length === 0 ? ("""

chunk5_replacement = """                <Bell size={18} strokeWidth={2.5}/>
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
                          <div key={notif.id} className="bg-surface-variant p-3 rounded-lg flex justify-between items-start gap-2">
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
                  {pendingRequests.length === 0 && pendingTeamRequests.length === 0 && unreadNotifications.length === 0 ? ("""

content = content.replace(chunk5_target, chunk5_replacement)

with open("components/AppShell.tsx", "w") as f:
    f.write(content)
