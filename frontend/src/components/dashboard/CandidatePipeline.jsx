import { Eye, MessageSquare, MoreVertical } from "lucide-react";
import { candidates } from "@/data/dashboardData";

const statusStyles = {
  Shortlisted: "bg-emerald-50 text-emerald-700",
  Interview: "bg-blue-50 text-blue-700",
  Assessment: "bg-orange-50 text-orange-700",
  New: "bg-violet-50 text-violet-700",
  Screening: "bg-cyan-50 text-cyan-700",
};

export default function CandidatePipeline() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-950">
          Candidate Pipeline
        </h2>
        <button className="text-sm font-medium text-blue-600">View all</button>
      </div>

      <div className="overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3">Candidate</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Match Score</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {candidates.map((candidate, index) => (
              <tr key={candidate.email} className="hover:bg-slate-50/70">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                      {candidate.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {candidate.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {candidate.email}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-5 py-3 text-sm text-slate-600">
                  {candidate.role}
                </td>

                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-9 text-sm font-semibold text-emerald-600">
                      {candidate.score}%
                    </span>
                    <div className="h-2 w-24 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-emerald-500"
                        style={{ width: `${candidate.score}%` }}
                      />
                    </div>
                  </div>
                </td>

                <td className="px-5 py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      statusStyles[candidate.status]
                    }`}
                  >
                    {candidate.status}
                  </span>
                </td>

                <td className="px-5 py-3">
                  <div className="flex justify-end gap-2 text-slate-400">
                    <button className="hover:text-slate-700">
                      <Eye size={17} />
                    </button>
                    <button className="hover:text-slate-700">
                      <MessageSquare size={17} />
                    </button>
                    <button className="hover:text-slate-700">
                      <MoreVertical size={17} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}


