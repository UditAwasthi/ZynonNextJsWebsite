"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight, User, Lock, AlertCircle, CheckCircle2 } from "lucide-react";

// API Configuration
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE || "https://zynon.onrender.com/api/";

export default function LoginPage() {
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    let interval: any;
    if (loading) {
      setProgress(0);
      interval = setInterval(() => setProgress((p) => (p < 95 ? p + 2 : p)), 50);
    }
    return () => { clearInterval(interval); setProgress(0); };
  }, [loading]);

  const triggerError = (msg: string) => {
    setError(msg);
    setShouldShake(true);
    setTimeout(() => setShouldShake(false), 500);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (error) setError(null);
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BASE_URL}auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid credentials.");
      }

      // 1. EXTRACT TOKEN
      const token = data.data.accessToken;

      // 2. PERSISTENCE
      // Save to localStorage for client-side API calls
      localStorage.setItem("accessToken", token);

      // Save to Cookie for Server-side Rendering (SSR) and Middleware
      // If 'Remember Me' is off, we could set a shorter max-age, but 1 day is standard.
      const maxAge = rememberMe ? 60 * 60 * 24 * 7 : 60 * 60 * 24; // 7 days vs 1 day
      document.cookie = `accessToken=${token}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;

      // Trigger storage event for other components (like Navbars)
      window.dispatchEvent(new Event("storage"));

      // 3. SUCCESS STATE & REDIRECT
      setSuccess(true);

      // Delay to show the "Authenticated" popup before moving to dashboard
      setTimeout(() => {
        window.location.replace("/profile");
      }, 2000);

    } catch (err: any) {
      triggerError(err.message);
    } finally {
      setLoading(false);
    }
  };
  if (!mounted) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F2F2F2] dark:bg-[#000] transition-colors duration-1000 font-sans overflow-hidden relative">

      {/* Success Popup */}
      {success && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-white/20 dark:bg-black/20 backdrop-blur-md animate-in fade-in duration-500">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-10 rounded-[40px] shadow-2xl text-center space-y-4 scale-in-center">
            <div className="w-16 h-16 bg-[#00D166]/10 text-[#00D166] rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-bold tracking-tighter dark:text-white uppercase">Authenticated.</h2>
            <p className="text-zinc-500 text-sm font-medium">Redirecting you to the dashboard...</p>
          </div>
        </div>
      )}

      {/* Nothing Dot Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.1] dark:opacity-[0.2]"
        style={{
          backgroundImage: 'radial-gradient(#000 0.8px, transparent 0)',
          backgroundSize: '24px 24px',
          maskImage: `radial-gradient(circle 250px at ${mousePos.x}px ${mousePos.y}px, black, transparent)`
        }}
      />

      <div className={`w-full max-w-[400px] z-10 space-y-4 transition-transform duration-500 ${shouldShake ? "animate-shake" : ""}`}>

        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 p-8 rounded-[32px] shadow-sm">
          <h1 className="text-4xl font-bold tracking-tighter text-zinc-900 dark:text-white mb-2 italic">
            Zynon.
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium tracking-tight">
            Login with your account details.
          </p>
        </div>

        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 p-8 rounded-[32px] shadow-sm relative">

          {error && (
            <div className="absolute top-4 left-8 right-8 flex items-center gap-2 text-[#FF3131] animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={14} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{error}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className={`space-y-6 ${error ? "pt-6" : ""}`}>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 ml-1">Account</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300 group-focus-within:text-[#FF3131] transition-colors" />
                  <input
                    name="identifier" required placeholder="Email or Username"
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-sm outline-none focus:ring-1 focus:ring-[#FF3131]/20 transition-all text-zinc-900 dark:text-white"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Password</label>
                  <Link href="/forgot" className="text-[10px] font-bold uppercase tracking-wider text-[#FF3131]/60 hover:text-[#FF3131] transition-colors">Forgot?</Link>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300 group-focus-within:text-[#FF3131] transition-colors" />
                  <input
                    name="password" type={showPassword ? "text" : "password"} required placeholder="••••••••"
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl py-4 pl-12 pr-12 text-sm outline-none focus:ring-1 focus:ring-[#FF3131]/20 transition-all text-zinc-900 dark:text-white"
                    onChange={handleChange}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-[#FF3131] transition-colors">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Remember Me Toggle */}
              <div className="flex items-center gap-3 px-1 pt-1">
                <button
                  type="button"
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`w-8 h-4 rounded-full transition-colors relative ${rememberMe ? 'bg-[#FF3131]' : 'bg-zinc-200 dark:bg-zinc-800'}`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${rememberMe ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Remember session</span>
              </div>
            </div>

            <button type="submit" disabled={loading} className="relative w-full bg-zinc-900 dark:bg-white text-white dark:text-black py-4.5 rounded-2xl text-sm font-bold uppercase tracking-widest overflow-hidden transition-all active:scale-[0.98]">
              {loading && <div className="absolute inset-0 bg-[#FF3131]/20 transition-all duration-300" style={{ width: `${progress}%` }} />}
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? "Authenticating..." : <>Sign In <ArrowRight size={16} /></>}
              </span>
            </button>
          </form>
        </div>

        <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 p-5 rounded-[24px] text-center">
          <p className="text-xs font-medium text-zinc-500">
            New here?{" "}
            <Link href="/signup" className="text-[#FF3131] font-bold hover:underline underline-offset-4 ml-1 uppercase tracking-tighter">
              Create Profile
            </Link>
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          50% { transform: translateX(8px); }
          75% { transform: translateX(-8px); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
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