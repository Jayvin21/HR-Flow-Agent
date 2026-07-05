import { ArrowRight, Database, FilePlus2, Sparkles } from "lucide-react";

export default function ModulePage({ module }) {
  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
            {module.eyebrow}
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            {module.title}
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            {module.subtitle}
          </p>
        </div>

        <button className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
          {module.primaryAction}
          <ArrowRight size={16} />
        </button>
      </div>

      <section className="grid grid-cols-3 gap-5">
        {module.cards.map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Sparkles size={19} />
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {card.status}
              </span>
            </div>

            <h2 className="text-base font-semibold text-slate-950">
              {card.title}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {card.description}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-5 grid grid-cols-[1.2fr_0.8fr] gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <FilePlus2 size={18} className="text-blue-600" />
            <h2 className="text-base font-semibold text-slate-950">
              Workflow Panel
            </h2>
          </div>

          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-sm font-semibold text-slate-800">
              Functional workflow UI will connect here.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              This page is now routed and ready. Next step is connecting forms,
              uploads, API calls, and backend actions for this module.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Database size={18} className="text-blue-600" />
            <h2 className="text-base font-semibold text-slate-950">
              Backend Endpoints Planned
            </h2>
          </div>

          <div className="space-y-3 text-sm text-slate-600">
            <div className="rounded-xl bg-slate-50 p-3">
              GET module records
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              POST create or generate action
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              PATCH update status
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              DELETE archive record
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
