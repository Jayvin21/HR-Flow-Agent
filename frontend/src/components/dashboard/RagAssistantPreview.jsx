import { Send, Sparkles } from "lucide-react";

export default function RagAssistantPreview() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={18} className="text-blue-600" />
        <h2 className="text-base font-semibold text-slate-950">
          RAG Assistant
        </h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
          BETA
        </span>
      </div>

      <div className="mb-4 flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-tr-md bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
          Which candidates match the Frontend Developer role?
        </div>
      </div>

      <div className="max-w-[82%] rounded-2xl rounded-tl-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
        <p>
          Here are the top candidates matching the Frontend Developer role based
          on JD criteria and resume analysis.
        </p>

        <ul className="mt-2 list-inside list-disc">
          <li>Arjun Mehta — 92% match [1]</li>
          <li>Priya Nair — 88% match [1]</li>
          <li>Rohan Verma — 76% match [2]</li>
        </ul>

        <div className="mt-3">
          <p className="mb-1 text-xs font-semibold text-slate-500">Sources:</p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-slate-200">
              1 JD: Frontend Developer.pdf
            </span>
            <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-slate-200">
              2 Arjun_Mehta_Resume.docx
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
        <input
          className="flex-1 text-sm outline-none placeholder:text-slate-400"
          placeholder="Ask a question..."
        />
        <button className="text-blue-600">
          <Send size={18} />
        </button>
      </div>
    </section>
  );
}


