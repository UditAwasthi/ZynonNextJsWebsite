"use client";

import { useState, useEffect, useRef } from "react";
import { Camera, ArrowRight, User, PenTool, CheckCircle2, Loader2 } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE || "https://zynon.onrender.com/api/";

export default function CreateProfilePage() {
  const [form, setForm] = useState({ displayName: "", bio: "" });
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch(`${BASE_URL}user/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, avatar: image }),
      });

      if (!response.ok) throw new Error("Failed to save profile.");

      setSuccess(true);
      // setTimeout(() => window.location.href = "/dashboard", 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F2F2F2] dark:bg-[#000] font-sans overflow-hidden relative">
      
      {/* Success Modal */}
      {success && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-white/20 dark:bg-black/20 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-10 rounded-[40px] shadow-2xl text-center space-y-4 scale-in-center">
            <div className="w-16 h-16 bg-[#00D166]/10 text-[#00D166] rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-bold tracking-tighter dark:text-white uppercase">Profile Set.</h2>
            <p className="text-zinc-500 text-sm font-medium">Welcome to the inner circle.</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-[440px] z-10 space-y-4">
        
        {/* Header Section */}
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 p-8 rounded-[32px] shadow-sm">
          <h1 className="text-4xl font-bold tracking-tighter text-zinc-900 dark:text-white mb-2">
            Identity.
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium tracking-tight">
            How should the world see you?
          </p>
        </div>

        {/* Profile Setup Card */}
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 p-8 rounded-[32px] shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group relative w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-800 border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center cursor-pointer overflow-hidden transition-all hover:border-[#FF3131]"
              >
                {image ? (
                  <img src={image} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="text-zinc-400 group-hover:text-[#FF3131] transition-colors" size={28} />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-[10px] text-white font-bold uppercase tracking-wider">Change</span>
                </div>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Profile Picture</span>
            </div>

            <div className="space-y-5">
              {/* Display Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 ml-1">Display Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300 group-focus-within:text-[#FF3131] transition-colors" />
                  <input 
                    required placeholder="e.g. Ghost" 
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-sm outline-none focus:ring-1 focus:ring-[#FF3131]/20 transition-all text-zinc-900 dark:text-white" 
                    onChange={(e) => setForm({...form, displayName: e.target.value})}
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 ml-1">Bio</label>
                <div className="relative group">
                  <PenTool className="absolute left-4 top-4 h-4 w-4 text-zinc-300 group-focus-within:text-[#FF3131] transition-colors" />
                  <textarea 
                    placeholder="Tell us about yourself..." 
                    rows={3}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-sm outline-none focus:ring-1 focus:ring-[#FF3131]/20 transition-all text-zinc-900 dark:text-white resize-none" 
                    onChange={(e) => setForm({...form, bio: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="relative w-full bg-zinc-900 dark:bg-white text-white dark:text-black py-4.5 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="animate-spin" size={18} /> : <>Finish Setup <ArrowRight size={16} /></>}
              </span>
            </button>
          </form>
        </div>
      </div>

      <style jsx global>{`
        .scale-in-center {
          animation: scale-in-center 0.4s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
        }
        @keyframes scale-in-center {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}