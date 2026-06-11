"use client";

import Link from "next/link";
import { useState } from "react";
import { Mic, Star, Users, MessageSquare, BarChart2, Trophy, CheckSquare, Menu, X, ArrowRight, Zap } from "lucide-react";

const BRAND = "#1D9E75";

const features = [
  {
    icon: CheckSquare,
    color: "#1D9E75",
    title: "Predict scores",
    desc: "Call the scoreline before kickoff. Beat the AI prediction engine.",
  },
  {
    icon: Users,
    color: "#7C3AED",
    title: "Predict lineups",
    desc: "Pick the starting 11. See how close you got after the whistle.",
  },
  {
    icon: Star,
    color: "#D97706",
    title: "Rate players",
    desc: "Give every player a rating post-match. Community scores update live.",
  },
  {
    icon: MessageSquare,
    color: "#EF4444",
    title: "Banter room",
    desc: "Live match chat with hot takes, reactions, and receipts.",
  },
  {
    icon: Zap,
    color: "#1D9E75",
    title: "Dream team",
    desc: "Build your best XI of the group, stage, or full tournament.",
  },
  {
    icon: BarChart2,
    color: "#7C3AED",
    title: "Leaderboard",
    desc: "Points for every correct call. Climb the table all tournament.",
  },
];

const steps = [
  { n: "1", title: "Sign up free", desc: "Sign up in seconds. No credit card, no fuss." },
  { n: "2", title: "Make your calls", desc: "Predict scores, lineups, and outcomes before kickoff." },
  { n: "3", title: "Track & banter", desc: "Points, badges, and a leaderboard to settle every argument." },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleWaitlist(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-base">
            <span className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: BRAND }}>
              <Mic className="w-4 h-4 text-white" />
            </span>
            <span>Public Pundits</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2">
            <Link
              href="/login"
              className="px-4 py-1.5 rounded-md border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="px-4 py-1.5 rounded-md text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: BRAND }}
            >
              Join free
            </Link>
          </nav>

          {/* Mobile toggle */}
          <button className="md:hidden p-1" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 px-4 py-3 flex flex-col gap-2 bg-white">
            <Link href="/login" onClick={() => setMenuOpen(false)}
              className="w-full text-center px-4 py-2 rounded-md border border-gray-200 text-sm font-medium">
              Sign in
            </Link>
            <Link href="/register" onClick={() => setMenuOpen(false)}
              className="w-full text-center px-4 py-2 rounded-md text-sm font-medium text-white"
              style={{ backgroundColor: BRAND }}>
              Join free
            </Link>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
        {/* Badge */}
        <span className="inline-flex items-center gap-1.5 border border-gray-200 rounded-full px-3 py-1 text-xs font-medium text-gray-600 mb-8">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: BRAND }} />
          World Cup 2026
        </span>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.1] text-gray-900 mb-5 max-w-3xl mx-auto">
          The fan forum where your predictions actually matter
        </h1>

        <p className="text-gray-500 text-lg max-w-xl mx-auto mb-10">
          Predict scores, rate players, build dream teams, and out-pundit everyone you know.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: BRAND }}
          >
            Join for free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/matches"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            See how it works
          </Link>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="border-y border-gray-900 bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-3 divide-x divide-gray-700">
          {[
            { val: "64", label: "Matches to predict" },
            { val: "32", label: "Teams in the draw" },
            { val: "Free", label: "Always free to play" },
          ].map(({ val, label }) => (
            <div key={label} className="py-7 text-center">
              <p className="text-2xl sm:text-3xl font-black text-white">{val}</p>
              <p className="text-xs text-gray-400 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-8">What you can do</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="bg-gray-900 rounded-xl p-5 flex flex-col gap-3">
              <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + "22" }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </span>
              <div>
                <p className="font-semibold text-white text-sm mb-1">{title}</p>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-10">How it works</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-6">
          {steps.map(({ n, title, desc }) => (
            <div key={n} className="flex flex-col items-center text-center gap-4">
              <span className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-black text-base">
                {n}
              </span>
              <div>
                <p className="font-semibold text-gray-900 mb-1">{title}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── WAITLIST BANNER ── */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="rounded-2xl px-6 py-12 text-center" style={{ backgroundColor: "#E8F7F2" }}>
          <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: BRAND }}>
            Be first on the pitch
          </p>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">
            Drop your email and we&apos;ll let you know when Public Pundits goes live.
          </h2>

          {submitted ? (
            <p className="mt-6 font-semibold" style={{ color: BRAND }}>
              You&apos;re on the list — we&apos;ll be in touch! 🎉
            </p>
          ) : (
            <form onSubmit={handleWaitlist} className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full sm:flex-1 px-4 py-2.5 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-white"
                style={{ "--tw-ring-color": BRAND } as React.CSSProperties}
              />
              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 rounded-md text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: BRAND }}
              >
                Notify me
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400">© 2026 Public Pundits</p>
          <div className="flex items-center gap-5 text-xs text-gray-400">
            <Link href="#" className="hover:text-gray-700 transition-colors">About</Link>
            <Link href="#" className="hover:text-gray-700 transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-gray-700 transition-colors">Contact</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
