"use client";

import { useState } from "react";
import { eraseAllDemoData } from "@/api/adminApi";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

export default function EraseAllDataButton({ compact = false }) {
  const [loading, setLoading] = useState(false);

  async function handleErase() {
    const firstConfirm = window.confirm(
      "Erase all HRFlow demo data? This will delete workspaces, documents, candidates, attendance records, communication tasks, and generated queues."
    );

    if (!firstConfirm) return;

    const typed = window.prompt(
      'Type ERASE to confirm permanent demo-data reset.'
    );

    if (typed !== "ERASE") return;

    try {
      setLoading(true);

      const result = await eraseAllDemoData();

      alert(result.message || "All demo data erased.");

      window.location.href = "/";
    } catch (error) {
      console.error(error);
      alert("Could not erase demo data. Check backend terminal.");
    } finally {
      setLoading(false);
    }
  }

  if (compact) {
    return (
      <button
        onClick={handleErase}
        disabled={loading}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Trash2 size={16} />
        )}
        Erase All Demo Data
      </button>
    );
  }

  return (
    <button
      onClick={handleErase}
      disabled={loading}
      className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <Loader2 size={17} className="animate-spin" />
      ) : (
        <AlertTriangle size={17} />
      )}
      Erase All Demo Data
    </button>
  );
}
