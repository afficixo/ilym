"use client"

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useState } from "react";
import { Menu, X, ArrowRight } from "lucide-react";

const navLinks = [
  { href: "/about", label: "About" },
  { href: "/publishers", label: "Publishers" },
  { href: "/faq", label: "FAQ" },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="public-site relative min-h-screen w-full bg-[#071014] text-white overflow-x-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(35,197,154,0.14),transparent_38%),linear-gradient(180deg,#0b1b20_0%,#071014_55%,#061015_100%)]" />
        <div className="absolute inset-0 opacity-[0.09] [background-image:linear-gradient(rgba(166,243,213,1)_1px,transparent_1px),linear-gradient(90deg,rgba(166,243,213,1)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_72%)]" />
      </div>

      <div className="relative z-10">
        <motion.header
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed top-0 left-0 right-0 z-40 border-b border-emerald-100/10 bg-[#071014]/90 backdrop-blur-md"
        >
          <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 md:h-20">
            <Link href="/" className="flex items-center shrink-0" onClick={() => setMobileMenuOpen(false)}>
              <div className="relative h-12 w-32 overflow-hidden rounded-lg md:h-14 md:w-40">
                <Image
                  src="/afficixo-logo.png"
                  alt="Afficixo logo"
                  fill
                  sizes="(max-width: 768px) 48px, 56px"
                  className="h-full w-full object-contain"
                  priority
                />
              </div>
            </Link>

            <div className="public-header-nav hidden items-center gap-8 text-xs font-bold uppercase tracking-[0.18em] text-slate-400 md:flex">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className="transition-colors hover:text-emerald-300">
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/signup" className="public-header-login hidden text-xs font-semibold uppercase tracking-[0.15em] text-slate-400 transition-colors hover:text-white sm:block">
                Join Now
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-md bg-emerald-300 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#071014] shadow-[0_0_24px_rgba(110,231,183,0.22)] transition-all duration-300 hover:bg-emerald-200 hover:-translate-y-0.5 md:px-4 md:text-sm"
              >
                Login
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="public-header-menu rounded-md p-2 text-slate-300 transition-colors hover:text-white md:hidden"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </nav>

          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="border-t border-white/10 bg-[#071014]/95 md:hidden"
            >
              <div className="space-y-3 px-4 py-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block py-1 text-sm text-slate-300 transition-colors hover:text-white"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/login"
                  className="block py-1 text-sm text-slate-300 transition-colors hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="block py-1 text-sm text-slate-300 transition-colors hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </div>
            </motion.div>
          )}
        </motion.header>

        {children}

        <footer className="relative z-10 mt-8 border-t border-white/10 bg-white/[0.02] backdrop-blur py-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 sm:px-6 lg:flex-row lg:px-8">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-lg">
                <Image
                  src="/afficixo-logo.png"
                  alt="Afficixo logo"
                  fill
                  sizes="40px"
                  className="h-full w-full object-contain"
                  priority
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400 md:gap-6 md:text-sm">
              <Link href="/about" className="transition-colors hover:text-white">About</Link>
              <Link href="/publishers" className="transition-colors hover:text-white">Publishers</Link>
              <Link href="/faq" className="transition-colors hover:text-white">FAQ</Link>
              <Link href="/privacy-policy" className="transition-colors hover:text-white">Privacy Policy</Link>
              <Link href="/terms-of-service" className="transition-colors hover:text-white">Terms of Service</Link>
              <Link href="/contact" className="transition-colors hover:text-white">Contact</Link>
            </div>

            <div className="flex items-center gap-3 text-slate-400 md:gap-4">
              <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="X" className="transition-all hover:-translate-y-0.5 hover:text-white">X</a>
              <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn" className="transition-all hover:-translate-y-0.5 hover:text-white">in</a>
              <a href="https://github.com" target="_blank" rel="noreferrer" aria-label="GitHub" className="transition-all hover:-translate-y-0.5 hover:text-white">GitHub</a>
              <a href="https://t.me" target="_blank" rel="noreferrer" aria-label="Telegram" className="transition-all hover:-translate-y-0.5 hover:text-white">Telegram</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
