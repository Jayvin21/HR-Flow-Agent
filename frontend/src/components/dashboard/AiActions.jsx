import Link from "next/link";
import {
  BellRing,
  FileSignature,
  MailPlus,
  MessageSquareReply,
  Scale,
  Sparkles,
} from "lucide-react";
import { aiActions } from "@/data/dashboardData";

const iconMap = {
  "Draft Interview Invite": MailPlus,
  "Generate Offer Letter": FileSignature,
  "Attendance Follow-up": BellRing,
  "Resolve Policy Query": MessageSquareReply,
  "Draft Dispute Response": Scale,
};

const hrefMap = {
  "Draft Interview Invite": "/emails",
  "Generate Offer Letter": "/letters",
  "Attendance Follow-up": "/attendance",
  "Resolve Policy Query": "/employee-queries",
  "Draft Dispute Response": "/disputes",
};

const toneMap = {
  purple: "bg-violet-50 text-violet-600",
  blue: "bg-blue-50 text-blue-600",
  red: "bg-red-50 text-red-600",
  green: "bg-emerald-50 text-emerald-600",
  orange: "bg-orange-50 text-orange-600",
};

export default function AiActions() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={18} className="text-blue-600" />
        <h2 className="text-base font-semibold text-slate-950">AI Actions</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {aiActions.map((action) => {
          const Icon = iconMap[action.title];

          return (
            <Link
              key={action.title}
              href={hrefMap[action.title]}
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  toneMap[action.tone]
                }`}
              >
                <Icon size={19} />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {action.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {action.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      <Link href="/emails" className="mt-4 inline-block text-sm font-medium text-blue-600">
        View all actions →
      </Link>
    </section>
  );
}
