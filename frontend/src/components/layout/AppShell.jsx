"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { eraseAllDemoData } from "@/api/adminApi";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  ChevronDown,
  ClipboardList,
  FileCheck2,
  FileText,
  FolderKanban,
  Home,
  Inbox,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  Menu,
  MessageSquareText,
  Scale,
  Settings,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

const navSections = [
  {
    title: "Command",
    items: [
      {
        label: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
      },
      {
        label: "Workspaces",
        href: "/workspaces",
        icon: FolderKanban,
      },
      {
        label: "Documents",
        href: "/documents",
        icon: FileText,
      },
    ],
  },
  {
    title: "Hiring",
    items: [
      {
        label: "Candidates",
        href: "/candidates",
        icon: UsersRound,
      },
      {
        label: "JD Matcher",
        href: "/jd-matcher",
        icon: BriefcaseBusiness,
      },
      {
        label: "Interview Assistant",
        href: "/interview-assistant",
        icon: ClipboardList,
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        label: "Attendance",
        href: "/attendance",
        icon: CalendarCheck,
      },
      {
        label: "Cases",
        href: "/cases",
        icon: ShieldAlert,
      },
      {
        label: "Communications",
        href: "/communications",
        icon: MessageSquareText,
      },
    ],
  },
  {
    title: "HR Execution",
    items: [
      {
        label: "Emails",
        href: "/emails",
        icon: Mail,
      },
      {
        label: "Letters",
        href: "/letters",
        icon: FileCheck2,
      },
      {
        label: "Employee Queries",
        href: "/employee-queries",
        icon: Inbox,
      },
      {
        label: "Missing Docs",
        href: "/missing-docs",
        icon: AlertTriangle,
      },
      {
        label: "Disputes",
        href: "/disputes",
        icon: Scale,
      },
    ],
  },
  {
    title: "AI",
    items: [
      {
        label: "RAG Chat",
        href: "/rag-chat",
        icon: Bot,
      },
      {
        label: "Decisions",
        href: "/decisions",
        icon: BarChart3,
      },
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
      },
    ],
  },
];

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

function isActiveRoute(pathname, href) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function currentPageTitle(pathname) {
  const allItems = navSections.flatMap((section) => section.items);
  const current = allItems
    .filter((item) => isActiveRoute(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return current?.label || "HRFlow AI";
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [erasing, setErasing] = useState(false);

  const pageTitle = useMemo(() => currentPageTitle(pathname), [pathname]);

  async function handleEraseAllData() {
    setProfileOpen(false);

    const firstConfirm = window.confirm(
      "Erase all HRFlow demo data? This deletes workspaces, documents, candidates, attendance records, cases, and communication tasks."
    );

    if (!firstConfirm) return;

    const typed = window.prompt(
      'Type ERASE to confirm permanent demo-data reset.'
    );

    if (typed !== "ERASE") return;

    try {
      setErasing(true);

      const result = await eraseAllDemoData();

      alert(result.message || "All demo data erased.");

      window.location.href = "/";
    } catch (error) {
      console.error(error);
      alert("Could not erase demo data. Check backend terminal.");
    } finally {
      setErasing(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      {sidebarOpen && (
        <button
          aria-label="Close sidebar overlay"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
        />
      )}

      <aside
        className={classNames(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
              <Sparkles size={20} />
            </div>

            <div>
              <p className="text-base font-bold tracking-tight text-slate-950">
                HRFlow AI
              </p>
              <p className="text-xs font-medium text-slate-500">
                RAG HR Operating System
              </p>
            </div>
          </Link>

          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-5">
            {navSections.map((section) => (
              <div key={section.title}>
                <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  {section.title}
                </p>

                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActiveRoute(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={classNames(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                          active
                            ? "bg-blue-50 text-blue-700"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                        )}
                      >
                        <Icon
                          size={18}
                          className={active ? "text-blue-700" : "text-slate-400"}
                        />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Building2 size={16} className="text-blue-600" />
              Demo Workspace
            </div>

            <p className="text-xs leading-5 text-slate-500">
              Use the profile dropdown to reset demo data before recruiter walkthroughs.
            </p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
              >
                <Menu size={20} />
              </button>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  HR Operations
                </p>
                <h1 className="text-lg font-semibold tracking-tight text-slate-950">
                  {pageTitle}
                </h1>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => setProfileOpen((prev) => !prev)}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:bg-slate-50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <UserRound size={18} />
                </div>

                <div className="hidden text-left sm:block">
                  <p className="text-sm font-semibold text-slate-950">
                    HR Profile
                  </p>
                  <p className="text-xs text-slate-500">
                    Demo Admin
                  </p>
                </div>

                <ChevronDown
                  size={16}
                  className={classNames(
                    "text-slate-400 transition-transform",
                    profileOpen ? "rotate-180" : ""
                  )}
                />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
                        <UserRound size={20} />
                      </div>

                      <div>
                        <p className="text-sm font-bold text-slate-950">
                          HR Profile
                        </p>
                        <p className="text-xs text-slate-500">
                          Local demo administrator
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-white p-2">
                        <p className="font-semibold text-slate-700">Mode</p>
                        <p className="text-slate-500">Demo</p>
                      </div>

                      <div className="rounded-lg bg-white p-2">
                        <p className="font-semibold text-slate-700">Access</p>
                        <p className="text-slate-500">Admin</p>
                      </div>
                    </div>
                  </div>

                  <div className="my-3 border-t border-slate-100" />

                  <Link
                    href="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Settings size={16} />
                    Settings
                  </Link>

                  <button
                    onClick={handleEraseAllData}
                    disabled={erasing}
                    className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {erasing ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                    Erase All Demo Data
                  </button>

                  <button
                    onClick={() => setProfileOpen(false)}
                    className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-500 hover:bg-slate-50"
                  >
                    <LogOut size={16} />
                    Close Menu
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
