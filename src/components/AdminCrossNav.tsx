"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Users", href: "/admin/users" },
  { label: "Chat", href: "/admin/chat" },
  { label: "Suggestions", href: "/admin/suggestions" },
  { label: "Bugs", href: "/admin/bugs" },
  { label: "Emotes", href: "/admin/emotes" },
  { label: "Staff", href: "/admin/staff" },
  { label: "Erreurs", href: "/admin/errors" },
];

export default function AdminCrossNav() {
  const pathname = usePathname();
  return (
    <div className="border-b border-line overflow-x-auto shrink-0">
      <div className="flex items-stretch px-6 max-md:px-4 min-w-max">
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-red font-bold flex items-center pr-5 mr-1 border-r border-line shrink-0">
          Admin
        </span>
        {LINKS.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`px-4 py-3 font-mono text-[11px] tracking-[0.1em] uppercase border-b-2 transition-colors whitespace-nowrap -mb-px ${
                active
                  ? "border-red text-ink"
                  : "border-transparent text-ink-3 hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
