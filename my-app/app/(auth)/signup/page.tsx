"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight, User, Mail, Lock, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";

// API Configuration
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE || "https://zynon.onrender.com/api/";

export default function SignupPage() {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({ username: "", email: "", password: "" });
    const [otp, setOtp] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resendSuccess, setResendSuccess] = useState(false);
    const [shouldShake, setShouldShake] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [progress, setProgress] = useState(0);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [resendTimer, setResendTimer] = useState(0);
    const [success, setSuccess] = useState(false);
    const [transitioning, setTransitioning] = useState(false);
    useEffect(() => {
        setMounted(true);
        const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    useEffect(() => {
        let timer: any;
        if (resendTimer > 0) {
            timer = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [resendTimer]);

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

    const sendVerification = async () => {
        const verifyRes = await fetch(`${BASE_URL}auth/send-email-verification`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: form.email }),
        });

        if (!verifyRes.ok) throw new Error("Could not send verification code.");
        setResendTimer(60);
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 3000);
    };

    const handleSignupSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const signupRes = await fetch(`${BASE_URL}auth/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            const signupData = await signupRes.json();
            const isUnverifiedError = signupData.message === "Account exists but email not verified";

            if (!signupRes.ok && !isUnverifiedError) {
                throw new Error(signupData.message || "Signup failed.");
            }

            await sendVerification();
            setStep(2);
        } catch (err: any) {
            triggerError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (resendTimer > 0 || loading) return;

        setLoading(true);
        setError(null);
        try {
            await sendVerification();
        } catch (err: any) {
            triggerError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Verify the Email OTP
            const verifyRes = await fetch(`${BASE_URL}auth/verify-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: form.email, otp }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.message || "Invalid code.");

            // 2. Automated Login Request
            const loginRes = await fetch(`${BASE_URL}auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    identifier: form.email,
                    password: form.password
                }),
            });

            const loginData = await loginRes.json();
            if (!loginRes.ok) throw new Error("Verification successful, but login failed.");

            // 3. Save Credentials
            localStorage.setItem("accessToken", loginData.accessToken);
            document.cookie = `session_token=${loginData.accessToken}; path=/; max-age=86400; SameSite=Lax`;

            // 4. Sequential Success Experience
            setSuccess(true); // Show "Verified"

            setTimeout(() => {
                setSuccess(false);
                setTransitioning(true); // Show "Heading to Profile"
            }, 1200);

            setTimeout(() => {
                window.location.href = "/createProfile";
            }, 3200);

        } catch (err: any) {
            triggerError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return null;

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#F2F2F2] dark:bg-[#000] transition-colors duration-1000 font-sans overflow-hidden">

            <div className="absolute inset-0 pointer-events-none opacity-[0.1] dark:opacity-[0.2]"
                style={{
                    backgroundImage: 'radial-gradient(#000 0.8px, transparent 0)',
                    backgroundSize: '24px 24px',
                    maskImage: `radial-gradient(circle 250px at ${mousePos.x}px ${mousePos.y}px, black, transparent)`
                }}
            />
            {/* Success Popup Overlay */}
            {success && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-white/20 dark:bg-black/20 backdrop-blur-md animate-in fade-in duration-500">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-10 rounded-[40px] shadow-2xl text-center space-y-4 scale-in-center">
                        <div className="w-16 h-16 bg-[#00D166]/10 text-[#00D166] rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 size={32} />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tighter dark:text-white uppercase">Verified.</h2>
                        <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest">Account Active</p>
                    </div>
                </div>
            )}

            {/* Transitioning Loader */}
            {transitioning && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-white/40 dark:bg-black/40 backdrop-blur-xl animate-in fade-in duration-500">
                    <div className="flex flex-col items-center gap-6">
                        <div className="relative w-12 h-12">
                            <div className="absolute inset-0 border-2 border-zinc-200 dark:border-zinc-800 rounded-full"></div>
                            <div className="absolute inset-0 border-2 border-[#FF3131] rounded-full border-t-transparent animate-spin"></div>
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-900 dark:text-white">Redirecting</h3>
                            <p className="text-xs font-medium text-zinc-500 animate-pulse">Heading to Create Profile section...</p>
                        </div>
                    </div>
                </div>
            )}
            <div className={`w-full max-w-[420px] z-10 space-y-4 transition-transform duration-500 ${shouldShake ? "animate-shake" : ""}`}>

                <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 p-8 rounded-[32px] shadow-sm">
                    <h1 className="text-4xl font-bold tracking-tighter text-zinc-900 dark:text-white mb-2">
                        {step === 1 ? "Welcome." : "Verify."}
                    </h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium tracking-tight">
                        {step === 1 ? "Create your profile to join." : `Code sent to ${form.email}`}
                    </p>
                </div>

                <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 p-8 rounded-[32px] shadow-sm relative overflow-hidden">

                    {error && (
                        <div className="absolute top-4 left-8 right-8 flex items-center gap-2 text-[#FF3131] animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">{error}</span>
                        </div>
                    )}

                    <div className={error ? "pt-6" : ""}>
                        {step === 1 ? (
                            <form onSubmit={handleSignupSubmit} className="space-y-6">
                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 ml-1">Username</label>
                                        <div className="relative group">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300 group-focus-within:text-[#FF3131] transition-colors" />
                                            <input name="username" required placeholder="User_ID" className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-sm outline-none focus:ring-1 focus:ring-[#FF3131]/20 transition-all text-zinc-900 dark:text-white" onChange={handleChange} />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 ml-1">Email</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300 group-focus-within:text-[#FF3131] transition-colors" />
                                            <input name="email" type="email" required placeholder="name@email.com" className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-sm outline-none focus:ring-1 focus:ring-[#FF3131]/20 transition-all text-zinc-900 dark:text-white" onChange={handleChange} />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 ml-1">Password</label>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300 group-focus-within:text-[#FF3131] transition-colors" />
                                            <input name="password" type={showPassword ? "text" : "password"} required placeholder="••••••••" className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl py-4 pl-12 pr-12 text-sm outline-none focus:ring-1 focus:ring-[#FF3131]/20 transition-all text-zinc-900 dark:text-white" onChange={handleChange} />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-[#FF3131] transition-colors">
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <button type="submit" disabled={loading} className="relative w-full bg-zinc-900 dark:bg-white text-white dark:text-black py-4.5 rounded-2xl text-sm font-bold uppercase tracking-widest overflow-hidden transition-all active:scale-[0.98]">
                                    {loading && <div className="absolute inset-0 bg-[#FF3131]/20 transition-all duration-300" style={{ width: `${progress}%` }} />}
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        {loading ? "Processing..." : <>Continue <ArrowRight size={16} /></>}
                                    </span>
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyOtp} className="space-y-8 animate-in fade-in slide-in-from-right-4">
                                <div className="space-y-4 text-center">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">Enter OTP</label>
                                    <input
                                        type="text" maxLength={6} autoFocus value={otp}
                                        onChange={(e) => { if (error) setError(null); setOtp(e.target.value.replace(/\D/g, "")); }}
                                        className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-6 text-center text-3xl font-bold tracking-[0.4em] outline-none focus:ring-1 focus:ring-[#FF3131] transition-all text-zinc-900 dark:text-white"
                                    />
                                </div>
                                <button type="submit" disabled={loading || otp.length < 6} className="relative w-full bg-zinc-900 dark:bg-white text-white dark:text-black py-4.5 rounded-2xl text-sm font-bold uppercase tracking-widest overflow-hidden transition-all active:scale-[0.98] disabled:opacity-30">
                                    {loading && <div className="absolute inset-0 bg-[#FF3131]/20 transition-all duration-300" style={{ width: `${progress}%` }} />}
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        {loading ? "Verifying..." : <>Verify Email <ShieldCheck size={18} /></>}
                                    </span>
                                </button>
                                <button type="button" onClick={() => setStep(1)} className="w-full text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-[#FF3131] transition-colors">
                                    ← Back to Details
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 p-5 rounded-[24px] text-center relative">
                    {/* Success Notification */}
                    {resendSuccess && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#00D166] text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                            <CheckCircle2 size={12} /> CODE SENT
                        </div>
                    )}

                    <p className="text-xs font-medium text-zinc-500">
                        {step === 1 ? "Already have an account?" : "No code?"}{" "}
                        {step === 1 ? (
                            <Link href="/login" className="text-[#FF3131] font-bold hover:underline underline-offset-4 ml-1 uppercase tracking-tighter">
                                Sign In
                            </Link>
                        ) : (
                            <button
                                onClick={handleResendCode}
                                disabled={resendTimer > 0}
                                className={`font-bold uppercase tracking-tighter ml-1 transition-all ${resendTimer > 0 ? "text-zinc-300 cursor-not-allowed" : "text-[#FF3131] hover:underline underline-offset-4"}`}
                            >
                                {resendTimer > 0 ? `Wait ${resendTimer}s` : "Resend"}
                            </button>
                        )}
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
      `}</style>
        </div>
    );
}