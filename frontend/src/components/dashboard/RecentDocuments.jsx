import { FileSpreadsheet, FileText, MoreVertical } from "lucide-react";
import { recentDocuments } from "@/data/dashboardData";

const tagStyles = {
  Policy: "bg-violet-50 text-violet-700",
  Resume: "bg-blue-50 text-blue-700",
  Attendance: "bg-emerald-50 text-emerald-700",
};

export default function RecentDocuments() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-950">
          Recent Documents
        </h2>
        <button className="text-sm font-medium text-blue-600">View all</button>
      </div>

      <div className="divide-y divide-slate-100">
        {recentDocuments.map((doc) => {
          const Icon = doc.name.endsWith(".xlsx") ? FileSpreadsheet : FileText;

          return (
            <div
              key={doc.name}
              className="grid grid-cols-[1.4fr_0.6fr_0.9fr_0.7fr_0.4fr_24px] items-center gap-3 px-5 py-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-blue-600">
                  <Icon size={18} />
                </div>
                <span className="font-medium text-slate-800">{doc.name}</span>
              </div>

              <span
                className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
                  tagStyles[doc.type]
                }`}
              >
                {doc.type}
              </span>

              <span className="text-slate-500">Uploaded by {doc.owner}</span>
              <span className="text-slate-500">{doc.date}</span>
              <span className="text-slate-500">{doc.size}</span>

              <button className="text-slate-400 hover:text-slate-700">
                <MoreVertical size={17} />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}


