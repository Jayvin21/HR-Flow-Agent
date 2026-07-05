import {
  LayoutDashboard,
  BriefcaseBusiness,
  FileText,
  MessageSquareText,
  UsersRound,
  GitCompare,
  ClipboardList,
  Mail,
  ScrollText,
  CalendarCheck,
  CircleHelp,
  Gavel,
  FolderKanban,
  FileWarning,
  BadgeCheck,
  MessagesSquare,
} from "lucide-react";

export const modules = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    description: "HR operations overview",
  },
  {
    label: "Workspaces",
    href: "/workspaces",
    icon: BriefcaseBusiness,
    description: "Manage HR workspaces",
  },
  {
    label: "Documents",
    href: "/documents",
    icon: FileText,
    description: "Upload and classify HR documents",
  },
  {
    label: "RAG Chat",
    href: "/rag-chat",
    icon: MessageSquareText,
    description: "Ask questions across HR documents",
  },
  {
    label: "Candidates",
    href: "/candidates",
    icon: UsersRound,
    description: "Parsed resume profiles",
  },
  {
    label: "JD Matcher",
    href: "/jd-matcher",
    icon: GitCompare,
    description: "Match candidates to job descriptions",
  },
  {
    label: "Interview Assistant",
    href: "/interview-assistant",
    icon: ClipboardList,
    description: "Generate interview packs",
  },
  {
    label: "Communications",
    href: "/communications",
    icon: MessagesSquare,
    description: "Email and letter execution queue",
  },
  {
    label: "Emails",
    href: "/emails",
    icon: Mail,
    description: "Generate HR email drafts",
  },
  {
    label: "Letters",
    href: "/letters",
    icon: ScrollText,
    description: "Generate HR letters",
  },
  {
    label: "Attendance",
    href: "/attendance",
    icon: CalendarCheck,
    description: "Analyze attendance issues",
  },
  {
    label: "Employee Queries",
    href: "/employee-queries",
    icon: CircleHelp,
    description: "Resolve employee HR questions",
  },
  {
    label: "Disputes",
    href: "/disputes",
    icon: Gavel,
    description: "Review HR dispute cases",
  },
  {
    label: "Cases",
    href: "/cases",
    icon: FolderKanban,
    description: "Unified HR case queue",
  },
  {
    label: "Missing Docs",
    href: "/missing-docs",
    icon: FileWarning,
    description: "Track pending documents",
  },
  {
    label: "Decisions",
    href: "/decisions",
    icon: BadgeCheck,
  MessagesSquare,
    description: "Generate HR decision memos",
  },
];

export const navItems = modules;

