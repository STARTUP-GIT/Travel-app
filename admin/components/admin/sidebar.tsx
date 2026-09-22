"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AdminLogo } from "@/components/admin/admin-logo";
import { NAVIGATION } from "@/components/admin/nav-config";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-card lg:block lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
      <div className="flex h-14 items-center border-b border-border px-5">
        <Link href="/dashboard">
          <AdminLogo />
        </Link>
      </div>
      <nav className="p-3">
        {NAVIGATION.map((section) => (
          <div key={section.label} className="mb-3">
            <p className="px-2 pb-1.5 pt-3 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                        active &&
                          "bg-zinc-900 text-white hover:bg-zinc-900 hover:text-white"
                      )}
                    >
                      <item.icon className="size-4 shrink-0" />
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}