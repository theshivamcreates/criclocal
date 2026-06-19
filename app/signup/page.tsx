"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerProUser, type ProUserRegistrationData } from "@/lib/firebaseAuth";
import imageCompression from "browser-image-compression";
import { ArrowRight, ArrowLeft, Camera, UploadCloud, Trophy, Users, Shield } from "lucide-react";
import { FirebaseNotice } from "@/components/FirebaseNotice";
import { auth } from "@/lib/firebase";
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
    gamePlayed: "",
    bio: "",
  });
  
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handleNext = () => {
    setError("");
    if (step === 1) {
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.phone || !formData.dob || !formData.primaryRole) {
        setError("Please fill all required fields in Step 1.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.gamePlayed) {
        setError("Please select the game you play.");
        return;
      }
      setStep(3);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);
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

    setLoading(true);
    setError("");

    try {
      // TODO: Replace with actual ImageKit upload logic
      // const formData = new FormData();
      // formData.append("file", photoFile);
      // formData.append("fileName", photoFile.name);
      // const res = await fetch("YOUR_IMAGEKIT_ENDPOINT", { method: "POST", body: formData });
      // const data = await res.json();
      // const uploadedUrl = data.url;

      const uploadedUrl = photoPreview || ""; // Placeholder since ImageKit isn't configured yet

      const proData: ProUserRegistrationData = {
        email: formData.email,
        password: formData.password,
        name: `${formData.firstName} ${formData.lastName}`,
        phone: formData.phone,
        dob: formData.dob,
        primaryRole: formData.primaryRole,
        gamePlayed: formData.gamePlayed,
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
    <main className="min-h-screen bg-inverse-surface flex font-sans text-on-primary">
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
            "The infrastructure separating amateurs from the elite. Join the definitive network for high-performance sports."
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
            <h2 className="font-display text-4xl font-black tracking-tight uppercase mb-3">
              {step === 1 ? "Initialize Profile" : step === 2 ? "Choose Your Arena" : "Final Polish"}
            </h2>
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
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-surface border border-outline text-on-surface px-4 py-3 outline-none focus:border-primary transition-colors text-sm"
                    placeholder="+1 (555) 000-0000"
                  />
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
                  <label className="block text-[10px] font-black tracking-widest uppercase text-on-surface-variant mb-3">Select Primary Sport</label>
                  <div className="grid grid-cols-1 gap-4">
                    {["Football", "Basketball", "Cricket"].map(game => (
                      <button
                        key={game}
                        type="button"
                        onClick={() => setFormData({...formData, gamePlayed: game})}
                        className={`flex items-center justify-between px-6 py-6 border ${formData.gamePlayed === game ? 'border-primary bg-primary/10 text-primary' : 'border-outline bg-surface text-on-surface-variant hover:bg-surface-variant'} transition-all`}
                      >
                        <span className="text-xl font-display font-black uppercase tracking-widest text-on-surface">{game}</span>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.gamePlayed === game ? 'border-primary' : 'border-outline'}`}>
                          {formData.gamePlayed === game && <div className="w-2 h-2 bg-primary rounded-full"></div>}
                        </div>
                      </button>
                    ))}
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
    </main>
  );
}
