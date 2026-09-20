"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef } from "react";
import PublicLayout from "@/components/layout/PublicLayout";
import {
  ArrowRight,
  Users,
  Target,
  Globe2,
  Sparkles,
  Check,
  Shield,
  Award,
  TrendingUp,
  Clock,
  Headphones,
  LayoutDashboard,
  LineChart,
  LifeBuoy,
  Briefcase,
  Gift,
  CreditCard,
  Ticket,
  Layers,
  Eye,
} from "lucide-react";

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Afficixo",
    url: "https://afficix.com",
    logo: "https://afficix.com/afficixo-logo.png",
    description:
      "Afficixo is a modern pay-per-click affiliate marketplace built for publishers who want to monetize traffic through CPC offers.",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Afficixo",
    url: "https://afficix.com",
  },
];

// ========== ANIMATIONS ==========

const fadeUpVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: i * 0.08,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
    },
  },
};

// ========== UI HELPERS ==========

const GradientText = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <span
    className={`bg-gradient-to-r from-emerald-300 via-cyan-300 to-white bg-clip-text text-transparent ${className}`}
  >
    {children}
  </span>
);

const GlassCard = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl ${className}`}
  >
    {children}
  </div>
);

const SectionHeading = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6 }}
    viewport={{ once: true }}
    className="text-center mb-10 md:mb-16"
  >
    <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-3 md:mb-4 text-white break-words">
      {title}
    </h2>
    {subtitle && (
      <p className="text-sm md:text-lg text-slate-400 max-w-3xl mx-auto leading-relaxed font-light px-4 break-words">
        {subtitle}
      </p>
    )}
  </motion.div>
);

// ========== MAIN PAGE ==========

export default function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ─── PARTICLE NETWORK ANIMATION ───
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;

    let can_w: number, can_h: number;
    const BALL_NUM = window.innerWidth < 768 ? 16 : 28;
    const R = 2.5;
    const dis_limit = 280;
    const link_line_width = 1.0;
    const alpha_f = 0.025;

    const isLight = !document.documentElement.classList.contains("dark");
    const ball_color = isLight ? { r: 14, g: 165, b: 233 } : { r: 0, g: 255, b: 100 };
    const line_color = isLight ? { r: 99, g: 102, b: 241 } : { r: 255, g: 255, b: 255 };
    const line_opacity = isLight ? 0.18 : 0.38;

    let balls: any[] = [];
    let animationId: number;
    let isVisible = true;

    function randomNumFrom(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    function randomSidePos(length: number) {
      return Math.ceil(Math.random() * length);
    }

    function randomArrayItem(arr: any[]) {
      return arr[Math.floor(Math.random() * arr.length)];
    }

    function getRandomSpeed(pos: string) {
      const min = -0.8,
        max = 0.8;
      switch (pos) {
        case "top":
          return [randomNumFrom(min, max), randomNumFrom(0.2, max)];
        case "right":
          return [randomNumFrom(min, -0.2), randomNumFrom(min, max)];
        case "bottom":
          return [randomNumFrom(min, max), randomNumFrom(min, -0.2)];
        case "left":
          return [randomNumFrom(0.2, max), randomNumFrom(min, max)];
        default:
          return [0, 0];
      }
    }

    function getRandomBall() {
      const pos = randomArrayItem(["top", "right", "bottom", "left"]);
      switch (pos) {
        case "top":
          return {
            x: randomSidePos(can_w),
            y: -R,
            vx: getRandomSpeed("top")[0],
            vy: getRandomSpeed("top")[1],
            r: R,
            alpha: 1,
            phase: randomNumFrom(0, 10),
            glow: randomNumFrom(0.5, 1),
          };
        case "right":
          return {
            x: can_w + R,
            y: randomSidePos(can_h),
            vx: getRandomSpeed("right")[0],
            vy: getRandomSpeed("right")[1],
            r: R,
            alpha: 1,
            phase: randomNumFrom(0, 10),
            glow: randomNumFrom(0.5, 1),
          };
        case "bottom":
          return {
            x: randomSidePos(can_w),
            y: can_h + R,
            vx: getRandomSpeed("bottom")[0],
            vy: getRandomSpeed("bottom")[1],
            r: R,
            alpha: 1,
            phase: randomNumFrom(0, 10),
            glow: randomNumFrom(0.5, 1),
          };
        case "left":
          return {
            x: -R,
            y: randomSidePos(can_h),
            vx: getRandomSpeed("left")[0],
            vy: getRandomSpeed("left")[1],
            r: R,
            alpha: 1,
            phase: randomNumFrom(0, 10),
            glow: randomNumFrom(0.5, 1),
          };
      }
    }

    function initCanvas() {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.setAttribute("width", (window.innerWidth * dpr).toString());
      canvas.setAttribute("height", (window.innerHeight * dpr).toString());
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      can_w = parseInt(canvas.getAttribute("width")!);
      can_h = parseInt(canvas.getAttribute("height")!);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function initBalls(num: number) {
      for (let i = 1; i <= num; i++) {
        balls.push({
          x: randomSidePos(can_w),
          y: randomSidePos(can_h),
          vx: getRandomSpeed("top")[0],
          vy: getRandomSpeed("top")[1],
          r: R,
          alpha: 1,
          phase: randomNumFrom(0, 10),
          glow: randomNumFrom(0.5, 1),
        });
      }
    }

    function getDisOf(b1: any, b2: any) {
      const dx = Math.abs(b1.x - b2.x),
        dy = Math.abs(b1.y - b2.y);
      return Math.sqrt(dx * dx + dy * dy);
    }

    function renderBalls() {
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];

        const gradient = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, R * 4);
        gradient.addColorStop(
          0,
          `rgba(${ball_color.r},${ball_color.g},${ball_color.b},${b.alpha})`
        );
        gradient.addColorStop(
          1,
          `rgba(${ball_color.r},${ball_color.g},${ball_color.b},0)`
        );

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(b.x, b.y, R * 4, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = `rgba(${ball_color.r},${ball_color.g},${ball_color.b},${b.alpha})`;
        ctx.shadowColor = `rgba(${ball_color.r},${ball_color.g},${ball_color.b},${b.alpha * 0.5})`;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(b.x, b.y, R, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    function renderLines() {
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const fraction = getDisOf(balls[i], balls[j]) / dis_limit;
          if (fraction < 1) {
            const alpha = (1 - fraction) * line_opacity;
            ctx.strokeStyle = `rgba(${line_color.r},${line_color.g},${line_color.b},${alpha})`;
            ctx.lineWidth = link_line_width;
            ctx.shadowColor = `rgba(${line_color.r},${line_color.g},${line_color.b},${alpha * 0.3})`;
            ctx.shadowBlur = 5;
            ctx.beginPath();
            ctx.moveTo(balls[i].x, balls[i].y);
            ctx.lineTo(balls[j].x, balls[j].y);
            ctx.stroke();
            ctx.closePath();
            ctx.shadowBlur = 0;
          }
        }
      }
    }

    function updateBalls() {
      const new_balls = [];
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];
        b.x += b.vx;
        b.y += b.vy;
        if (b.x > -50 && b.x < can_w + 50 && b.y > -50 && b.y < can_h + 50) {
          new_balls.push(b);
        }
        b.phase += alpha_f;
        b.alpha = Math.abs(Math.cos(b.phase));
      }
      balls = new_balls.slice(0);
    }

    function addBallIfy() {
      if (balls.length < BALL_NUM) {
        balls.push(getRandomBall());
      }
    }

    function render() {
      if (!isVisible) return;
      ctx.clearRect(0, 0, can_w, can_h);
      renderLines();
      renderBalls();
      updateBalls();
      addBallIfy();
      animationId = window.requestAnimationFrame(render);
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    initCanvas();
    initBalls(BALL_NUM);
    render();

    const handleResize = () => {
      initCanvas();
    };

    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible) {
        render();
      } else {
        window.cancelAnimationFrame(animationId);
      }
    };

    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <PublicLayout>
      <canvas
        ref={canvasRef}
        className="background-network fixed top-0 left-0 w-full h-full pointer-events-none z-0"
        style={{ opacity: 0.18 }}
      />

      <main id="main-content" className="relative z-10 w-full max-w-full overflow-x-hidden">
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />

        {/* ===== HERO ===== */}
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16 md:pt-40 md:pb-24 w-full">
          <div className="grid grid-cols-1 gap-10 items-center text-center w-full">
            {/* Left */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="w-full min-w-0 max-w-5xl mx-auto"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="inline-flex items-center gap-2 md:gap-3 mb-6 px-3 py-1.5 md:px-4 md:py-2 rounded-sm bg-emerald-300/10 border border-emerald-300/30 whitespace-nowrap"
              >
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-300 shrink-0 shadow-[0_0_10px_#6ee7b7]" />
                <span className="text-[10px] md:text-xs font-bold tracking-[0.24em] uppercase text-emerald-200">
                  #1 CPC Network
                </span>
              </motion.div>

              <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black leading-[0.98] mb-5 md:mb-7 tracking-[-0.04em] break-words">
                Pay Per Click
                <br />
                <GradientText className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl break-words">
                  Affiliate Marketplace
                </GradientText>
              </h1>

              <p className="text-sm md:text-xl text-emerald-200/80 mb-3 max-w-2xl mx-auto leading-relaxed font-medium break-words">
                Promote Offers. Generate Valid Clicks. Get Paid.
              </p>

              <p className="text-sm md:text-lg text-slate-400 mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed font-light break-words">
                Afficixo is a modern pay-per-click affiliate marketplace built
                for publishers who want to monetize their traffic through CPC
                offers. Discover campaigns, promote offers, track your clicks,
                analyze performance, and earn from valid traffic.
              </p>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8 md:mb-12 w-full"
              >
                <Link
                  href="/signup"
                  prefetch={false}
                  className="group relative w-full sm:w-auto px-7 md:px-9 py-3.5 md:py-4 bg-emerald-300 rounded-md font-bold text-[#071014] text-sm md:text-base hover:bg-emerald-200 hover:shadow-[0_0_28px_rgba(110,231,183,0.24)] transition-all duration-300 flex items-center justify-center gap-2 md:gap-3 overflow-hidden min-w-[160px]"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Join Now
                    <ArrowRight
                      className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform shrink-0"
                      aria-hidden="true"
                    />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                <Link
                  href="/publishers"
                  prefetch={false}
                  className="public-secondary-action w-full sm:w-auto px-7 md:px-9 py-3.5 md:py-4 rounded-md font-semibold text-sm md:text-base border border-emerald-100/20 text-white hover:bg-emerald-100/10 hover:border-emerald-200/50 transition-all duration-300 min-w-[160px] text-center"
                >
                  Explore Publishers
                </Link>
              </motion.div>

              {/* Trust badges */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="flex flex-wrap items-center gap-3 md:gap-6"
              >
                <div className="flex items-center gap-1.5 md:gap-2">
                  <Shield
                    className="w-3.5 h-3.5 md:w-5 md:h-5 text-indigo-400 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-xs md:text-sm text-slate-400 whitespace-nowrap">
                    Trusted Network
                  </span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2">
                  <Award
                    className="w-3.5 h-3.5 md:w-5 md:h-5 text-indigo-400 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-xs md:text-sm text-slate-400 whitespace-nowrap">
                    Premium Offers
                  </span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2">
                  <Clock
                    className="w-3.5 h-3.5 md:w-5 md:h-5 text-indigo-400 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-xs md:text-sm text-slate-400 whitespace-nowrap">
                    Weekly Payouts
                  </span>
                </div>
              </motion.div>
            </motion.div>

          </div>
        </section>

        {/* ===== WHY WORK WITH US ===== */}
        <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-24 w-full">
          <SectionHeading
            title="Why Choose Afficixo?"
            subtitle="Afficixo is built for publishers and traffic partners who want a simple, transparent way to monetize clicks and scale their CPC affiliate earnings."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8 w-full">
            {/* For Publishers */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-indigo-400/10 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 p-5 md:p-8 hover:border-indigo-400/30 transition-all duration-300 hover:-translate-y-1 w-full"
            >
              <div className="flex items-center gap-3 mb-3 md:mb-6">
                <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 shrink-0">
                  <Users
                    className="w-5 h-5 md:w-6 md:h-6 text-indigo-300 shrink-0"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-lg md:text-2xl font-bold break-words">Find CPC Offers</h3>
              </div>
              <p className="text-slate-400 text-sm md:text-base mb-4 md:mb-6 break-words">
                Browse available affiliate campaigns and choose offers that match
                your audience and traffic sources.
              </p>
              <ul className="space-y-2 md:space-y-3">
                {[
                  {
                    icon: TrendingUp,
                    text: "Relevant CPC campaigns tailored to your traffic.",
                  },
                  {
                    icon: Headphones,
                    text: "Campaigns matched to publisher audiences.",
                  },
                  {
                    icon: Eye,
                    text: "High-quality offer selection with transparent details.",
                  },
                ].map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 md:gap-3 text-sm md:text-base text-slate-300"
                  >
                    <item.icon
                      className="w-4 h-4 md:w-5 md:h-5 text-indigo-400 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span className="break-words">{item.text}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* For Advertisers */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-purple-400/10 bg-gradient-to-br from-purple-500/5 to-pink-500/5 p-5 md:p-8 hover:border-purple-400/30 transition-all duration-300 hover:-translate-y-1 w-full"
            >
              <div className="flex items-center gap-3 mb-3 md:mb-6">
                <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 shrink-0">
                  <Target
                    className="w-5 h-5 md:w-6 md:h-6 text-purple-300 shrink-0"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-lg md:text-2xl font-bold break-words">Promote Your Offers</h3>
              </div>
              <p className="text-slate-400 text-sm md:text-base mb-4 md:mb-6 break-words">
                Create affiliate links and promote selected campaigns through your
                approved traffic sources.
              </p>
              <ul className="space-y-2 md:space-y-3">
                {[
                  {
                    icon: Globe2,
                    text: "Build shareable links for every campaign.",
                  },
                  {
                    icon: LayoutDashboard,
                    text: "Use approved traffic sources with confidence.",
                  },
                  {
                    icon: LifeBuoy,
                    text: "Access assets and optimization support as you promote.",
                  },
                ].map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 md:gap-3 text-sm md:text-base text-slate-300"
                  >
                    <item.icon
                      className="w-4 h-4 md:w-5 md:h-5 text-purple-400 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span className="break-words">{item.text}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-24 w-full">
          <SectionHeading
            title="Built for Publishers"
            subtitle="Afficixo provides publishers with the tools they need to manage campaigns, monitor performance, and grow their traffic monetization."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8 w-full">
            {[
              {
                title: "Track Your Clicks",
                description:
                  "Monitor clicks and campaign performance with detailed tracking and analytics.",
                icon: LineChart,
              },
              {
                title: "Earn From Valid Traffic",
                description:
                  "Generate quality traffic and earn according to the applicable CPC rate and campaign requirements.",
                icon: Sparkles,
              },
              {
                title: "Built for Publishers",
                description:
                  "Manage offers, links, clicks, and earnings from one place and grow your traffic monetization.",
                icon: LayoutDashboard,
              },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
                viewport={{ once: true }}
                className="rounded-lg border border-emerald-100/10 bg-emerald-50/[0.03] p-5 md:p-8 hover:border-emerald-200/30 transition-colors w-full"
              >
                <div className="inline-flex items-center justify-center mb-3 h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-indigo-500/10 text-indigo-300 shrink-0">
                  <item.icon className="w-5 h-5 md:w-6 md:h-6 shrink-0" aria-hidden="true" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-white mb-2 md:mb-3 break-words">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed break-words">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ===== POPULAR VERTICALS ===== */}
        <section id="verticals" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-24 w-full">
          <SectionHeading
            title="Popular Verticals"
            subtitle="These are the hottest niches in our network right now – proven offers that convert across multiple traffic sources."
          />

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 w-full"
          >
            {[
              {
                icon: Briefcase,
                title: "Jobs",
                description:
                  "High‑converting job offers – from recruitment platforms to gig economy sign‑ups. Perfect for audiences hungry for work.",
                features: ["High‑paying campaigns", "Broad audience appeal", "Easy conversion path"],
                color: "from-blue-500/20 to-cyan-500/20",
                iconColor: "text-blue-400",
              },
              {
                icon: Gift,
                title: "Rewards",
                description:
                  "Cashback, loyalty points, and gift cards that drive engagement and retention. People love free stuff.",
                features: ["Cashback & gift cards", "High engagement", "Variety of reward types"],
                color: "from-amber-500/20 to-orange-500/20",
                iconColor: "text-amber-400",
              },
              {
                icon: CreditCard,
                title: "Credit Score",
                description:
                  "Free credit score checks that give users real value. Huge demand among personal‑finance audiences.",
                features: ["Free credit checks", "High EPC", "Finance‑focused traffic"],
                color: "from-emerald-500/20 to-green-500/20",
                iconColor: "text-emerald-400",
              },
              {
                icon: Ticket,
                title: "Sweepstakes",
                description:
                  "Giveaways, gadgets, and cash prizes – these lead‑gen powerhouses convert like crazy and keep users excited.",
                features: ["High‑converting giveaways", "Top lead‑gen potential", "Exciting prizes"],
                color: "from-pink-500/20 to-rose-500/20",
                iconColor: "text-pink-400",
              },
            ].map((vertical, idx) => (
              <motion.div key={idx} custom={idx} variants={fadeUpVariants} className="w-full">
                <div
                  className={`group relative h-full rounded-xl border border-white/10 bg-gradient-to-br ${vertical.color} backdrop-blur-lg p-4 md:p-6 hover:border-white/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/10 overflow-hidden w-full`}
                >
                  <div className="relative">
                    <div
                      className={`inline-flex p-2 md:p-3 rounded-xl bg-gradient-to-br ${vertical.color} mb-3 md:mb-4 shrink-0`}
                    >
                      <vertical.icon
                        className={`w-5 h-5 md:w-6 md:h-6 ${vertical.iconColor} shrink-0`}
                        aria-hidden="true"
                      />
                    </div>
                    <h3 className="text-base md:text-xl font-bold mb-1 md:mb-2 text-white break-words">
                      {vertical.title}
                    </h3>
                    <p className="text-xs md:text-sm text-slate-400 mb-3 md:mb-4 leading-relaxed break-words">
                      {vertical.description}
                    </p>
                    <ul className="space-y-1 md:space-y-2">
                      {vertical.features.map((feature, fi) => (
                        <li
                          key={fi}
                          className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-slate-300"
                        >
                          <Check className="w-3 h-3 text-indigo-400 shrink-0" aria-hidden="true" />
                          <span className="break-words">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ===== SERVICES ===== */}
        <section id="services" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-24 w-full">
          <SectionHeading
            title="Services That Move the Needle"
            subtitle="We've built a suite of tools and support systems designed to help you scale faster and smarter – no fluff, just what works."
          />

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full"
          >
            {[
              {
                icon: Layers,
                title: "Offer Management",
                description:
                  "Get access to curated, high‑converting offers across multiple verticals.",
                features: [
                  "Exclusive offers updated regularly",
                  "Tailored recommendations for your traffic",
                  "High‑payout campaigns",
                ],
              },
              {
                icon: LineChart,
                title: "Advanced Tracking",
                description:
                  "Real‑time analytics that tell you exactly what's working.",
                features: [
                  "Live data dashboards",
                  "Comprehensive conversion reports",
                  "Granular traffic insights",
                ],
              },
              {
                icon: Headphones,
                title: "Affiliate Support",
                description:
                  "A support team that actually knows what they're talking about.",
                features: [
                  "Dedicated account managers",
                  "Expert guidance to scale campaigns",
                  "Fast response times",
                ],
              },
            ].map((service, idx) => (
              <motion.div key={idx} custom={idx} variants={fadeUpVariants} className="w-full">
                <GlassCard className="p-5 md:p-8 h-full hover:border-indigo-400/30 transition-all duration-300 hover:-translate-y-1 w-full">
                  <div className="inline-flex p-2 md:p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 mb-3 md:mb-4 shrink-0">
                    <service.icon
                      className="w-5 h-5 md:w-6 md:h-6 text-indigo-300 shrink-0"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="text-lg md:text-xl font-bold mb-2 text-white break-words">
                    {service.title}
                  </h3>
                  <p className="text-sm md:text-base text-slate-400 mb-3 md:mb-4 break-words">
                    {service.description}
                  </p>
                  <ul className="space-y-1.5 md:space-y-2">
                    {service.features.map((feature, fi) => (
                      <li
                        key={fi}
                        className="flex items-center gap-2 text-sm md:text-base text-slate-300"
                      >
                        <Check className="w-4 h-4 text-indigo-400 shrink-0" aria-hidden="true" />
                        <span className="break-words">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ===== FAQ ===== */}
        <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-24 w-full">
          <SectionHeading title="Frequently Asked Questions" />

          <div className="space-y-3 md:space-y-4 w-full">
            {[
              {
                q: "What is Afficixo?",
                a: "Afficixo is a pay-per-click affiliate marketplace for publishers and traffic partners who want to earn from valid clicks using CPC offers.",
              },
              {
                q: "How does the Afficixo CPC marketplace work?",
                a: "Publishers discover CPC offers, generate tracking links, promote campaigns, and earn when valid traffic converts according to offer rules.",
              },
              {
                q: "How do publishers earn with Afficixo?",
                a: "Publishers earn money from valid clicks delivered to CPC affiliate offers. The more quality traffic you send, the more you can earn.",
              },
              {
                q: "What are CPC affiliate offers?",
                a: "CPC affiliate offers pay publishers for each valid click or visit that meets the campaign's traffic and quality requirements.",
              },
              {
                q: "How are clicks tracked?",
                a: "Clicks are tracked with secure affiliate links and reporting tools that record visitor activity, traffic sources, and campaign performance in real time.",
              },
              {
                q: "What is considered a valid click?",
                a: "A valid click is traffic that meets the offer's rules, including approved sources, geo requirements, and anti-fraud checks.",
              },
              {
                q: "How do I create an affiliate link?",
                a: "Once you are approved, create tracking links from the dashboard, then promote those links across your website, social media, and other approved channels.",
              },
              {
                q: "How can I promote Afficixo offers?",
                a: "Promote offers using your approved traffic sources such as websites, social media, email, and display placements while following campaign guidelines.",
              },
              {
                q: "How can I check my click statistics?",
                a: "Your dashboard shows detailed analytics for clicks, earnings, campaign performance, and traffic quality so you can optimize in real time.",
              },
              {
                q: "When are publisher payments processed?",
                a: "Payments are processed based on your account terms and performance schedule, with updates visible in your earnings dashboard.",
              },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.04 }}
                viewport={{ once: true }}
                className="rounded-xl border border-white/10 bg-white/5 p-4 md:p-6 hover:border-indigo-400/20 transition-colors w-full"
              >
                <h3 className="text-sm md:text-lg font-semibold text-white mb-1.5 md:mb-2 break-words">
                  {item.q}
                </h3>
                <p className="text-sm md:text-base text-slate-400 leading-relaxed break-words">
                  {item.a}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

      </main>
    </PublicLayout>
  );
}