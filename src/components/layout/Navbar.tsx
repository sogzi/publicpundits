"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Trophy, Calendar, BarChart2, GitBranch, Users, User, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/matches",     label: "Matches",     icon: Calendar },
  { href: "/leaderboard", label: "Leaderboard", icon: BarChart2 },
  { href: "/bracket",     label: "Bracket",     icon: GitBranch },
  { href: "/leagues",     label: "Leagues",     icon: Users },
  { href: "/profile",     label: "Profile",     icon: User },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/matches" className="flex items-center gap-2 font-bold text-emerald-600 text-lg">
          <Trophy className="h-6 w-6" />
          PublicPundits
        </Link>

        {/* desktop */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith(href)
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          <button
            onClick={signOut}
            className="ml-2 flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </nav>

        {/* mobile toggle */}
        <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* mobile menu */}
      {open && (
        <nav className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 pb-4">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-3 text-sm font-medium",
                pathname.startsWith(href)
                  ? "text-emerald-700"
                  : "text-gray-600 hover:text-emerald-700"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-md px-3 py-3 text-sm font-medium text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </nav>
      )}
    </header>
  );
}
