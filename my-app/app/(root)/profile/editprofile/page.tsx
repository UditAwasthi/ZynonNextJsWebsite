"use client";

import api from "../../../../src/lib/api";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    Camera, User, MapPin, Globe, Lock,
    ArrowLeft, CheckCircle2, AlertCircle, Loader2,
    Save, X, Shield, ChevronRight
} from "lucide-react";

export default function EditProfilePage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
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

    useEffect(() => {
        setMounted(true);
        fetchCurrentProfile();
    }, []);

    const fetchCurrentProfile = async () => {
        try {
            const res = await api.get("profile/me");
            const data = res.data;
            setForm({
                name: data.name || "",
                bio: data.bio || "",
                location: data.location || "",
                website: data.website || "",
                isPrivate: data.isPrivate || false,
            });
            if (data.profilePicture) setImagePreview(data.profilePicture);
        } catch (err) {
            setError("ERR_SYNC_FAILED");
        } finally {
            setFetching(false);
        }
    };

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

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            setLoadingStage("OVERRIDING_IDENTITY");
            await api.patch("profile/me", form);

            if (imageFile) {
                setLoadingStage("AVATAR_UPLINK");
                const formData = new FormData();
                formData.append("profilePicture", imageFile);

                await api.patch("profile/photo", formData, {
                    onUploadProgress: (p) => {
                        if (p.total) {
                            const percent = Math.round((p.loaded * 100) / p.total);
                            setUploadProgress(percent);
                        }
                    },
                });
            }

            setSuccess(true);
            setTimeout(() => router.push("/profile"), 1500);
        } catch (err: any) {
            setError(err.response?.data?.message || "TRANSACTION_ABORTED");
            setLoading(false);
        }
    };

    if (!mounted || fetching) return null;

    return (
        <div className="min-h-screen bg-[#F6F6F6] dark:bg-black text-black dark:text-white selection:bg-red-500/30">
            {/* Nothing Background Texture */}
            <div className="fixed inset-0 nothing-dot-grid opacity-[0.05] dark:opacity-[0.1] pointer-events-none" />

            <div className="relative z-10 max-w-5xl mx-auto p-6 md:p-12 space-y-12">

                {/* Minimalist Header */}
                <header className="flex items-end justify-between border-b border-black/5 dark:border-white/10 pb-10">
                    <div className="space-y-4">
                        <button
                            onClick={() => router.back()}
                            className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
                        >
                            <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" />
                            Return_to_base
                        </button>
                        <h1 className="font-nothing text-6xl md:text-8xl tracking-tighter uppercase leading-[0.8]">
                            Edit<br /><span className="opacity-20">Profile.</span>
                        </h1>
                    </div>
                    <div className="hidden md:block text-right">
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-400">Ver: 3.0.0_SOP</p>
                        <p className="text-[9px] font-medium text-zinc-400 opacity-50">Identity Management System</p>
                    </div>
                </header>

                <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                    {/* Left Side: Avatar & Privacy (The Widget Look) */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-3xl border border-zinc-200 dark:border-zinc-800 p-1 rounded-[48px] overflow-hidden shadow-sm">
                            <div className="p-8 space-y-8">
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="relative aspect-square w-full rounded-[32px] overflow-hidden bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-zinc-800 cursor-pointer group shadow-inner"
                                >
                                    {imagePreview ? (
                                        <img src={imagePreview} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" alt="Avatar" />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-zinc-300 dark:text-zinc-700">
                                            <Camera size={40} strokeWidth={1} />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <span className="text-[9px] font-black text-white uppercase tracking-[0.4em]">Replace_Bio_Img</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 block px-2">Privacy_Status</label>
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, isPrivate: !form.isPrivate })}
                                        className={`w-full group flex items-center justify-between p-5 rounded-[24px] border transition-all ${form.isPrivate
                                                ? 'bg-black text-white dark:bg-white dark:text-black border-transparent'
                                                : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-500'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {form.isPrivate ? <Lock size={14} /> : <Globe size={14} />}
                                            <span className="text-[11px] font-black uppercase tracking-widest">
                                                {form.isPrivate ? "Private" : "Public"}
                                            </span>
                                        </div>
                                        <ChevronRight size={14} className={form.isPrivate ? "opacity-100" : "opacity-20"} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Data Inputs */}
                    <div className="lg:col-span-8 space-y-8">
                        <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-3xl border border-zinc-200 dark:border-zinc-800 p-8 md:p-12 rounded-[48px] shadow-sm space-y-10">

                            <div className="grid gap-10">
                                {/* Name Input */}
                                <div className="relative space-y-3 group">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 ml-1">Full Name</label>
                                    <input
                                        name="name"
                                        value={form.name}
                                        onChange={handleChange}
                                        className="w-full bg-transparent border-b-2 border-zinc-200 dark:border-zinc-800 py-4 text-2xl md:text-3xl font-medium outline-none focus:border-black dark:focus:border-white transition-all placeholder:opacity-20"
                                        placeholder="Full Name"
                                        required
                                    />
                                </div>

                                {/* Bio Input */}
                                <div className="relative space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 ml-1">Bio_Brief</label>
                                    <textarea
                                        name="bio"
                                        value={form.bio}
                                        onChange={handleChange}
                                        rows={3}
                                        className="w-full bg-transparent border-b-2 border-zinc-200 dark:border-zinc-800 py-4 text-lg outline-none focus:border-black dark:focus:border-white transition-all resize-none placeholder:opacity-20"
                                        placeholder="Enter biometric description..."
                                    />
                                </div>

                                {/* Meta Inputs */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 ml-1 flex items-center gap-2">
                                            <MapPin size={10} /> Location
                                        </label>
                                        <input
                                            name="location"
                                            value={form.location}
                                            onChange={handleChange}
                                            className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-800 py-3 text-sm outline-none focus:border-black dark:focus:border-white transition-all"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 ml-1 flex items-center gap-2">
                                            <Globe size={10} /> Web_Domain
                                        </label>
                                        <input
                                            name="website"
                                            value={form.website}
                                            onChange={handleChange}
                                            className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-800 py-3 text-sm outline-none focus:border-black dark:focus:border-white transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Status Bar for Errors/Progress */}
                            {(error || loading) && (
                                <div className="pt-6 border-t border-black/5 dark:border-white/5 animate-in fade-in slide-in-from-bottom-2">
                                    {error && (
                                        <div className="flex items-center gap-3 text-[#FF3131] text-[10px] font-black uppercase tracking-widest">
                                            <AlertCircle size={14} strokeWidth={3} /> {error}
                                        </div>
                                    )}

                                    {loading && (
                                        <div className="space-y-4">
                                            <div className="flex justify-between text-[9px] font-black uppercase tracking-[0.4em] text-zinc-400">
                                                <span>{loadingStage}</span>
                                                <span>{uploadProgress}%</span>
                                            </div>
                                            <div className="h-[2px] w-full bg-zinc-100 dark:bg-zinc-900">
                                                <div
                                                    className="h-full bg-black dark:bg-white transition-all duration-500 ease-out"
                                                    style={{ width: `${uploadProgress || 10}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-[2] bg-black dark:bg-white text-white dark:text-black py-6 rounded-[24px] font-black uppercase text-[11px] tracking-[0.4em] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 shadow-xl shadow-black/10 dark:shadow-white/5"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : <>Apply Changes <Save size={16} /></>}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    className="flex-1 border border-zinc-200 dark:border-zinc-800 py-6 rounded-[24px] font-black uppercase text-[10px] tracking-[0.4em] hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {/* Success Overlay (Digital Wash) */}
            {success && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/90 dark:bg-black/95 backdrop-blur-3xl animate-in fade-in duration-700">
                    <div className="text-center space-y-8">
                        <div className="relative inline-block">
                            <CheckCircle2 size={80} strokeWidth={1} className="text-black dark:text-white mx-auto animate-pulse" />
                            <div className="absolute inset-0 blur-2xl bg-black/10 dark:bg-white/10 rounded-full" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-nothing text-4xl md:text-5xl tracking-tighter uppercase italic">Sequence_Complete</h3>
                            <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-[0.5em]">Identity Hash Updated</p>
                        </div>
                    </div>
                </div>
            )}

            <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
        </div>
    );
}