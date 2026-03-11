"use client";
import { Sidebar } from "../../src/components/layout/Sidebar";
import { useLayout } from "../../src/context/LayoutContext";
// import { UploadProgressWidget } from "../../src/components/create/UploadOverlay"; // 👈 add this
import { UploadProgressWidget } from "../../src/components/create/CreatePageContent"

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useLayout();

  return (
    <div className="flex min-h-screen bg-[#F2F2F2] dark:bg-black selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      <Sidebar />
      <main
        className={`flex-1 relative transition-[margin-left] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isCollapsed ? "ml-20" : "ml-64"
          }`}
      >
        <div className="absolute inset-0 nothing-dot-grid opacity-[0.02] dark:opacity-[0.04] pointer-events-none fixed" />
        <div className="relative z-10 min-h-screen flex flex-col">
          {children}
        </div>
      </main>

      {/* Persists across all page navigations */}
      <UploadProgressWidget /> {/* 👈 add this */}
    </div>
  );
}