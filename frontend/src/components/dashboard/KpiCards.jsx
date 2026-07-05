import {
  Bell,
  BriefcaseBusiness,
  FileText,
  Users,
} from "lucide-react";
import { kpiCards } from "@/data/dashboardData";

const iconMap = {
  "Total Candidates": Users,
  "Open Cases": BriefcaseBusiness,
  "Documents Processed": FileText,
  "Attendance Alerts": Bell,
};

const toneMap = {
  blue: "bg-blue-50 text-blue-600",
  orange: "bg-orange-50 text-orange-600",
  green: "bg-emerald-50 text-emerald-600",
  red: "bg-red-50 text-red-600",
};

export default function KpiCards() {
  return (
    <section className="grid grid-cols-4 gap-5">
      {kpiCards.map((card) => {
        const Icon = iconMap[card.title];

        return (
          <div
            key={card.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  toneMap[card.tone]
                }`}
              >
                <Icon size={22} />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-500">
                  {card.title}
                </p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
                  {card.value}
                </p>
              </div>
            </div>

            <p
              className={`mt-4 text-sm font-medium ${
                card.trend.startsWith("+") || card.trend.startsWith("-11")
                  ? "text-emerald-600"
                  : "text-red-500"
              }`}
            >
              {card.trend}
            </p>
          </div>
        );
      })}
    </section>
  );
}


