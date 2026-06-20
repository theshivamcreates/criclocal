"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerProUser, type ProUserRegistrationData } from "@/lib/firebaseAuth";
import imageCompression from "browser-image-compression";
import { ArrowRight, ArrowLeft, Camera, UploadCloud, Trophy, Users, Shield } from "lucide-react";
import { FirebaseNotice } from "@/components/FirebaseNotice";
import { AppShell } from "@/components/AppShell";
import { uploadToImageKit } from "@/lib/imagekitUpload";
import { ProfilePhotoCropper } from "@/components/ProfilePhotoCropper";
import { auth } from "@/lib/firebase";
import { checkUsernameUnique } from "@/lib/firebaseAuth";
import { onAuthStateChanged } from "firebase/auth";

export default function SignupPage() {
  const router = useRouter();
  
  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/");
      }
    });
    return unsub;
  }, [router]);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Form State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    dob: "",
    primaryRole: "",
    referralCode: "",
    gamePlayed: [] as string[],
    username: "",
    bio: "",
  });
  
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [rawPhotoUrl, setRawPhotoUrl] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  
  useEffect(() => {
    if (formData.username.trim() === "") {
      setUsernameStatus("idle");
      return;
    }
    const check = async () => {
      setUsernameStatus("checking");
      try {
        const isUnique = await checkUsernameUnique(formData.username.trim());
        setUsernameStatus(isUnique ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    };
    const timeout = setTimeout(check, 500);
    return () => clearTimeout(timeout);
  }, [formData.username]);

  const handleNext = () => {
    setError("");
    if (step === 1) {
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.phone || !formData.dob || !formData.primaryRole) {
        setError("Please fill all required fields in Step 1.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.gamePlayed || formData.gamePlayed.length === 0) {
        setError("Please select at least one sport you play.");
        return;
      }
      setStep(3);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setRawPhotoUrl(url);
  };

  const handleCropComplete = async (croppedFile: File) => {
    setRawPhotoUrl(null);
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(croppedFile, options);
      setPhotoFile(compressedFile);
      setPhotoPreview(URL.createObjectURL(compressedFile));
    } catch (err) {
      console.error(err);
      setError("Failed to compress image.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 3) return;
    if (!photoFile) {
      setError("Profile photo is required.");
      return;
    }
    if (!formData.username.trim() || usernameStatus === "taken") {
      setError("Please choose a valid and available username.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let uploadedUrl = photoPreview || "";

      // Only upload if it's a real file (not the dummy initial state)
      if (photoFile) {
        try {
          uploadedUrl = await uploadToImageKit(photoFile, `profile_${formData.firstName}_${Date.now()}.jpg`);
        } catch (uploadErr: any) {
          setError(`Image Upload Failed: ${uploadErr.message}`);
          setLoading(false);
          return;
        }
      }

      const proData: ProUserRegistrationData = {
        email: formData.email,
        password: formData.password,
        name: `${formData.firstName} ${formData.lastName}`,
        phone: formData.phone,
        dob: formData.dob,
        primaryRole: formData.primaryRole,
        gamePlayed: formData.gamePlayed,
        username: formData.username.trim(),
        bio: formData.bio,
        photoURL: uploadedUrl,
        referralCode: formData.referralCode,
      };

      await registerProUser(proData);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      {rawPhotoUrl && (
        <ProfilePhotoCropper
          imageSrc={rawPhotoUrl}
          onCropComplete={handleCropComplete}
          onCancel={() => setRawPhotoUrl(null)}
        />
      )}
      <div className="flex-1 bg-inverse-surface flex font-sans text-on-primary min-h-[calc(100vh-4rem)] w-full">
        <FirebaseNotice />
        
        {/* Left Panel - Branding (Hidden on mobile) */}
        <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-12 overflow-hidden border-r border-outline-variant">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1518605368461-1e1e1273919e?q=80&w=2000" 
            alt="" 
            className="w-full h-full object-cover opacity-30 grayscale"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-inverse-surface via-inverse-surface/80 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface via-transparent to-transparent"></div>
        </div>

        <div className="relative z-10">
          <Link href="/" className="inline-block">
            <span className="font-display text-4xl font-black italic tracking-tighter text-primary">
              KIX XI
            </span>
          </Link>
          <p className="text-xs font-black tracking-[0.2em] uppercase mt-2 text-inverse-on-surface opacity-80">Pro Registration</p>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="font-display text-7xl font-black leading-[0.9] tracking-tighter mb-6 uppercase">
            Enter<br/>The<br/>Arena.
          </h1>
          <p className="text-lg text-inverse-on-surface opacity-80 font-medium leading-relaxed">
            &quot;The infrastructure separating amateurs from the elite. Join the definitive network for high-performance sports.&quot;
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 sm:p-12 md:p-20 overflow-y-auto bg-surface-variant">
        <div className="max-w-md w-full mx-auto">
          
          {/* Progress Indicator */}
          <div className="mb-12">
            <div className="flex justify-between text-[10px] font-black tracking-widest uppercase mb-3 text-on-surface-variant">
              <span>{step === 1 ? "Personal Details" : step === 2 ? "Game Selection" : "Profile Setup"}</span>
              <span>Step {step} / 3</span>
            </div>
            <div className="flex gap-2 h-1.5">
              <div className={`flex-1 ${step >= 1 ? "bg-primary" : "bg-outline"}`}></div>
              <div className={`flex-1 ${step >= 2 ? "bg-primary" : "bg-outline"}`}></div>
              <div className={`flex-1 ${step >= 3 ? "bg-primary" : "bg-outline"}`}></div>
            </div>
          </div>

          <div className="mb-10 text-on-surface">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-3 gap-2">
              <h2 className="font-display text-4xl font-black tracking-tight uppercase">
                {step === 1 ? "Initialize Profile" : step === 2 ? "Choose Your Arena" : "Final Polish"}
              </h2>
              {step === 1 && (
                <Link href="/auth" className="text-xs font-bold text-primary hover:underline uppercase tracking-wider mb-2">
                  Or Sign In
                </Link>
              )}
            </div>
            <p className="text-sm text-on-surface-variant">
              {step === 1 ? "Establish your core identity within the network." : step === 2 ? "Select your primary sport to tailor your experience." : "Add a photo and bio to stand out to scouts and clubs."}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-error-container text-on-error-container text-sm font-bold border border-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* STEP 1: PERSONAL DETAILS */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black tracking-widest uppercase text-on-surface-variant mb-2">First Name</label>
                    <input 
                      type="text" 
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      className="w-full bg-surface border border-outline text-on-surface px-4 py-3 outline-none focus:border-primary transition-colors text-sm"
                      placeholder="e.g. Marcus"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black tracking-widest uppercase text-on-surface-variant mb-2">Last Name</label>
                    <input 
                      type="text" 
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      className="w-full bg-surface border border-outline text-on-surface px-4 py-3 outline-none focus:border-primary transition-colors text-sm"
                      placeholder="e.g. Rashford"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black tracking-widest uppercase text-on-surface-variant mb-2">Email Address</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-surface border border-outline text-on-surface px-4 py-3 outline-none focus:border-primary transition-colors text-sm"
                    placeholder="player@domain.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black tracking-widest uppercase text-on-surface-variant mb-2">Password</label>
                    <input 
                      type="password" 
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full bg-surface border border-outline text-on-surface px-4 py-3 outline-none focus:border-primary transition-colors text-sm"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black tracking-widest uppercase text-on-surface-variant mb-2">Date of Birth</label>
                    <input 
                      type="date" 
                      value={formData.dob}
                      onChange={(e) => setFormData({...formData, dob: e.target.value})}
                      className="w-full bg-surface border border-outline text-on-surface px-4 py-3 outline-none focus:border-primary transition-colors text-sm uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black tracking-widest uppercase text-on-surface-variant mb-2">Phone Number</label>
                  <div className="flex w-full bg-surface border border-outline focus-within:border-primary transition-colors">
                    <span className="flex items-center px-4 py-3 text-on-surface-variant bg-surface-dim border-r border-outline font-bold text-sm">
                      +91
                    </span>
                    <input 
                      type="tel" 
                      value={formData.phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setFormData({...formData, phone: val});
                      }}
                      className="flex-1 bg-transparent text-on-surface px-4 py-3 outline-none text-sm"
                      placeholder="10 digit number"
                      maxLength={10}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black tracking-widest uppercase text-on-surface-variant mb-3">Primary Role</label>
                  <div className="grid grid-cols-3 gap-3">
                    {["Player", "Coach", "Sponsor"].map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setFormData({...formData, primaryRole: role})}
                        className={`flex flex-col items-center justify-center py-4 border ${formData.primaryRole === role ? 'border-primary bg-primary/10 text-primary' : 'border-outline bg-surface text-on-surface-variant hover:bg-surface-variant'} transition-all`}
                      >
                        {role === "Player" && <Users size={20} className="mb-2"/>}
                        {role === "Coach" && <Shield size={20} className="mb-2"/>}
                        {role === "Sponsor" && <Trophy size={20} className="mb-2"/>}
                        <span className="text-[10px] font-black uppercase tracking-widest">{role}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black tracking-widest uppercase text-on-surface-variant mb-2">Referral Code <span className="font-normal normal-case opacity-50">(Optional)</span></label>
                  <input 
                    type="text" 
                    value={formData.referralCode}
                    onChange={(e) => setFormData({...formData, referralCode: e.target.value})}
                    className="w-full bg-surface border border-outline text-on-surface px-4 py-3 outline-none focus:border-primary transition-colors text-sm"
                    placeholder="Enter code if you have one"
                  />
                </div>
              </div>
            )}

            {/* STEP 2: GAME SELECTION */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div>
                  <label className="block text-[10px] font-black tracking-widest uppercase text-on-surface-variant mb-3">Select Primary Sports</label>
                  <div className="grid grid-cols-1 gap-4">
                    {["Football", "Basketball", "Cricket"].map(game => {
                      const isSelected = formData.gamePlayed.includes(game);
                      return (
                        <button
                          key={game}
                          type="button"
                          onClick={() => {
                            const newGames = isSelected 
                              ? formData.gamePlayed.filter(g => g !== game)
                              : [...formData.gamePlayed, game];
                            setFormData({...formData, gamePlayed: newGames});
                          }}
                          className={`flex items-center justify-between px-6 py-6 border ${isSelected ? 'border-primary bg-primary/10 text-primary' : 'border-outline bg-surface text-on-surface-variant hover:bg-surface-variant'} transition-all`}
                        >
                          <span className="text-xl font-display font-black uppercase tracking-widest text-on-surface">{game}</span>
                          <div className={`w-5 h-5 rounded-sm border-2 flex items-center justify-center ${isSelected ? 'border-primary bg-primary text-on-primary' : 'border-outline'}`}>
                            {isSelected && <span className="text-[12px] font-black leading-none mt-0.5">✓</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: PROFILE SETUP */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <label className="block text-[10px] font-black tracking-widest uppercase text-on-surface-variant mb-2">Profile Photo</label>
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-surface border-2 border-outline flex items-center justify-center overflow-hidden shrink-0">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera size={32} className="text-on-surface-variant" />
                      )}
                    </div>
                    <label className="flex-1 cursor-pointer bg-surface border border-dashed border-outline hover:border-primary hover:bg-surface-variant transition-all px-4 py-6 flex flex-col items-center justify-center text-center">
                       <UploadCloud size={24} className="text-primary mb-2" />
                       <span className="text-xs font-bold text-on-surface mb-1">Click to upload photo</span>
                       <span className="text-[10px] text-on-surface-variant">Auto-compressed to save bandwidth</span>
                       <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black tracking-widest uppercase text-on-surface-variant mb-2">Username</label>
                  <input 
                    type="text" 
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()})}
                    className={`w-full bg-surface border text-on-surface px-4 py-3 outline-none transition-colors text-sm ${
                      usernameStatus === "taken" ? "border-red-500 focus:border-red-500" 
                      : usernameStatus === "available" ? "border-emerald-500 focus:border-emerald-500"
                      : "border-outline focus:border-primary"
                    }`}
                    placeholder="e.g. cr7_official"
                    maxLength={20}
                  />
                  {usernameStatus === "checking" && <p className="text-xs text-on-surface-variant mt-1">Checking availability...</p>}
                  {usernameStatus === "available" && <p className="text-xs text-emerald-500 mt-1">Username is available!</p>}
                  {usernameStatus === "taken" && <p className="text-xs text-red-500 mt-1">Username is already taken.</p>}
                </div>

                <div>
                  <label className="block text-[10px] font-black tracking-widest uppercase text-on-surface-variant mb-2">Player Bio</label>
                  <textarea 
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    rows={4}
                    className="w-full bg-surface border border-outline text-on-surface px-4 py-3 outline-none focus:border-primary transition-colors text-sm resize-none"
                    placeholder="Tell us about your athletic journey, current club, or goals..."
                  />
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="pt-8 mt-8 border-t border-outline flex gap-4">
              {step > 1 ? (
                 <button 
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="flex-1 border border-outline hover:bg-surface-variant text-on-surface font-bold uppercase tracking-widest text-xs py-4 flex items-center justify-center gap-2 transition-colors"
                >
                  <ArrowLeft size={16} /> Back
                </button>
              ) : (
                <Link href="/auth" className="flex-1 border border-outline hover:bg-surface-variant text-on-surface font-bold uppercase tracking-widest text-xs py-4 flex items-center justify-center gap-2 transition-colors">
                  <ArrowLeft size={16} /> Cancel
                </Link>
              )}

              {step < 3 ? (
                <button 
                  type="button"
                  onClick={handleNext}
                  className="flex-1 bg-primary text-on-primary font-bold uppercase tracking-widest text-xs py-4 flex items-center justify-center gap-2 hover:bg-primary-container transition-colors"
                >
                  Next Step <ArrowRight size={16} />
                </button>
              ) : (
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary text-on-primary font-bold uppercase tracking-widest text-xs py-4 flex items-center justify-center gap-2 hover:bg-primary-container transition-colors disabled:opacity-50"
                >
                  {loading ? "Registering..." : "Complete Setup"}
                </button>
              )}
            </div>

          </form>
        </div>
      </div>
      </div>
    </AppShell>
  );
}
