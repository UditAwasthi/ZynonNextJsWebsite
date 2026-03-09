"use client"

import React, { useState } from "react"
import axios from "axios"
import { Loader2 } from "lucide-react"

const BASE_URL = "https://zynon.onrender.com/api"

export default function RefreshTester() {
  const [responseData, setResponseData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleRefresh = async () => {
  setLoading(true);
  setResponseData(null);

  try {
    const res = await axios.post("/api/auth/refresh", {});
    // No withCredentials needed — same-origin request now
    setResponseData(res.data);
  } catch (err: any) {
    setResponseData({
      error: true,
      message: err?.response?.data || err.message,
    });
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-10 space-y-8">

      <button
        onClick={handleRefresh}
        disabled={loading}
        className="px-8 py-5 rounded-3xl bg-black text-white font-bold uppercase tracking-widest text-xs flex items-center gap-3 hover:scale-[1.03] active:scale-[0.98] transition-all disabled:opacity-50"
      >
        {loading ? (
          <>
            Refreshing
            <Loader2 size={16} className="animate-spin" />
          </>
        ) : (
          "Send Refresh Request"
        )}
      </button>

      {responseData && (
        <div className="w-full max-w-3xl bg-black text-green-400 rounded-2xl p-6 font-mono text-xs overflow-x-auto">
          <pre>{JSON.stringify(responseData, null, 2)}</pre>
        </div>
      )}

    </div>
  )
}