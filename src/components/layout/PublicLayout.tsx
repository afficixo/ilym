"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "/#home", label: "Home" },
  { href: "/#about", label: "About Us" },
  { href: "/#publishers", label: "Publishers" },
  { href: "/#advertisers", label: "Advertisers" },
  { href: "/#contact", label: "Contact" },
];

export default function PublicLayout({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isHomePage = pathname === "/";
  const [active, setActive] = useState<string | null>(isHomePage ? "/#home" : null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (!isHomePage) {
      setIsScrolled(true);
      return;
    }

    const updateScrolledState = () => setIsScrolled(window.scrollY > 20);
    updateScrolledState();
    window.addEventListener("scroll", updateScrolledState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrolledState);
  }, [isHomePage]);

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!isHomePage) {
      setActive(null);
      return;
    }

    setActive("/#home");
    const sections = navLinks
      .map((link) => document.getElementById(link.href.split("#")[1]))
      .filter((el): el is HTMLElement => !!el);
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (top) setActive(`/#${top.target.id}`);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [isHomePage]);

  const go = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const hash = new URL(href, window.location.origin).hash;
    if (!hash) return;
    e.preventDefault();
    const el = document.querySelector(hash);
    if (!el) return;
    const headerHeight = document.querySelector("header")?.getBoundingClientRect().height ?? 72;
    const y = (el as HTMLElement).getBoundingClientRect().top + window.scrollY - headerHeight;
    window.scrollTo({ top: y, behavior: "smooth" });
    history.replaceState(null, "", hash);
    setOpen(false);
  };

  return (
    <div
      data-mobile-menu-open={open ? "true" : undefined}
      className={`public-site relative min-h-screen w-full overflow-x-hidden ${className}`}
    >
      <div className="relative z-10 flex min-h-screen flex-col">
        <header
          className={`fixed inset-x-0 top-0 z-40 border-b ${open ? "" : "transition-colors"} ${
            open || !isHomePage || isScrolled
              ? "border-white/[0.08] bg-[#0f172a]/80 shadow-[0_2px_8px_rgba(0,0,0,0.18)]"
              : "border-transparent bg-transparent shadow-none"
          }`}
        >
          <nav className="relative z-10 mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:h-20 lg:px-8">
            <a
              href={isHomePage ? "#home" : "/#home"}
              onClick={isHomePage ? (e) => go(e, "#home") : undefined}
              className="flex shrink-0 items-center"
            >
              <Image
                src="/afficixlogo.png"
                alt="Afficix"
                width={1275}
                height={482}
                sizes="120px"
                className="h-10 w-[132px] object-contain"
                priority
              />
            </a>

            <div className="hidden items-center gap-8 lg:flex">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={isHomePage ? (e) => go(e, link.href) : undefined}
                  aria-current={active === link.href ? "location" : undefined}
                  className={`text-sm font-medium transition-colors ${
                    isHomePage && active === link.href ? "text-[#5ff442]" : "text-white/80 hover:text-white"
                  }`}
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/signup"
                prefetch={false}
                className="hidden lg:inline-flex items-center rounded-md bg-[#5ff442] px-4 py-2 text-sm font-bold text-[#263238] transition-colors hover:bg-[#4dd935]"
              >
                Sign up
              </Link>
              <Link
                href="/login"
                prefetch={false}
                aria-current={pathname === "/login" ? "page" : undefined}
                className="hidden lg:inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-[#263238] transition-colors hover:bg-[#f0f4f7]"
              >
                Login
              </Link>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="grid h-9 w-10 place-items-center rounded-md border border-white/20 bg-white/[0.04] text-white transition-colors hover:border-white/40 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5ff442] lg:hidden"
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
                aria-controls="public-mobile-menu"
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </nav>

          <AnimatePresence>
            {open && (
              <motion.div
                id="public-mobile-menu"
                initial={{ y: -6 }}
                animate={{ y: 0 }}
                exit={{ y: -6 }}
                transition={{ duration: 0.14, ease: "easeOut" }}
                className="absolute right-4 top-full z-10 mt-4 max-h-[calc(100dvh-5rem)] w-[min(12rem,calc(100vw-2rem))] overflow-y-auto bg-transparent lg:hidden"
              >
                <nav aria-label="Mobile navigation" className="pb-3">
                  <div className="space-y-0.5">
                    {navLinks.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        onClick={(event) => {
                          if (isHomePage) go(event, link.href);
                          else setOpen(false);
                        }}
                        aria-current={isHomePage && active === link.href ? "location" : undefined}
                        className={`flex min-h-10 items-center justify-end rounded-md px-2 text-lg font-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#5ff442] ${
                          isHomePage && active === link.href
                            ? "text-white"
                            : "text-white/65 hover:text-white"
                        }`}
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                  <div className="mt-1 flex flex-col items-end gap-2">
                    <Link
                      href="/signup"
                      prefetch={false}
                      onClick={() => setOpen(false)}
                      className="flex min-h-9 min-w-[5.5rem] items-center justify-center rounded bg-[#5ff442] px-3 text-sm font-semibold text-[#263238] transition-colors hover:bg-[#4dd935] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#111a2c]"
                    >
                      Sign up
                    </Link>
                    <Link
                      href="/login"
                      prefetch={false}
                      onClick={() => setOpen(false)}
                      aria-current={pathname === "/login" ? "page" : undefined}
                      className="flex min-h-9 min-w-[5.5rem] items-center justify-center rounded bg-white px-3 text-sm font-medium text-[#263238] transition-colors hover:bg-[#e6ebed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      Login
                    </Link>
                  </div>
                </nav>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {open && (
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default bg-[#0b1120]/45 backdrop-blur-none lg:hidden"
          />
        )}

        {children}

        <footer className="mt-auto border-t border-white/10 bg-[#202b2f]">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-3 sm:px-6 md:flex-row lg:px-8">
            <p className="text-center text-xs text-white/55 md:text-left">
              <span className="font-semibold text-white/85">Afficix</span>
              <span className="mx-2 text-[#5ff442]/70" aria-hidden="true">•</span>
              © 2019–2026. All rights reserved.
            </p>
            <nav aria-label="Legal" className="flex items-center gap-1 text-xs">
              <Link
                href="/privacy-policy"
                prefetch={false}
                className="rounded-md px-2 py-1 text-white/65 transition-colors hover:text-[#8aff70] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5ff442]"
              >
                Privacy Policy
              </Link>
              <span className="h-4 w-px bg-white/15" aria-hidden="true" />
              <Link
                href="/terms-of-service"
                prefetch={false}
                className="rounded-md px-2 py-1 text-white/65 transition-colors hover:text-[#8aff70] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5ff442]"
              >
                Terms &amp; Conditions
              </Link>
            </nav>
          </div>
        </footer>
      </div>
    </div>
  );
}