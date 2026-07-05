"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Bot } from "lucide-react";
import { navItems } from "@/data/modules";

export default function Sidebar({ collapsed, setCollapsed }) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-slate-200 bg-white transition-all duration-300 ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      <div className="flex h-20 items-center justify-between border-b border-slate-100 px-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
            <Bot size={22} />
          </div>

          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-950">
                HRFlow
              </h1>
              <p className="text-xs font-medium text-slate-500">
                RAG AI Suite
              </p>
            </div>
          )}
        </Link>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
        >
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            if (!Icon) {
              return null;
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : ""}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-slate-100 p-4">
        <div
          className={`rounded-2xl bg-slate-50 p-4 ${
            collapsed ? "text-center" : ""
          }`}
        >
          {!collapsed ? (
            <>
              <p className="text-sm font-semibold text-slate-900">
                HR Agentic OS
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Documents, recruitment, cases, and decisions in one system.
              </p>
            </>
          ) : (
            <Bot size={20} className="mx-auto text-slate-500" />
          )}
        </div>
      </div>
    </aside>
  );
}
