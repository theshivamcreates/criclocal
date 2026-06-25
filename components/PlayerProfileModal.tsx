"use client";

import { useEffect, useState } from "react";
import { firestore } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { X, Activity, Shield } from "lucide-react";

interface Player {
  id: string;
  name: string;
  username?: string;
  photoURL?: string;
  primaryRole?: string;
  gamePlayed?: string[];
  bio?: string;
  dob?: string;
  footballPosition?: string;
  height?: string;
  weight?: string;
  footballSkill?: string;
  preferredFoot?: string;
  cricketRole?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  cricketSkill?: string;
  pickleballSkill?: string;
  paddleHand?: string;
  preferredSide?: string;
}

export function PlayerProfileModal({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlayer = async () => {
      try {
        if (!firestore) return;
        const userDoc = await getDoc(doc(firestore, `users/${userId}`));
        if (userDoc.exists()) {
          setPlayer({ id: userDoc.id, ...userDoc.data() } as Player);
        }
      } catch (err) {
        console.error("Error fetching player:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlayer();
  }, [userId]);

  const calculateAge = (dobString?: string) => {
    if (!dobString) return "N/A";
    const birthDate = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-surface p-6 rounded-2xl relative">
          <button onClick={onClose} className="absolute top-4 right-4"><X size={20} /></button>
          <p className="text-on-surface-variant font-bold mt-4">Player not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-2 hover:bg-primary transition-colors z-20"
        >
          <X size={20} />
        </button>

        <div className="overflow-y-auto w-full relative flex-1">
          {/* Modal Header/Banner */}
          <div className="h-32 bg-surface-dim border-b border-outline relative shrink-0">
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] mix-blend-overlay"></div>
          </div>

          <div className="px-8 pb-8 relative">
            {/* Profile Photo */}
            <div className="absolute -top-16 left-8">
              {player.photoURL ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={player.photoURL} alt={player.name} className="w-32 h-32 rounded-full border-[6px] border-surface object-cover bg-surface-dim shadow-md" />
              ) : (
                <div className="w-32 h-32 rounded-full border-[6px] border-surface bg-primary flex items-center justify-center text-white font-black text-5xl shadow-md">
                  {player.name ? player.name.charAt(0).toUpperCase() : "U"}
                </div>
              )}
            </div>

            {/* Primary Role Badge */}
            <div className="flex justify-end pt-4 mb-8">
              {player.primaryRole && (
                <span className="text-xs font-black uppercase tracking-widest bg-inverse-surface text-inverse-on-surface px-4 py-1.5 rounded-full flex items-center gap-1 shadow-sm">
                  {player.primaryRole === "Coach" ? <Shield size={14} /> : <Activity size={14} />}
                  {player.primaryRole}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="mt-8">
              <h3 className="font-display text-4xl font-black text-on-surface uppercase tracking-tight">
                {player.name}
              </h3>
              {player.username && (
                <p className="text-lg font-bold text-on-surface-variant mb-6">
                  @{player.username}
                </p>
              )}

              {/* Sports Tags */}
              {player.gamePlayed && player.gamePlayed.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {player.gamePlayed.map(sport => (
                    <span key={sport} className="text-xs font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1.5 rounded-md border border-primary/20">
                      {sport}
                    </span>
                  ))}
                </div>
              )}

              {player.bio && (
                <div className="mb-8">
                  <h4 className="text-sm font-bold text-on-surface-variant mb-2 uppercase tracking-wider">Bio</h4>
                  <p className="text-base text-on-surface leading-relaxed italic border-l-[3px] border-primary/30 pl-4 py-1 bg-surface-dim/50 rounded-r-lg">
                    &quot;{player.bio}&quot;
                  </p>
                </div>
              )}

              {/* Attributes Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-dim p-4 rounded-xl border border-outline">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Age</p>
                  <p className="text-lg font-black text-on-surface">{calculateAge(player.dob)}</p>
                </div>

                {player.gamePlayed?.includes("Football") && (
                  <>
                    {player.footballPosition && (
                      <div className="bg-surface-dim p-4 rounded-xl border border-outline">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Position</p>
                        <p className="text-lg font-black text-on-surface">{player.footballPosition}</p>
                      </div>
                    )}

                    {(player.height || player.weight) && (
                      <div className="bg-surface-dim p-4 rounded-xl border border-outline">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Physical</p>
                        <p className="text-lg font-black text-on-surface">
                          {player.height ? `${player.height}cm` : '--'} / {player.weight ? `${player.weight}kg` : '--'}
                        </p>
                      </div>
                    )}

                    {player.preferredFoot && (
                      <div className="bg-surface-dim p-4 rounded-xl border border-outline">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Foot</p>
                        <p className="text-lg font-black text-on-surface">{player.preferredFoot}</p>
                      </div>
                    )}

                    {player.footballSkill && (
                      <div className="bg-surface-dim p-4 rounded-xl border border-outline">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Skill</p>
                        <p className="text-lg font-black text-on-surface">{player.footballSkill}</p>
                      </div>
                    )}
                  </>
                )}

                {player.gamePlayed?.includes("Cricket") && (
                  <>
                    {player.cricketRole && (
                      <div className="bg-surface-dim p-4 rounded-xl border border-outline">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Role</p>
                        <p className="text-lg font-black text-on-surface">{player.cricketRole}</p>
                      </div>
                    )}

                    {player.battingStyle && (
                      <div className="bg-surface-dim p-4 rounded-xl border border-outline">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Batting</p>
                        <p className="text-lg font-black text-on-surface">{player.battingStyle}</p>
                      </div>
                    )}

                    {player.bowlingStyle && (
                      <div className="bg-surface-dim p-4 rounded-xl border border-outline">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Bowling</p>
                        <p className="text-lg font-black text-on-surface">{player.bowlingStyle}</p>
                      </div>
                    )}

                    {player.cricketSkill && (
                      <div className="bg-surface-dim p-4 rounded-xl border border-outline">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Skill</p>
                        <p className="text-lg font-black text-on-surface">{player.cricketSkill}</p>
                      </div>
                    )}
                  </>
                )}

                {player.gamePlayed?.includes("Pickleball") && (
                  <>
                    {player.pickleballSkill && (
                      <div className="bg-surface-dim p-4 rounded-xl border border-outline">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Rating</p>
                        <p className="text-lg font-black text-on-surface">{player.pickleballSkill}</p>
                      </div>
                    )}
                    
                    {player.paddleHand && (
                      <div className="bg-surface-dim p-4 rounded-xl border border-outline">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Hand</p>
                        <p className="text-lg font-black text-on-surface">{player.paddleHand}</p>
                      </div>
                    )}
                    
                    {player.preferredSide && (
                      <div className="bg-surface-dim p-4 rounded-xl border border-outline">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Preferred Side</p>
                        <p className="text-lg font-black text-on-surface">{player.preferredSide}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
