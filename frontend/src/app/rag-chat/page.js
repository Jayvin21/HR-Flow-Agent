"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { getWorkspaces } from "@/api/workspaceApi";
import { askRagQuestion } from "@/api/ragApi";
import {
  Bot,
  FileText,
  Loader2,
  MessageSquareText,
  Search,
  Send,
  Sparkles,
  User,
} from "lucide-react";

const sampleQuestions = [
  "Which candidates know React?",
  "Can probation employees take paid leave?",
  "What happens after more than 3 late marks?",
  "Which documents mention salary deduction?",
  "What documents are required before joining?",
];

export default function RagChatPage() {
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");

  async function loadWorkspaces() {
    try {
      const data = await getWorkspaces();
      setWorkspaces(data);
    } catch (err) {
      setError("Could not load workspaces. Check backend connection.");
    }
  }

  async function handleAsk(event) {
    event?.preventDefault();

    if (!question.trim()) {
      setError("Ask a question first.");
      return;
    }

    const currentQuestion = question.trim();

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: currentQuestion,
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setAsking(true);
    setError("");

    try {
      const result = await askRagQuestion({
        question: currentQuestion,
        workspaceId,
      });

      const assistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.answer,
        sources: result.sources || [],
        confidence: result.confidence,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "RAG chat failed. Make sure documents are uploaded and backend is running."
      );
    } finally {
      setAsking(false);
    }
  }

  function useSampleQuestion(sample) {
    setQuestion(sample);
  }

  useEffect(() => {
    loadWorkspaces();
  }, []);

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
            Grounded HR Q&A
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            RAG Chat
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Ask questions across uploaded resumes, job descriptions, HR
            policies, attendance files, employee queries, and dispute documents.
            Answers are grounded in uploaded document snippets.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">
          Retrieval v1: Keyword Scoring
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <section className="grid grid-cols-[320px_1fr] gap-5">
        <aside className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Search size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Search Scope
                </h2>
                <p className="text-sm text-slate-500">
                  Choose document workspace.
                </p>
              </div>
            </div>

            <label className="mb-2 block text-sm font-medium text-slate-700">
              Workspace
            </label>

            <select
              value={workspaceId}
              onChange={(event) => setWorkspaceId(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            >
              <option value="">All uploaded documents</option>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>

            <p className="mt-3 text-xs leading-5 text-slate-400">
              For sharper answers, select the workspace where you uploaded the
              relevant resumes, policies, or dispute documents.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-blue-600" />
              <h2 className="text-base font-semibold text-slate-950">
                Test Questions
              </h2>
            </div>

            <div className="space-y-2">
              {sampleQuestions.map((sample) => (
                <button
                  key={sample}
                  onClick={() => useSampleQuestion(sample)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-left text-sm leading-5 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50/40 hover:text-blue-700"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="flex min-h-[680px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <MessageSquareText size={20} />
              </div>

              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  HRFlow RAG Assistant
                </h2>
                <p className="text-sm text-slate-500">
                  Ask questions grounded in your uploaded documents.
                </p>
              </div>
            </div>

            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Ready
            </span>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto bg-slate-50/60 p-5">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Bot size={28} />
                </div>

                <h3 className="text-lg font-semibold text-slate-950">
                  Start asking questions over HR documents
                </h3>

                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  Upload documents first, then ask questions like candidate
                  skills, leave eligibility, attendance rules, missing
                  documents, or dispute evidence.
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                      <Bot size={17} />
                    </div>
                  )}

                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                      message.role === "user"
                        ? "rounded-tr-md bg-blue-600 text-white"
                        : "rounded-tl-md border border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>

                    {message.role === "assistant" && (
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <div className="mb-3 flex items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            Confidence: {message.confidence}
                          </span>

                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            {message.sources?.length || 0} sources
                          </span>
                        </div>

                        {message.sources?.length > 0 ? (
                          <div className="space-y-3">
                            {message.sources.map((source, index) => (
                              <div
                                key={`${source.document_id}-${index}`}
                                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                              >
                                <div className="mb-2 flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <FileText
                                      size={15}
                                      className="text-blue-600"
                                    />
                                    <p className="text-xs font-semibold text-slate-800">
                                      [{index + 1}] {source.filename}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                                      {source.document_type}
                                    </span>
                                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                                      score {source.score}
                                    </span>
                                  </div>
                                </div>

                                <p className="text-xs leading-5 text-slate-500">
                                  {source.snippet}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">
                            No document sources found for this question.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {message.role === "user" && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
                      <User size={17} />
                    </div>
                  )}
                </div>
              ))
            )}

            {asking && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                  <Bot size={17} />
                </div>

                <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                  <Loader2 size={16} className="animate-spin" />
                  Searching uploaded documents...
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={handleAsk}
            className="border-t border-slate-100 bg-white p-5"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask: Which candidates know React?"
                className="flex-1 text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />

              <button
                type="submit"
                disabled={asking}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {asking ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
          </form>
        </section>
      </section>
    </AppShell>
  );
}
