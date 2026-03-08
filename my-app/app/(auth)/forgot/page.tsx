"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight, Mail, Lock, ShieldCheck, AlertCircle, CheckCircle2, Loader2, RotateCcw } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE || "https://zynon.onrender.com/api/";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ email: "", otp: "", newPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  // New States: Timer and Strength
  const [timer, setTimer] = useState(0);
  const [strength, setStrength] = useState(0);

  useEffect(() => setMounted(true), []);

  // Timer Logic
  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Password Strength Logic
  useEffect(() => {
    const pwd = form.newPassword;
    let score = 0;
    if (pwd.length > 7) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    setStrength(score);
  }, [form.newPassword]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (error) setError(null);
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRequestOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (timer > 0) return;
    
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${BASE_URL}auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });

      if (!res.ok) throw new Error("Failed to send reset code.");

      setTimer(60); // Start 60s cooldown
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Reset failed.");
      setSuccess(true);
      setTimeout(() => { window.location.href = "/login"; }, 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F2F2F2] dark:bg-[#000] font-sans relative overflow-hidden">
      
      {/* Success Modal */}
      {success && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-white/20 dark:bg-black/20 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-10 rounded-[40px] shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 bg-[#00D166]/10 text-[#00D166] rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-bold tracking-tighter dark:text-white uppercase">Updated.</h2>
            <p className="text-zinc-500 text-sm font-medium">Password has been reset.</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-[420px] z-10 space-y-4">
        
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 p-8 rounded-[32px]">
          <h1 className="text-4xl font-bold tracking-tighter text-zinc-900 dark:text-white mb-2 italic">
            {step === 1 ? "Recovery." : "Reset."}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium tracking-tight">
            {step === 1 ? "Enter your email to receive a reset code." : `Code sent to ${form.email}`}
          </p>
        </div>

        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 p-8 rounded-[32px] relative">
          
          {error && (
            <div className="absolute top-4 left-8 right-8 flex items-center gap-2 text-[#FF3131] animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={14} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{error}</span>
            </div>
          )}

          <div className={error ? "pt-6" : ""}>
            {step === 1 ? (
              <form onSubmit={handleRequestOtp} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 ml-1">Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300 group-focus-within:text-[#FF3131] transition-colors" />
                    <input 
                      name="email" type="email" required placeholder="name@email.com" 
                      className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-sm outline-none focus:ring-1 focus:ring-[#FF3131]/20 transition-all text-zinc-900 dark:text-white" 
                      onChange={handleChange} 
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black py-4.5 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all active:scale-[0.98]">
                    {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Send Code"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex justify-between px-1">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">6-Digit Code</label>
                        <button 
                            type="button" 
                            disabled={timer > 0 || loading}
                            onClick={() => handleRequestOtp()}
                            className={`text-[10px] font-bold uppercase flex items-center gap-1 transition-colors ${timer > 0 ? 'text-zinc-300' : 'text-[#FF3131] hover:text-[#D12828]'}`}
                        >
                            <RotateCcw size={10} className={loading ? "animate-spin" : ""} />
                            {timer > 0 ? `Resend in ${timer}s` : "Resend Code"}
                        </button>
                    </div>
                    <div className="relative group">
                      <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300 group-focus-within:text-[#FF3131] transition-colors" />
                      <input 
                        name="otp" required placeholder="000000" maxLength={6}
                        className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-mono tracking-[0.3em] outline-none focus:ring-1 focus:ring-[#FF3131]/20 transition-all text-zinc-900 dark:text-white" 
                        onChange={handleChange} 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between px-1">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">New Password</label>
                        <span className="text-[9px] font-bold uppercase text-zinc-400">
                            {strength === 0 ? "" : strength === 4 ? "Strong" : "Weak"}
                        </span>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300 group-focus-within:text-[#FF3131] transition-colors" />
                      <input 
                        name="newPassword" type={showPassword ? "text" : "password"} required placeholder="••••••••" 
                        className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl py-4 pl-12 pr-12 text-sm outline-none focus:ring-1 focus:ring-[#FF3131]/20 transition-all text-zinc-900 dark:text-white" 
                        onChange={handleChange} 
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {/* Minimalist Strength Meter */}
                    <div className="flex gap-1 px-1 h-1">
                        {[1, 2, 3, 4].map((i) => (
                            <div 
                                key={i} 
                                className={`flex-1 rounded-full transition-all duration-500 ${strength >= i ? (strength > 3 ? 'bg-[#00D166]' : 'bg-[#FF3131]') : 'bg-zinc-100 dark:bg-zinc-800'}`} 
                            />
                        ))}
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={loading || strength < 2} className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black py-4.5 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-30">
                  {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Reset Password"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}