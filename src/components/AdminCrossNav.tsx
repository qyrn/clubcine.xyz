"use client";

import Link from "next/link";
import { Fragment } from "react";

const LINKS: { label: string; href: string; primary?: boolean }[] = [
  { label: "Dashboard", href: "/admin/dashboard", primary: true },
  { label: "Users", href: "/admin/users" },
  { label: "Suggestions", href: "/admin/suggestions" },
  { label: "Bugs", href: "/admin/bugs" },
  { label: "Emotes", href: "/admin/emotes" },
  { label: "Staff", href: "/admin/staff" },
];

export default function AdminCrossNav({ current }: { current: string }) {
  const items = LINKS.filter((l) => l.href !== current);
  return (
    <div className="flex items-center justify-center flex-wrap gap-x-3 gap-y-2 font-mono text-[11px] tracking-[0.16em] uppercase">
      {items.map((l, i) => (
        <Fragment key={l.href}>
          <Link
            href={l.href}
            className={
              l.primary
                ? "text-red font-bold hover:text-ink transition-colors"
                : "text-ink-3 hover:text-red transition-colors"
            }
          >
            {l.primary && <span className="mr-1">★</span>}
            {l.label}
          </Link>
          {i < items.length - 1 && <span className="text-ink-4">·</span>}
        </Fragment>
      ))}
    </div>
  );
}
