"use client";
import { Sidebar } from "../../src/components/layout/Sidebar";
import { useLayout } from "../../src/context/LayoutContext";
import { UploadProgressWidget } from "../../src/components/create/CreatePageContent";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useLayout();

  return (
    // isolation:isolate creates a clean stacking context boundary so portals
    // (NotificationPanel, modals) rendered to document.body aren't affected
    // by any transitions or z-index stacking inside this tree.
    <div
      className="flex min-h-screen bg-[#F2F2F2] dark:bg-black selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black"
      style={{ isolation: "isolate" }}
    >
      <Sidebar />

      {/*
        KEY FIX: <main> has NO transition on it — transitions create a new
        stacking context in Chrome/Safari, which causes fixed-position portals
        (like NotificationPanel at z-[210]) to lose to elements inside <main>.

        Instead, we put the margin transition on an inner wrapper div.
        <main> itself stays context-free so portals stack correctly.
      */}
      <main className="flex-1 relative">
        {/* This inner div owns the sidebar-collapse margin animation */}
        <div
          className={`min-h-screen transition-[margin-left] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isCollapsed ? "ml-20" : "ml-64"
          }`}
        >
          {/* Dot grid background — pointer-events-none so it never blocks clicks */}
          <div className="absolute inset-0 nothing-dot-grid opacity-[0.02] dark:opacity-[0.04] pointer-events-none" />
          <div className="relative z-10 min-h-screen flex flex-col">
            {children}
          </div>
        </div>
      </main>

      {/* Persists across all page navigations */}
      <UploadProgressWidget />
    </div>
  );
}