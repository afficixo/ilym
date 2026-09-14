"use client" // Client Component – relies on browser APIs, hooks and interactivity

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { getDashboardPath } from "@/lib/auth/dashboard-path"
import {
  ArrowLeft,
  ArrowRight,
  Lock,
  User,
  Mail,
  PhoneCall,
  Send,
  Rocket,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react"
import { motion } from "framer-motion"

export default function SignupClient() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const [fullName, setFullName] = useState("")
  const [contractNumber, setContractNumber] = useState("")
  const [telegramUsername, setTelegramUsername] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [captchaAnswer, setCaptchaAnswer] = useState("")
  const [captchaPrompt, setCaptchaPrompt] = useState("3 + 4")
  const [captchaValue, setCaptchaValue] = useState(7)
  const [captchaError, setCaptchaError] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [contractError, setContractError] = useState("")
  const [isMobile, setIsMobile] = useState(false)

  // Mobile detection
  useEffect(() => {
    setIsMobile(typeof window !== "undefined" && window.innerWidth < 768)
  }, [])

  const BALL_NUM = isMobile ? 20 : 35

  // ─── OPTIMISED PARTICLE NETWORK (unchanged) ───
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    let width: number, height: number
    let balls: any[] = []

    const TARGET_FPS = 30
    const FRAME_INTERVAL = 1000 / TARGET_FPS
    let lastFrameTime = 0

    const R = 2.5
    const dis_limit = 280
    const link_line_width = 1.0
    const alpha_f = 0.025

    const ball_color = { r: 0, g: 255, b: 100 }
    const line_color = { r: 255, g: 255, b: 255 }

    const randomNumFrom = (min: number, max: number) => Math.random() * (max - min) + min
    const randomSidePos = (length: number) => Math.ceil(Math.random() * length)
    const randomArrayItem = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)]

    const getRandomSpeed = (pos: string) => {
      const min = -0.8, max = 0.8
      switch (pos) {
        case "top":    return [randomNumFrom(min, max), randomNumFrom(0.2, max)]
        case "right":  return [randomNumFrom(min, -0.2), randomNumFrom(min, max)]
        case "bottom": return [randomNumFrom(min, max), randomNumFrom(min, -0.2)]
        case "left":   return [randomNumFrom(0.2, max), randomNumFrom(min, max)]
        default:       return [0, 0]
      }
    }

    const getRandomBall = () => {
      const pos = randomArrayItem(["top", "right", "bottom", "left"])
      switch (pos) {
        case "top":
          return { x: randomSidePos(width), y: -R, vx: getRandomSpeed("top")[0], vy: getRandomSpeed("top")[1], r: R, alpha: 1, phase: randomNumFrom(0, 10), glow: randomNumFrom(0.5, 1) }
        case "right":
          return { x: width + R, y: randomSidePos(height), vx: getRandomSpeed("right")[0], vy: getRandomSpeed("right")[1], r: R, alpha: 1, phase: randomNumFrom(0, 10), glow: randomNumFrom(0.5, 1) }
        case "bottom":
          return { x: randomSidePos(width), y: height + R, vx: getRandomSpeed("bottom")[0], vy: getRandomSpeed("bottom")[1], r: R, alpha: 1, phase: randomNumFrom(0, 10), glow: randomNumFrom(0.5, 1) }
        case "left":
          return { x: -R, y: randomSidePos(height), vx: getRandomSpeed("left")[0], vy: getRandomSpeed("left")[1], r: R, alpha: 1, phase: randomNumFrom(0, 10), glow: randomNumFrom(0.5, 1) }
      }
    }

    const initCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.scale(dpr, dpr)
    }

    const initBalls = (num: number) => {
      balls = []
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
        })
      }
    }

    const getDisOf = (b1: any, b2: any) => {
      const dx = b1.x - b2.x, dy = b1.y - b2.y
      return Math.sqrt(dx * dx + dy * dy)
    }

    const renderBalls = () => {
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i]
        const glowRadius = R * (width < 768 ? 2.5 : 4)
        const gradient = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, glowRadius)
        gradient.addColorStop(0, `rgba(${ball_color.r},${ball_color.g},${ball_color.b},${b.alpha})`)
        gradient.addColorStop(1, `rgba(${ball_color.r},${ball_color.g},${ball_color.b},0)`)
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(b.x, b.y, glowRadius, 0, Math.PI * 2, true)
        ctx.closePath()
        ctx.fill()

        ctx.fillStyle = `rgba(${ball_color.r},${ball_color.g},${ball_color.b},${b.alpha})`
        if (width >= 768) {
          ctx.shadowColor = `rgba(${ball_color.r},${ball_color.g},${ball_color.b},${b.alpha * 0.5})`
          ctx.shadowBlur = 10
        }
        ctx.beginPath()
        ctx.arc(b.x, b.y, R, 0, Math.PI * 2, true)
        ctx.closePath()
        ctx.fill()
        ctx.shadowBlur = 0
      }
    }

    const renderLines = () => {
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const fraction = getDisOf(balls[i], balls[j]) / dis_limit
          if (fraction < 1) {
            const alpha = (1 - fraction) * 0.6
            ctx.strokeStyle = `rgba(${line_color.r},${line_color.g},${line_color.b},${alpha})`
            ctx.lineWidth = link_line_width
            ctx.beginPath()
            ctx.moveTo(balls[i].x, balls[i].y)
            ctx.lineTo(balls[j].x, balls[j].y)
            ctx.stroke()
          }
        }
      }
    }

    const updateBalls = () => {
      const newBalls = []
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i]
        b.x += b.vx
        b.y += b.vy
        if (b.x > -50 && b.x < width + 50 && b.y > -50 && b.y < height + 50) {
          newBalls.push(b)
        }
        b.phase += alpha_f
        b.alpha = Math.abs(Math.cos(b.phase))
      }
      balls = newBalls
      if (balls.length < BALL_NUM) {
        balls.push(getRandomBall())
      }
    }

    const render = (timestamp: number) => {
      if (timestamp - lastFrameTime < FRAME_INTERVAL) {
        animationRef.current = requestAnimationFrame(render)
        return
      }
      lastFrameTime = timestamp

      ctx.clearRect(0, 0, width, height)
      renderLines()
      renderBalls()
      updateBalls()
      animationRef.current = requestAnimationFrame(render)
    }

    initCanvas()
    initBalls(BALL_NUM)
    animationRef.current = requestAnimationFrame(render)

    let resizeTimeout: number
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = window.setTimeout(() => {
        initCanvas()
        initBalls(balls.length)
      }, 200)
    }
    window.addEventListener("resize", handleResize)

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      window.removeEventListener("resize", handleResize)
      clearTimeout(resizeTimeout)
      ctx.clearRect(0, 0, width, height)
      balls = []
    }
  }, [BALL_NUM])

  const generateCaptcha = useCallback(() => {
    const first = Math.floor(Math.random() * 9) + 1
    const second = Math.floor(Math.random() * 9) + 1
    setCaptchaPrompt(`${first} + ${second}`)
    setCaptchaValue(first + second)
    setCaptchaAnswer("")
    setCaptchaError("")
  }, [])

  useEffect(() => {
    generateCaptcha()
  }, [generateCaptcha])

  useEffect(() => {
    setError("")
    setSuccess("")
    setContractError("")
  }, [router])

  // Contract number length varies by geography and operator.
  const validateContractNumber = (value: string) => {
    if (!/^\d+$/.test(value)) {
      return "Contract Number must contain digits only"
    }
    return ""
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setCaptchaError("")
    setContractError("")

    const contractErr = validateContractNumber(contractNumber)

    if (contractErr) setContractError(contractErr)
    if (contractErr) return

    const answer = Number(captchaAnswer)
    if (!Number.isInteger(answer) || answer !== captchaValue) {
      setCaptchaError("Please solve the captcha correctly before continuing.")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          contractNumber,
          telegramUsername,
          username,
          email,
          password,
          captchaPrompt,
          captchaAnswer: answer,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Signup failed")
      }

      if (data?.requiresApproval) {
        setSuccess(
          "Account created. Your manager account is pending contract approval. You can sign in after it has been approved."
        )
        window.setTimeout(() => {
          router.push("/login?approval_pending=1")
        }, 1200)
        return
      }

      setSuccess("Account created. Redirecting you to your dashboard...")
      window.setTimeout(() => {
        router.push(getDashboardPath(data?.user?.role))
      }, 500)
    } catch (err: any) {
      setSuccess("")
      setError(err.message || "We could not create your account. Check your details and try again.")
    } finally {
      setLoading(false)
    }
  }

  // Handlers – strip non-digit and clear errors
  const handleContractChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "")
    setContractNumber(value)
    if (contractError) setContractError("")
  }

  return (
    <div className="auth-site relative min-h-screen w-full bg-[#071014] text-white overflow-hidden">
      {/* Canvas background – particle network */}
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
        style={{ opacity: 0.8, willChange: "transform" }}
      />

      {/* Animated gradient overlays */}
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
        {/* Back to home */}
        <motion.div
          className="w-full max-w-sm mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-all hover:gap-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </motion.div>

        {/* Glass card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="auth-card w-full max-w-[440px] rounded-lg bg-white/5 backdrop-blur-xl p-5 shadow-2xl shadow-indigo-500/5 hover:shadow-indigo-500/10 transition-shadow duration-500 border border-white/5"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <Image
                src="/afficixo-logo.png"
                alt="Afficixo logo"
                width={120}
                height={35}
                className="object-contain"
                priority
              />
            </div>

            {/* Error message */}
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-md border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-200 backdrop-blur">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span className="leading-6">{error}</span>
              </div>
            )}

            {/* Success message */}
            {success && (
              <div role="status" aria-live="polite" className="flex items-start gap-2 rounded-md border border-emerald-400/25 bg-emerald-500/10 p-3 text-sm text-emerald-200 backdrop-blur">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span className="leading-6">{success}</span>
              </div>
            )}

              <p className="auth-hint text-sm text-slate-400">Complete the secure registration form below. Your manager account will be reviewed and approved by the owner.</p>

            <form onSubmit={handleSubmit} className="space-y-2.5">
              {/* Full name */}
              <div>
                <label className="sr-only" htmlFor="fullName">Full name</label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="auth-input w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 pl-10 text-white placeholder-slate-500 focus:border-indigo-400/50 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 transition-all duration-300 hover:border-white/20"
                    placeholder="Full name"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="sr-only" htmlFor="email">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 pl-10 text-white placeholder-slate-500 focus:border-indigo-400/50 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 transition-all duration-300 hover:border-white/20"
                    placeholder="Email address"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Contract Number with variable length */}
              <div>
                <label className="sr-only" htmlFor="contractNumber">Contract Number</label>
                <div className="relative group">
                  <PhoneCall className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="contractNumber"
                    type="text"
                    inputMode="numeric"
                    value={contractNumber}
                    onChange={handleContractChange}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 pl-10 text-white placeholder-slate-500 focus:border-indigo-400/50 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 transition-all duration-300 hover:border-white/20"
                    placeholder="Enter your contract number"
                    required
                    disabled={loading}
                  />
                </div>
                {contractError && <p className="mt-1 text-xs text-rose-400">{contractError}</p>}
              </div>

              {/* Telegram username */}
              <div>
                <label className="sr-only" htmlFor="telegram">Telegram username</label>
                <div className="relative group">
                  <Send className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="telegram"
                    type="text"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 pl-10 text-white placeholder-slate-500 focus:border-indigo-400/50 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 transition-all duration-300 hover:border-white/20"
                    placeholder="Telegram username"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="sr-only" htmlFor="username">Username</label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 pl-10 text-white placeholder-slate-500 focus:border-indigo-400/50 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 transition-all duration-300 hover:border-white/20"
                    placeholder="Choose a username"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password with show/hide toggle */}
              <div>
                <label className="sr-only" htmlFor="password">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 pl-10 pr-10 text-white placeholder-slate-500 focus:border-indigo-400/50 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 transition-all duration-300 hover:border-white/20"
                    placeholder="Create a strong password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Captcha */}
              <div className="mb-3 flex items-center justify-between gap-2 rounded-xl bg-black/20 px-3 py-1.5 text-sm text-white w-full">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-indigo-200">{captchaPrompt}</span>
                  <span className="text-slate-400">=</span>
                </div>
                <input
                  type="number"
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  className="w-28 rounded border border-white/10 bg-white/10 px-3 py-1.5 text-white placeholder-slate-500 focus:border-indigo-400/50 focus:outline-none"
                  placeholder="Answer"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={generateCaptcha}
                  className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-indigo-300 transition-colors duration-200 hover:bg-white/15 hover:text-indigo-200"
                  disabled={loading}
                  aria-label="Refresh captcha"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              {captchaError && <div className="text-sm text-rose-300">{captchaError}</div>}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="auth-submit relative w-full overflow-hidden rounded-md bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-6 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 hover:shadow-2xl hover:shadow-purple-500/40 disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <>
                      <Rocket className="h-4 w-4" />
                      Sign up
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* Sign in link */}
            <div className="border-t border-white/10 pt-5 text-center text-sm text-slate-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-indigo-300 hover:text-indigo-200 underline underline-offset-2"
              >
                Sign in
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-sm mt-6 text-center text-xs text-slate-500 border-t border-white/5 pt-4"
        >
          <span>© 2026 Afficixo. All rights reserved.</span>
        </motion.div>
      </div>
    </div>
  )
}