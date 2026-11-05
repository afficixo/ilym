"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import PublicLayout from "@/components/layout/PublicLayout";
import {
  TrendingUp, Target, LineChart,
  ArrowRight, Layers, Headphones, Mail, MapPin, Check,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function HomePage() {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "success">("idle");
  const [submitError, setSubmitError] = useState("");

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.firstName.trim()) next.firstName = "Please enter your first name.";
    if (!form.lastName.trim()) next.lastName = "Please enter your last name.";
    if (!form.email.trim()) next.email = "Please enter your e-mail.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) next.email = "Please enter a valid e-mail address.";
    if (!form.message.trim()) next.message = "Please write a short message.";
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;
    setStatus("sending");
    setSubmitError("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to send your message. Please try again.");
      setStatus("success");
      setForm({ firstName: "", lastName: "", email: "", message: "" });
      window.setTimeout(() => setStatus("idle"), 4000);
    } catch (error) {
      setStatus("idle");
      setSubmitError(error instanceof Error ? error.message : "Unable to send your message. Please try again.");
    }
  };

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  };

  return (
    <PublicLayout>
      <main>
        {/* HERO */}
        <section id="home" aria-labelledby="home-heading" className="relative overflow-hidden bg-[#0f172a] pt-32 pb-24 md:pt-44 md:pb-32">
          <Image
            src="/header_image.webp"
            alt=""
            fill
            fetchPriority="high"
            sizes="100vw"
            className="home-hero-background pointer-events-none object-cover"
            style={{ objectPosition: "center 44%" }}
          />
          <div className="home-hero-overlay pointer-events-none absolute inset-0" aria-hidden="true" />

          <div className="home-hero-content relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-left">
            <motion.h1
              id="home-heading"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="font-[Montserrat] text-4xl sm:text-5xl md:text-7xl font-black leading-[1.05] tracking-tight text-white mb-6"
            >
              Join the <span className="text-[#5ff442]">leading</span>
              <br />
              affiliate network
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="mb-10 max-w-2xl text-base leading-relaxed text-white/75 md:text-lg"
            >
              Discover our exclusive private network. Even if you are a publisher or
              advertiser we have solutions for everyone.
            </motion.p>

            <div className="home-hero-actions-shell">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="flex flex-col items-start gap-3 sm:flex-row"
              >
                <Link
                  href="/signup"
                  prefetch={false}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-[#5ff442] px-8 py-3.5 text-base font-bold text-[#263238] transition-all hover:bg-[#4dd935] hover:-translate-y-0.5 w-full sm:w-auto"
                >
                  Sign up
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#contact"
                  className="inline-flex items-center justify-center rounded-md border border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10 w-full sm:w-auto"
                >
                  Contact us
                </a>
              </motion.div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="about" aria-label="About" className="bg-[#e6ebed] py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-8 lg:grid-cols-4">
              {[
                {
                  icon: (
                    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className="h-7 w-7">
                      <path d="M24 5.5 29.6 17l12.7 1.8-9.2 9 2.2 12.7L24 34.5l-11.3 6 2.2-12.7-9.2-9L18.4 17 24 5.5Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
                      <path d="m24 5.5 5.6 11.4 12.7 1.9-9.2 9 2.2 12.7L24 34.5V5.5Z" fill="#5ff442" fillOpacity=".35" />
                    </svg>
                  ),
                  title: "Exclusive campaigns",
                  body: "Our approach is to provide you only high quality and exclusive campaigns, here you will find a lot.",
                },
                {
                  icon: (
                    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className="h-7 w-7">
                      <rect x="6" y="7" width="36" height="34" rx="5" stroke="currentColor" strokeWidth="2.5" />
                      <path d="M6 16h36" stroke="currentColor" strokeWidth="2.5" />
                      <circle cx="12" cy="11.5" r="1" fill="#5ff442" />
                      <path d="m13 32 7-7 5 4 10-9" stroke="#359f25" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M31 20h4v4" stroke="#359f25" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                  title: "In-house platform",
                  body: "Adaptable to anything and being able to provide the most user-friendly experience through it.",
                },
                {
                  icon: (
                    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className="h-7 w-7">
                      <path d="M8 39V27h8v12M20 39V19h8v20M32 39V9h8v30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="m8 20 11-8 8 3 13-9" stroke="#359f25" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M34 6h6v6" stroke="#359f25" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                  title: "Top verticals",
                  body: "We strive to be the best so we are always adding campaigns from top-performing verticals.",
                },
                {
                  icon: (
                    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className="h-7 w-7">
                      <rect x="5.5" y="11" width="37" height="27" rx="4" stroke="currentColor" strokeWidth="2.5" />
                      <path d="M6 19h36" stroke="currentColor" strokeWidth="2.5" />
                      <path d="M12 29h10" stroke="#359f25" strokeWidth="2.5" strokeLinecap="round" />
                      <circle cx="34" cy="29" r="3" fill="#5ff442" stroke="#359f25" strokeWidth="2" />
                    </svg>
                  ),
                  title: "Quick payments",
                  body: "You have a wide selection of payment methods and you can qualify for faster payment terms.",
                },
              ].map((f, i) => (
                <motion.div
                  key={f.title}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-40px" }}
                  variants={fadeUp}
                  className="text-center"
                >
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-white text-[#263238] shadow-sm">
                    {f.icon}
                  </div>
                  <h2 className="font-[Montserrat] text-base font-bold text-[#263238] mb-2">{f.title}</h2>
                  <p className="text-sm leading-relaxed text-[#455964]">{f.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* PUBLISHERS */}
        <section id="publishers" aria-labelledby="publishers-heading" className="bg-white py-20 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="order-2 lg:order-1"
              >
                <h2 id="publishers-heading" className="font-[Montserrat] text-3xl md:text-4xl font-extrabold text-[#263238] mb-4">
                  Publishers
                </h2>
                <div className="h-[3px] w-8 rounded-sm bg-[#5ff442] mb-5" />
                <p className="text-base md:text-[17px] leading-relaxed text-[#455964] mb-4">
                  Having a large experience with Publishers, we provide top-notch
                  technology and the ability to profit the most from your traffic.
                </p>
                <p className="text-base leading-relaxed text-[#455964] mb-8">
                  We help you find the right target for any type of traffic, providing
                  you tens of verticals and thousands of different campaigns. Our
                  experienced managers will solve any difficulty you might encounter
                  while promoting as well as suggesting you top performing verticals
                  and promotion channels.
                </p>
                <Link
                  href="/signup"
                  prefetch={false}
                  className="inline-flex items-center gap-2 rounded-md bg-[#263238] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#1a2429] hover:-translate-y-0.5"
                >
                  Sign up
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="order-1 lg:order-2"
              >
                <PublisherIllustration />
              </motion.div>
            </div>
          </div>
        </section>

        {/* WHY BECOME A PUBLISHER */}
        <section id="services" aria-labelledby="services-heading" className="bg-[#e6ebed] py-20 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h2 id="services-heading" className="font-[Montserrat] text-2xl md:text-[28px] font-extrabold text-[#263238]">
                Why become a Publisher?
              </h2>
              <div className="mx-auto mt-4 h-[3px] w-8 rounded-sm bg-[#5ff442]" />
            </motion.div>

            <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: TrendingUp, title: "Competitive payouts", body: "We are always looking and adjust the payouts to be over the rest of the industry." },
                { icon: Target, title: "Private programs", body: "Besides the mainstream campaigns and programs, we offer you private affiliate programs." },
                { icon: LineChart, title: "Accurate reports", body: "Our platform is analyzing your traffic and provides comprehensive performance reports." },
                { icon: ArrowRight, title: "Smart redirect", body: "Never miss a conversion! Not eligible visitors are sent to the most profitable alternative." },
                { icon: Layers, title: "Developer tools", body: "We are able to provide adaptable real-time tools such as OfferWall, API Feed, S2S Postback, etc." },
                { icon: Headphones, title: "First-rate support", body: "Our team is working 24/7 to answer and fix any issues for you in no time." },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-40px" }}
                  variants={fadeUp}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <item.icon className="h-5 w-5 shrink-0 text-[#0e7a4d]" aria-hidden="true" />
                    <h3 className="font-[Montserrat] text-base font-bold text-[#263238]">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-sm leading-relaxed text-[#455964] pl-7">{item.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ADVERTISERS */}
        <section id="advertisers" aria-labelledby="advertisers-heading" className="bg-white py-20 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <AdvertiserIllustration />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 id="advertisers-heading" className="font-[Montserrat] text-3xl md:text-4xl font-extrabold text-[#263238] mb-4">
                  Advertisers
                </h2>
                <div className="h-[3px] w-8 rounded-sm bg-[#5ff442] mb-5" />
                <p className="text-base md:text-[17px] leading-relaxed text-[#455964] mb-4">
                  Always looking for perfection, we have a portfolio of only
                  top-performing campaigns from major verticals. Because of platform
                  flexibility and our large Publisher number, we are able to drive
                  traffic in no time and customize any new format.
                </p>
                <p className="text-base leading-relaxed text-[#455964] mb-8">
                  We are open to new affiliate programs and campaigns, if you are
                  interested please get in touch with us and we will find the best
                  solution for your needs.
                </p>
                <a
                  href="#contact"
                  className="inline-flex items-center gap-2 rounded-md bg-[#263238] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#1a2429] hover:-translate-y-0.5"
                >
                  Contact us
                  <ArrowRight className="h-4 w-4" />
                </a>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" aria-labelledby="contact-heading" className="bg-[#f8fafb] border-t border-[#263238]/8 py-20 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-12">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="md:col-span-4"
              >
                <h2 id="contact-heading" className="font-[Montserrat] text-2xl md:text-3xl font-extrabold text-[#263238] mb-3">
                  Get In Touch With Us
                </h2>
                <div className="h-[3px] w-8 rounded-sm bg-[#5ff442] mb-5" />
                <p className="text-[15px] leading-relaxed text-[#455964] mb-6">
                  Feel free to contact us regarding any concerns and our team will
                  answer in a short time. We strive to provide the best support in
                  the industry.
                </p>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white border border-[#e6ebed] text-[#263238]">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#6b7c87] mb-0.5">Address</p>
                      <p className="text-sm text-[#455964]">16192 Coastal Highway<br />Lewes, DE 19958</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white border border-[#e6ebed] text-[#263238]">
                      <Mail className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#6b7c87] mb-0.5">Email</p>
                      <a href="mailto:contact@afficix.com" className="text-sm text-[#0e7a4d] hover:underline">
                        contact@afficix.com
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="md:col-span-8"
              >
                {status === "success" && (
                  <div className="mb-5 flex items-start gap-3 rounded-md border border-[#5ff442]/40 bg-[#5ff442]/10 p-4 text-sm text-[#0e7a4d]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Thank you! Your message has been received and our team will reply shortly.</span>
                  </div>
                )}
                {submitError && (
                  <div role="alert" className="mb-5 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700">
                    {submitError}
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="First Name" id="firstName" value={form.firstName} onChange={update("firstName")} error={errors.firstName} placeholder="Jane" autoComplete="given-name" />
                    <FormField label="Last Name" id="lastName" value={form.lastName} onChange={update("lastName")} error={errors.lastName} placeholder="Doe" autoComplete="family-name" />
                  </div>

                  <FormField label="E-mail" id="email" type="email" value={form.email} onChange={update("email")} error={errors.email} placeholder="jane@company.com" autoComplete="email" />

                  <div className="mb-4">
                    <label htmlFor="message" className="mb-1.5 block text-sm font-semibold text-[#263238]">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={5}
                      value={form.message}
                      onChange={update("message")}
                      placeholder="How can we help you?"
                      className={`w-full resize-y rounded-md border bg-white px-4 py-3 text-sm text-[#263238] placeholder:text-[#9aa7b1] focus:outline-none focus:ring-2 transition-colors ${
                        errors.message
                          ? "border-red-400 focus:ring-red-200"
                          : "border-[#d8e1e6] focus:border-[#5ff442] focus:ring-[#5ff442]/20"
                      }`}
                    />
                    {errors.message && <p className="mt-1 text-xs text-red-500">{errors.message}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#5ff442] px-6 py-3.5 text-sm font-bold text-[#263238] transition-colors hover:bg-[#4dd935] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {status === "sending" ? "Sending…" : "Submit"}
                  </button>
                </form>
              </motion.div>
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  );
}

function FormField({
  label, id, type = "text", value, onChange, error, placeholder, autoComplete,
}: {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-[#263238]">
        {label} <span className="text-red-500">*</span>
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`w-full rounded-md border bg-white px-4 py-3 text-sm text-[#263238] placeholder:text-[#9aa7b1] focus:outline-none focus:ring-2 transition-colors ${
          error
            ? "border-red-400 focus:ring-red-200"
            : "border-[#d8e1e6] focus:border-[#5ff442] focus:ring-[#5ff442]/20"
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function PublisherIllustration() {
  return (
    <div className="relative mx-auto aspect-video w-full max-w-[460px] overflow-hidden rounded-lg border border-[#e6ebed] bg-[#e6ebed] shadow-lg">
      <Image
        src="/publishers-image.jpg"
        alt="Affiliate publisher reviewing campaign performance"
        fill
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="object-cover"
      />
    </div>
  );
}

function AdvertiserIllustration() {
  return (
    <div className="relative aspect-video overflow-hidden rounded-lg border border-[#e6ebed] bg-[#263238] shadow-lg">
      <Image
        src="/advertisers-image.jpg"
        alt="Advertiser reviewing a campaign on a laptop"
        fill
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="object-cover"
      />
    </div>
  );
}