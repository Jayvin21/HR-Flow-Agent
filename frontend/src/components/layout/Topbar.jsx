import {
  Bell,
  Building2,
  ChevronDown,
  Command,
  Search,
} from "lucide-react";

export default function Topbar({ collapsed }) {
  return (
    <header
      className={`sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-8 backdrop-blur transition-all duration-300 ${
        collapsed ? "ml-24" : "ml-72"
      }`}
    >
      <div className="relative w-[520px]">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-16 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          placeholder="Search across candidates, documents, policies..."
        />
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-400">
          <Command size={12} />
          K
        </div>
      </div>

      <div className="flex items-center gap-5">
        <button className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700">
          <Building2 size={17} />
          Acme Corp Workspace
          <ChevronDown size={16} />
        </button>

        <button className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600">
          <Bell size={18} />
          <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            3
          </span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
            HR
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-950">HR</p>
            <p className="text-xs text-slate-500">HR Manager</p>
          </div>
          <ChevronDown size={16} className="text-slate-500" />
        </div>
      </div>
    </header>
  );
}
