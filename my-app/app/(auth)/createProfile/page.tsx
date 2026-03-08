"use client";
import api from "../../../src/lib/api";
import { useState, useEffect, useRef } from "react";
import {
    Camera, User, MapPin, Globe, Shield, Lock,
    ChevronRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2,
    MoreHorizontal
} from "lucide-react";



export default function CreateProfilePage() {
    const [step, setStep] = useState(1);
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingStage, setLoadingStage] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [form, setForm] = useState({
        name: "",
        bio: "",
        location: "",
        website: "",
        isPrivate: false,
    });

    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setMounted(true); }, []);

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const finalValue = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
        setForm(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const finalizeProfile = async () => {
        setLoading(true);
        setError(null);

        try {

            setLoadingStage("Syncing identity...");


            const res = await api.patch("profile/me", form);

            if (imageFile) {
                setLoadingStage("Uploading avatar...");
                const formData = new FormData();
                formData.append("profilePicture", imageFile);

                await api.patch("profile/photo", formData, {
                    onUploadProgress: (progressEvent) => {
                        if (progressEvent.total) {
                            const percentCompleted = Math.round(
                                (progressEvent.loaded * 100) / progressEvent.total
                            );
                            setUploadProgress(percentCompleted);
                            setLoadingStage(`Uploading: ${percentCompleted}%`);
                        }
                    },
                });
            }


            setSuccess(true);
            setTimeout(() => {
                window.location.replace("/dashboard");
            }, 2000);

        } catch (err: any) {

            const errorMessage = err.response?.data?.message || err.message || "Failed to initialize identity";
            setError(errorMessage);

        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-[#F2F2F2] dark:bg-black flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md">

                {/* Progress Indicator */}
                <div className="flex items-center justify-between mb-8 px-2">
                    <div className="flex gap-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className={`h-1.5 w-10 rounded-full transition-all duration-700 ${step >= i ? "bg-[#FF3131] shadow-[0_0_10px_rgba(255,49,49,0.5)]" : "bg-zinc-300 dark:bg-zinc-800"}`} />
                        ))}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Step 0{step}</span>
                </div>

                <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border border-zinc-200 dark:border-zinc-800 p-8 rounded-[40px] shadow-2xl min-h-[420px] flex flex-col relative overflow-hidden">

                    {/* STEP 1: IDENTITY */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="space-y-1">
                                <h2 className="text-3xl font-bold tracking-tighter italic text-zinc-900 dark:text-white">Identity.</h2>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">The basics of your presence.</p>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Full Name *</label>
                                    <input name="name" autoFocus value={form.name} onChange={handleChange} placeholder="What should we call you?" className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl py-4 px-5 text-sm outline-none focus:ring-1 focus:ring-[#FF3131]/20 transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Bio</label>
                                    <textarea name="bio" value={form.bio} onChange={handleChange} placeholder="Tell us your story..." rows={3} className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl py-4 px-5 text-sm outline-none focus:ring-1 focus:ring-[#FF3131]/20 resize-none" />
                                </div>
                            </div>
                            <button onClick={nextStep} disabled={!form.name} className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black py-4.5 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-30 active:scale-[0.98] transition-all">
                                Continue <ChevronRight size={18} />
                            </button>
                        </div>
                    )}

                    {/* STEP 2: CONNECTIONS (WITH SKIP) */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <h2 className="text-3xl font-bold tracking-tighter italic text-zinc-900 dark:text-white">Context.</h2>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Where you are and what you do.</p>
                                </div>
                                <button onClick={nextStep} className="text-[10px] font-black uppercase tracking-widest text-[#FF3131] hover:underline underline-offset-4">Skip</button>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Location</label>
                                    <div className="relative group">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-[#FF3131] transition-colors" size={16} />
                                        <input name="location" value={form.location} onChange={handleChange} placeholder="City, Country" className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl py-4 pl-12 pr-5 text-sm outline-none focus:ring-1 focus:ring-[#FF3131]/20" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Website</label>
                                    <div className="relative group">
                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-[#FF3131] transition-colors" size={16} />
                                        <input name="website" value={form.website} onChange={handleChange} placeholder="https://..." className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl py-4 pl-12 pr-5 text-sm outline-none focus:ring-1 focus:ring-[#FF3131]/20" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={prevStep} className="flex-1 border border-zinc-200 dark:border-zinc-800 py-4.5 rounded-2xl font-black uppercase text-[10px] tracking-widest dark:text-white">Back</button>
                                <button onClick={nextStep} className="flex-[2] bg-zinc-900 dark:bg-white text-white dark:text-black py-4.5 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-[0.98]">Continue</button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: PRIVACY */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="space-y-1">
                                <h2 className="text-3xl font-bold tracking-tighter italic text-zinc-900 dark:text-white">Privacy.</h2>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Manage your visibility.</p>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={() => setForm({ ...form, isPrivate: false })}
                                    className={`w-full p-5 rounded-[24px] border-2 flex items-center gap-4 transition-all ${!form.isPrivate ? 'border-[#FF3131] bg-[#FF3131]/5' : 'border-zinc-100 dark:border-zinc-800 grayscale opacity-60'}`}
                                >
                                    <div className={`p-3 rounded-2xl ${!form.isPrivate ? 'bg-[#FF3131] text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}><Globe size={24} /></div>
                                    <div className="text-left">
                                        <p className="text-xs font-black uppercase tracking-tight dark:text-white">Public</p>
                                        <p className="text-[9px] font-medium text-zinc-500">Visible to all users.</p>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setForm({ ...form, isPrivate: true })}
                                    className={`w-full p-5 rounded-[24px] border-2 flex items-center gap-4 transition-all ${form.isPrivate ? 'border-[#FF3131] bg-[#FF3131]/5' : 'border-zinc-100 dark:border-zinc-800 grayscale opacity-60'}`}
                                >
                                    <div className={`p-3 rounded-2xl ${form.isPrivate ? 'bg-[#FF3131] text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}><Lock size={24} /></div>
                                    <div className="text-left">
                                        <p className="text-xs font-black uppercase tracking-tight dark:text-white">Private</p>
                                        <p className="text-[9px] font-medium text-zinc-500">Manual follower approval.</p>
                                    </div>
                                </button>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button onClick={prevStep} className="flex-1 border border-zinc-200 dark:border-zinc-800 py-4.5 rounded-2xl font-black uppercase text-[10px] tracking-widest dark:text-white">Back</button>
                                <button onClick={nextStep} className="flex-[2] bg-zinc-900 dark:bg-white text-white dark:text-black py-4.5 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-[0.98]">Upload Avatar</button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: MEDIA (FINAL) */}
                    {step === 4 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500 flex-1 flex flex-col justify-between">
                            <div className="space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <h2 className="text-3xl font-bold tracking-tighter italic text-zinc-900 dark:text-white">Visual.</h2>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Set your primary avatar.</p>
                                    </div>
                                    <button onClick={finalizeProfile} className="text-[10px] font-black uppercase tracking-widest text-[#FF3131] hover:underline underline-offset-4">Skip</button>
                                </div>

                                <div className="flex flex-col items-center py-4">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="relative w-44 h-44 rounded-[56px] overflow-hidden bg-zinc-100 dark:bg-zinc-800 border-2 border-dashed border-zinc-200 dark:border-zinc-700 cursor-pointer group hover:border-[#FF3131] transition-all duration-500 shadow-inner"
                                    >
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                                                <Camera size={40} className="mb-2 group-hover:text-[#FF3131] transition-colors" />
                                                <span className="text-[9px] font-black uppercase tracking-[0.2em]">Select Photo</span>
                                            </div>
                                        )}
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                {error && (
                                    <div className="flex items-center gap-2 text-[#FF3131] text-[10px] font-black uppercase tracking-tighter bg-[#FF3131]/5 p-3 rounded-xl border border-[#FF3131]/10">
                                        <AlertCircle size={14} /> {error}
                                    </div>
                                )}
                                <div className="flex gap-3">
                                    <button onClick={prevStep} disabled={loading} className="flex-1 border border-zinc-200 dark:border-zinc-800 py-4.5 rounded-2xl font-black uppercase text-[10px] tracking-widest dark:text-white">Back</button>
                                    <button
                                        onClick={nextStep} // Change this from finalizeProfile
                                        disabled={loading}
                                        className="flex-[2] bg-[#FF3131] text-white py-4.5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-[0_10px_20px_-10px_rgba(255,49,49,0.5)] active:scale-[0.98] transition-all"
                                    >
                                        Review Profile
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 5: REVIEW & CONFIRM */}
                    {step === 5 && (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 flex-1 flex flex-col">
                            <div className="space-y-1">
                                <h2 className="text-3xl font-bold tracking-tighter italic text-zinc-900 dark:text-white">Confirm.</h2>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Final check before initialization.</p>
                            </div>

                            {/* Identity Card Preview */}
                            <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-[32px] p-6 space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600">
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-400"><User size={32} /></div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-zinc-900 dark:text-white leading-tight">{form.name}</h3>
                                        <p className="text-[10px] font-bold text-[#FF3131] uppercase tracking-widest flex items-center gap-1">
                                            {form.isPrivate ? <><Lock size={10} /> Private Profile</> : <><Globe size={10} /> Public Profile</>}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2">
                                    {form.bio && (
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Bio</span>
                                            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed italic">"{form.bio}"</p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        {form.location && (
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Location</span>
                                                <p className="text-xs font-bold dark:text-white flex items-center gap-1"><MapPin size={12} /> {form.location}</p>
                                            </div>
                                        )}
                                        {form.website && (
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Website</span>
                                                <p className="text-xs font-bold dark:text-white flex items-center gap-1 truncate"><Globe size={12} /> {form.website.replace(/^https?:\/\//, '')}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto space-y-4">
                                {error && (
                                    <div className="flex items-center gap-2 text-[#FF3131] text-[10px] font-black uppercase tracking-tighter bg-[#FF3131]/5 p-3 rounded-xl border border-[#FF3131]/10">
                                        <AlertCircle size={14} /> {error}
                                    </div>
                                )}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setStep(1)}
                                        disabled={loading}
                                        className="flex-1 border border-zinc-200 dark:border-zinc-800 py-4.5 rounded-2xl font-black uppercase text-[10px] tracking-widest dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                    >
                                        Edit Profile
                                    </button>
                                    {loading && (
                                        <div className="space-y-3 mt-4 animate-in fade-in duration-300">
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                                <span>{loadingStage}</span>
                                                {uploadProgress > 0 && <span>{uploadProgress}%</span>}
                                            </div>

                                            {/* Modern Progress Track */}
                                            <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-[#FF3131] shadow-[0_0_10px_rgba(255,49,49,0.5)] transition-all duration-300 ease-out"
                                                    style={{ width: `${uploadProgress || (loading ? 30 : 0)}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <button
                                        onClick={finalizeProfile}
                                        disabled={loading}
                                        className="flex-[2] bg-[#FF3131] text-white py-4.5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-[0_10px_20px_-10px_rgba(255,49,49,0.5)] active:scale-[0.98] transition-all"
                                    >
                                        {loading ? <><Loader2 className="animate-spin" size={16} /> {loadingStage}</> : <>Confirm & Initialize</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Success Modal */}
            {success && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-2xl">
                    <div className="text-center space-y-6 animate-in zoom-in duration-500">
                        <div className="relative mx-auto w-24 h-24">
                            <div className="absolute inset-0 bg-[#00D166] rounded-full blur-2xl opacity-20 animate-pulse" />
                            <CheckCircle2 size={96} className="text-[#00D166] relative z-10" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-white text-3xl font-black uppercase tracking-tighter italic">Sync Complete</h3>
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Entering Dashboard...</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}