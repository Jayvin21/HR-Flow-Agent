import { Check, Sparkles } from "lucide-react";
import { agentSuggestions, checklist } from "@/data/dashboardData";

export default function AgentSuggestions() {
  const completed = checklist.filter((item) => item.done).length;

  return (
    <aside className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles size={18} className="text-blue-600" />
          <h2 className="text-base font-semibold text-slate-950">
            Agent Suggestions
          </h2>
        </div>

        <div className="space-y-3">
          {agentSuggestions.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-slate-200 p-4"
            >
              <h3 className="text-sm font-semibold text-slate-950">
                {item.title}
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {item.description}
              </p>
              <button className="mt-3 text-sm font-medium text-blue-600">
                {item.action} ?
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-950">
            Daily Checklist
          </h2>

          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-600">
            {completed}/{checklist.length}
          </div>
        </div>

        <div className="space-y-3">
          {checklist.map((item) => (
            <label
              key={item.label}
              className="flex items-center gap-3 text-sm text-slate-700"
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded border ${
                  item.done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-slate-300 bg-white"
                }`}
              >
                {item.done && <Check size={13} />}
              </span>
              {item.label}
            </label>
          ))}
        </div>
      </section>
    </aside>
  );
}


