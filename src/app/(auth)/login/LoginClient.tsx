"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { markManagerTelegramPopupPending } from "@/lib/utils/telegram-popup";
import { getDashboardPath } from "@/lib/auth/dashboard-path";
import { User, Lock, ArrowLeft, AlertCircle, Rocket, ArrowRight, CheckCircle2, Clock3 } from "lucide-react";

// Mobile‑optimised particle count (lower on small screens)
const BALL_NUM = typeof window !== 'undefined' && window.innerWidth < 768 ? 20 : 35;

const GOOGLE_BUTTON_CLASS = "group flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:border-indigo-400/40 hover:bg-white/10 hover:shadow-lg hover:shadow-indigo-500/20";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [supportTelegram, setSupportTelegram] = useState("");
  const [approvalPendingNotice, setApprovalPendingNotice] = useState(false);
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // ─── OPTIMISED PARTICLE NETWORK ───
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap at 2x for performance

    let width: number, height: number;
    let balls: any[] = [];

    // Throttle to ~30 FPS on mobile
    const TARGET_FPS = 30;
    const FRAME_INTERVAL = 1000 / TARGET_FPS;
    let lastFrameTime = 0;

    const R = 2.5;
    const dis_limit = 280;
    const link_line_width = 1.0;
    const alpha_f = 0.025;

    const ball_color = { r: 0, g: 255, b: 100 };
    const line_color = { r: 255, g: 255, b: 255 };

    // Reusable random helpers (created once)
    const randomNumFrom = (min: number, max: number) => Math.random() * (max - min) + min;
    const randomSidePos = (length: number) => Math.ceil(Math.random() * length);
    const randomArrayItem = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

    const getRandomSpeed = (pos: string) => {
      const min = -0.8, max = 0.8;
      switch (pos) {
        case "top":    return [randomNumFrom(min, max), randomNumFrom(0.2, max)];
        case "right":  return [randomNumFrom(min, -0.2), randomNumFrom(min, max)];
        case "bottom": return [randomNumFrom(min, max), randomNumFrom(min, -0.2)];
        case "left":   return [randomNumFrom(0.2, max), randomNumFrom(min, max)];
        default:       return [0, 0];
      }
    };

    const getRandomBall = () => {
      const pos = randomArrayItem(["top", "right", "bottom", "left"]);
      switch (pos) {
        case "top":
          return { x: randomSidePos(width), y: -R, vx: getRandomSpeed("top")[0], vy: getRandomSpeed("top")[1], r: R, alpha: 1, phase: randomNumFrom(0, 10), glow: randomNumFrom(0.5, 1) };
        case "right":
          return { x: width + R, y: randomSidePos(height), vx: getRandomSpeed("right")[0], vy: getRandomSpeed("right")[1], r: R, alpha: 1, phase: randomNumFrom(0, 10), glow: randomNumFrom(0.5, 1) };
        case "bottom":
          return { x: randomSidePos(width), y: height + R, vx: getRandomSpeed("bottom")[0], vy: getRandomSpeed("bottom")[1], r: R, alpha: 1, phase: randomNumFrom(0, 10), glow: randomNumFrom(0.5, 1) };
        case "left":
          return { x: -R, y: randomSidePos(height), vx: getRandomSpeed("left")[0], vy: getRandomSpeed("left")[1], r: R, alpha: 1, phase: randomNumFrom(0, 10), glow: randomNumFrom(0.5, 1) };
      }
    };

    const initCanvas = () => {
      // Use logical size, but scale canvas by dpr (capped)
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    const initBalls = (num: number) => {
      balls = [];
      for (let i = 0; i < num; i++) {
        balls.push({
          x: randomSidePos(width),
          y: randomSidePos(height),
          vx: getRandomSpeed("top")[0],
          vy: getRandomSpeed("top")[1],
          r: R,
          alpha: 1,
          phase: randomNumFrom(0, 10),
          glow: randomNumFrom(0.5, 1),
        });
      }
    };

    const getDisOf = (b1: any, b2: any) => {
      const dx = b1.x - b2.x, dy = b1.y - b2.y;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const renderBalls = () => {
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];
        // Glow – reduce size on mobile
        const glowRadius = R * (width < 768 ? 2.5 : 4);
        const gradient = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, glowRadius);
        gradient.addColorStop(0, `rgba(${ball_color.r},${ball_color.g},${ball_color.b},${b.alpha})`);
        gradient.addColorStop(1, `rgba(${ball_color.r},${ball_color.g},${ball_color.b},0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(b.x, b.y, glowRadius, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();

        // Core dot – skip shadow on mobile
        ctx.fillStyle = `rgba(${ball_color.r},${ball_color.g},${ball_color.b},${b.alpha})`;
        if (width >= 768) {
          ctx.shadowColor = `rgba(${ball_color.r},${ball_color.g},${ball_color.b},${b.alpha * 0.5})`;
          ctx.shadowBlur = 10;
        }
        ctx.beginPath();
        ctx.arc(b.x, b.y, R, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    const renderLines = () => {
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const fraction = getDisOf(balls[i], balls[j]) / dis_limit;
          if (fraction < 1) {
            const alpha = (1 - fraction) * 0.6;
            ctx.strokeStyle = `rgba(${line_color.r},${line_color.g},${line_color.b},${alpha})`;
            ctx.lineWidth = link_line_width;
            ctx.beginPath();
            ctx.moveTo(balls[i].x, balls[i].y);
            ctx.lineTo(balls[j].x, balls[j].y);
            ctx.stroke();
          }
        }
      }
    };

    const updateBalls = () => {
      const newBalls = [];
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];
        b.x += b.vx;
        b.y += b.vy;
        if (b.x > -50 && b.x < width + 50 && b.y > -50 && b.y < height + 50) {
          newBalls.push(b);
        }
        b.phase += alpha_f;
        b.alpha = Math.abs(Math.cos(b.phase));
      }
      balls = newBalls;
      if (balls.length < BALL_NUM) {
        balls.push(getRandomBall());
      }
    };

    const render = (timestamp: number) => {
      // Frame rate throttling
      if (timestamp - lastFrameTime < FRAME_INTERVAL) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }
      lastFrameTime = timestamp;

      ctx.clearRect(0, 0, width, height);
      renderLines();
      renderBalls();
      updateBalls();
      animationRef.current = requestAnimationFrame(render);
    };

    // ─── INIT ───
    initCanvas();
    initBalls(BALL_NUM);
    animationRef.current = requestAnimationFrame(render);

    // ─── RESIZE (throttled) ───
    let resizeTimeout: number;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        initCanvas();
        initBalls(balls.length);
      }, 200);
    };
    window.addEventListener("resize", handleResize);

    // ─── CLEANUP ───
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimeout);
      ctx.clearRect(0, 0, width, height);
      balls = [];
    };
  }, []);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    const successParam = searchParams.get("success");
    const approvalPending = searchParams.get("approval_pending") === "1";
    setApprovalPendingNotice(approvalPending);

    if (errorParam === "google_auth_failed") {
      setError("Google sign-in could not be completed. Try again or sign in with your username and password.");
    } else if (errorParam === "missing_code") {
      setError("Google returned an incomplete sign-in response. Please try again.");
    } else if (errorParam === "google_account_not_found") {
      setError("No approved account was found for that Google email. Sign up first or use another sign-in method.");
    } else if (approvalPending) {
      setError("Your manager account is awaiting owner approval. You can sign in once the owner approves it.");
    } else {
      setError("");
    }

    if (successParam === "google-authenticated") {
      setSuccess("Google sign-in complete. Redirecting you to your dashboard...");
      const redirectPath = searchParams.get("redirect") || getDashboardPath(null);
      const timer = window.setTimeout(() => {
        router.replace(redirectPath);
      }, 1000);
      return () => window.clearTimeout(timer);
    }

    setSuccess("");
  }, [router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSupportTelegram("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        const loginError = new Error(data.error || "Login failed") as Error & { supportTelegram?: string };
        loginError.supportTelegram = data.supportTelegram;
        throw loginError;
      }

      if (data?.user?.role === "MANAGER") {
        markManagerTelegramPopupPending(window);
      }

      setSuccess("Welcome back. Redirecting you to your dashboard...");
      window.setTimeout(() => {
        router.push(getDashboardPath(data?.user?.role));
      }, 500);
    } catch (err: any) {
      setSuccess("");
      setError(err.message || "We could not sign you in. Check your details and try again.");
      setSupportTelegram(err.supportTelegram || "");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-site relative min-h-screen w-full bg-[#071014] text-white overflow-hidden">
      {/* ─── CANVAS BACKGROUND ─── */}
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
        style={{ opacity: 0.8, willChange: 'transform' }}
      />

      {/* ─── GRADIENT OVERLAYS ─── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#05070b]/80 via-[#0d1724]/60 to-[#101827]/80" />
        <motion.div
          className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-gradient-radial from-indigo-900/30 via-transparent to-transparent blur-3xl"
          animate={{ x: [0, 60, -30, 0], y: [0, -40, 20, 0], opacity: [0.6, 1, 0.6, 0.6] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/3 right-0 w-[600px] h-[600px] bg-gradient-radial from-purple-700/20 via-transparent to-transparent blur-3xl"
          animate={{ x: [0, -50, 30, 0], y: [0, 30, -20, 0], opacity: [0.4, 0.8, 0.4, 0.4] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        <motion.div
          className="absolute bottom-0 right-1/3 w-[700px] h-[700px] bg-gradient-radial from-pink-900/15 via-transparent to-transparent blur-3xl"
          animate={{ x: [0, 40, -60, 0], y: [0, -20, 30, 0], opacity: [0.3, 0.7, 0.3, 0.3] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8">
        <motion.div
          className="w-full max-w-md mb-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-all hover:gap-3 group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to home
          </Link>
        </motion.div>

        <motion.div
          className="auth-card w-full max-w-md rounded-lg bg-white/5 backdrop-blur-xl p-8 shadow-2xl shadow-indigo-500/5 hover:shadow-indigo-500/10 transition-shadow duration-500 border border-white/5"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="flex items-center justify-center"
              >
                <Image
                  src="/afficixo-logo.png"
                  alt="Afficixo logo"
                  width={150}
                  height={44}
                  className="object-contain"
                  priority
                />
              </motion.div>
              <p className="mt-1 text-sm text-slate-400">Use your credentials or continue with Google.</p>
            </div>

            {error && (
              <div role="alert" className={`flex items-start gap-2 rounded-md border p-3 text-sm backdrop-blur ${approvalPendingNotice || supportTelegram ? "border-amber-400/25 bg-amber-500/10 text-amber-100" : "border-red-400/25 bg-red-500/10 text-red-200"}`}>
                {approvalPendingNotice ? <Clock3 className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" /> : <AlertCircle className={`mt-0.5 h-4 w-4 flex-shrink-0 ${supportTelegram ? "text-amber-300" : ""}`} />}
                <div className="min-w-0 flex-1">
                  {supportTelegram ? (
                    <>
                      <p className="font-semibold text-amber-100">Account access is paused</p>
                      <p className="mt-1 leading-6 text-amber-100/80">Please contact support to request reactivation.</p>
                    </>
                  ) : (
                    <p className="leading-6">{error}</p>
                  )}
                  {supportTelegram && (
                    <a
                      href={`https://t.me/${supportTelegram}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-[#55b8ec]/40 bg-[#0088cc] px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-[#0088cc]/20 transition hover:-translate-y-0.5 hover:bg-[#0077b5] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#55b8ec]/70 focus:ring-offset-2 focus:ring-offset-slate-950"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-current">
                        <path d="M21.7 3.4 18.6 20c-.2 1.2-.9 1.5-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L6 13.6 1.1 12c-1.1-.3-1.1-1 .2-1.5L20.4 3c.9-.3 1.7.2 1.3.4Z" />
                      </svg>
                      Contact @{supportTelegram} on Telegram
                    </a>
                  )}
                </div>
              </div>
            )}

            {success && (
              <div role="status" aria-live="polite" className="flex items-start gap-2 rounded-md border border-emerald-400/25 bg-emerald-500/10 p-3 text-sm text-emerald-200 backdrop-blur">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span className="leading-6">{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
                <div className="relative group">
                  <User strokeWidth={2.2} className="auth-field-icon pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="auth-input w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 pl-10 text-white placeholder-slate-500 backdrop-blur-sm focus:border-indigo-400/50 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 transition-all duration-300 hover:border-white/20"
                    placeholder="Enter your username"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                <div className="relative group">
                  <Lock strokeWidth={2.2} className="auth-field-icon pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="auth-input w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 pl-10 text-white placeholder-slate-500 backdrop-blur-sm focus:border-indigo-400/50 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 transition-all duration-300 hover:border-white/20"
                    placeholder="Enter your password"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="auth-submit group relative w-full overflow-hidden rounded-md bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-6 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/40 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <>
                      <Rocket className="h-4 w-4" />
                      Sign in
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </button>

              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-500">
                <div className="h-px flex-1 bg-white/10" />
                <span>or</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <button
                type="button"
                disabled={googleLoading || loading}
                onClick={() => {
                  setGoogleLoading(true);
                  window.location.assign('/api/auth/google/start?redirect=/admin/dashboard');
                }}
                className={`${GOOGLE_BUTTON_CLASS} ${googleLoading ? "cursor-wait opacity-80" : ""}`}
              >
                {googleLoading ? (
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M21.6 12.23c0-.78-.07-1.53-.2-2.25H12v4.26h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.98-4.33 2.98-7.53Z" />
                    <path fill="#34A853" d="M12 22c2.7 0 4.96-.89 6.62-2.41l-3.24-2.5c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.75-5.59-4.11H2.9v2.58A10 10 0 0 0 12 22Z" />
                    <path fill="#FBBC05" d="M6.41 13.94A6.02 6.02 0 0 1 6.41 10.06V7.48H2.9A10 10 0 0 0 2 12c0 1.62.39 3.15 1.09 4.52l3.32-2.58Z" />
                    <path fill="#EA4335" d="M12 6.04c1.47 0 2.79.5 3.83 1.49l2.87-2.87A9.96 9.96 0 0 0 12 2A10 10 0 0 0 2.9 7.48l3.51 2.58c.79-2.36 2.99-4.11 5.59-4.11Z" />
                  </svg>
                )}
                <span>{googleLoading ? "Redirecting to Google..." : "Continue with Google"}</span>
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}