import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowDown,
  BarChart3,
  CircleHelp,
  Copy,
  Link2,
  PanelsTopLeft,
  Plus,
  Rocket,
  Share2,
  WalletCards,
} from 'lucide-react'

const steps: {
  number: string
  title: string
  summary: string
  details: string[]
  href: string
  action: string
  actionIcon: typeof Plus
  image: string
  imageAlt: string
  imageCaption?: string
}[] = [
  {
    number: '01',
    title: 'Create a link account',
    summary: 'Start with one link account for the campaign or traffic source you want to measure.',
    details: [
      'Open Link Accounts in the sidebar, then choose Create.',
      'Enter an Account name so you can recognize it later.',
      'Choose an Offer group from the options available to your account.',
      'Custom URL slug and Custom domain are optional. A custom domain must already be verified.',
    ],
    href: '/admin/links/create',
    action: 'Create your first link',
    actionIcon: Plus,
    image: '/getting-started/create.jpg',
    imageAlt: 'Screenshot of the Afficix Create link account page',
  },
  {
    number: '02',
    title: 'Copy the tracking link for your landing page',
    summary: 'Copy your link account’s tracking URL first. You will paste it into the Landing Builder—it is not the page you share on social media.',
    details: [
      'Open Link Accounts, then All Link Accounts.',
      'On your new account, choose Copy tracking link.',
      'Keep this URL ready for the Tracking Link field in the Landing Builder.',
    ],
    href: '/admin/links',
    action: 'View link accounts',
    actionIcon: Copy,
    image: '/getting-started/links.jpg',
    imageAlt: 'Screenshot of Afficix Link Accounts showing the Copy tracking link control, with private account details obscured',
  },
  {
    number: '03',
    title: 'Build your landing page',
    summary: 'The Landing Builder creates the page visitors will see. Connect it to your link account so its call to action uses your tracking URL.',
    details: [
      'Open Link Accounts → Landing Builder, then choose New Page.',
      'Browse the templates with the arrows and select the design you want.',
      'Enter a unique Subdomain of at least 3 characters using lowercase letters, numbers, or hyphens.',
      'Paste your copied tracking URL into Tracking Link.',
    ],
    href: '/admin/landing-builder',
    action: 'Open Landing Builder',
    actionIcon: Plus,
    image: '/getting-started/landing-builder.jpg',
    imageAlt: 'Screenshot of the actual Afficix Landing Builder with template selection, subdomain, and tracking link fields',
  },
  {
    number: '04',
    title: 'Publish and share your landing-page URL',
    summary: 'Publish the page, then share its landing-page URL on social media. Use the tracking link inside the page—not as the social post link.',
    details: [
      'Choose Publish after the template and both required fields are ready.',
      'When Site published appears, choose Copy URL.',
      'Share that landing-page URL in your social media post, bio, or campaign.',
      'If a Copy message option is shown, you can copy the template’s suggested post text too.',
    ],
    href: '/admin/landing-builder',
    action: 'Open Landing Builder',
    actionIcon: Rocket,
    image: '/getting-started/published-page.jpg',
    imageAlt: 'Screenshot of the actual Afficix Site published confirmation with a sample URL and Copy URL and Copy message options',
    imageCaption: 'Actual publish confirmation · example URL shown',
  },
  {
    number: '05',
    title: 'Check performance in Analytics',
    summary: 'Use your live account data to understand traffic and earnings—this guide never substitutes sample figures.',
    details: [
      'Open Analytics to see Total Links, Total Clicks, Unique Visitors, and Revenue.',
      'Switch the Week, Month, or Year view and use filters for a closer look.',
      'Use the account and geographic breakdown to compare where your unique visitors come from.',
    ],
    href: '/admin/analytics',
    action: 'Open Analytics',
    actionIcon: BarChart3,
    image: '/getting-started/analytics.jpg',
    imageAlt: 'Screenshot of the Afficix Analytics page with private figures obscured',
  },
  {
    number: '06',
    title: 'Set up payout details',
    summary: 'Add your payout destination in Payments so the account manager can send approved payouts.',
    details: [
      'Open Payments and find the Payout details section.',
      'Choose bKash or Binance and enter the matching number or ID.',
      'Confirm with your payment password and save the details.',
      'Check pending and paid amounts there. The app’s payout notice says valid clicks are reviewed every Monday; approved payments are released the next business day.',
    ],
    href: '/publisher/payments',
    action: 'Set up Payments',
    actionIcon: WalletCards,
    image: '/getting-started/payments.jpg',
    imageAlt: 'Screenshot of the Afficix Payments page with private figures and account details obscured',
  },
]

export default function PublisherGettingStartedPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-5 sm:px-6 lg:px-8">
      <section
        className="relative isolate overflow-hidden rounded-[1.75rem] border border-[#263238]/10 bg-[#202b2f] px-5 py-7 shadow-[0_18px_50px_rgba(38,50,56,0.14)] sm:px-8 sm:py-9"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 92% 10%, rgba(95, 244, 66, 0.2), transparent 34%), radial-gradient(ellipse at 0% 100%, rgba(56, 189, 248, 0.09), transparent 38%), linear-gradient(125deg, #172126 0%, #202b2f 62%, #263b32 100%)',
        }}
      >
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(250px,0.7fr)] lg:gap-10">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#5ff442]/25 bg-[#5ff442]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a2fa8e]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#5ff442]" /> Publisher quick start
            </span>
            <h1 className="mt-5 max-w-2xl text-3xl font-bold tracking-tight text-[#f8fafc] sm:text-4xl lg:text-[2.75rem]">
              Your first campaign, step by step.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#cbd5e1] sm:text-base">
              Create a link account, connect it to a landing page, then share that page on social media. Track your results and set up payouts from the same dashboard.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/admin/links/create"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#5ff442] px-5 text-sm font-bold text-[#263238] shadow-[0_8px_24px_rgba(95,244,66,0.2)] transition hover:-translate-y-0.5 hover:bg-[#70f756] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a2fa8e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#202b2f]"
              >
                <Rocket className="h-4 w-4" /> Create your first link <ArrowRight className="h-4 w-4" />
              </Link>
              <span className="text-xs text-[#b2c0c2]">Six clear steps · no demo metrics</span>
            </div>
          </div>

          <div
            className="rounded-2xl p-4 sm:p-5"
            style={{
              backgroundColor: 'rgba(8, 15, 17, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
            }}
            aria-label="Campaign flow: tracking link to landing page to social post"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold tracking-wide text-[#e7efec]">Your campaign flow</span>
              <span className="rounded-full bg-[#5ff442]/10 px-2.5 py-1 text-[10px] font-semibold text-[#a2fa8e]">3 simple stages</span>
            </div>
            <ol className="space-y-2.5">
              {[
                { label: 'Tracking link', description: 'Copied from Link Accounts', Icon: Link2 },
                { label: 'Landing page', description: 'Built with your tracking link', Icon: PanelsTopLeft },
                { label: 'Social post', description: 'Share the published page URL', Icon: Share2 },
              ].map(({ label, description, Icon }, index) => (
                <li key={label}>
                  <div
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.055)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#5ff442]/12 text-[#a2fa8e]">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-[#f1f5f4]">{label}</span>
                      <span className="mt-0.5 block text-[11px] leading-4 text-[#aebdbe]">{description}</span>
                    </span>
                  </div>
                  {index < 2 && (
                    <div className="flex h-4 items-center pl-6 text-[#829597]" aria-hidden="true">
                      <ArrowDown className="h-3 w-3" />
                      <span className="ml-2 h-px flex-1 bg-white/10" />
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <ol aria-label="Getting started steps" className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {['Create account', 'Copy link', 'Build page', 'Share page', 'Analytics', 'Payments'].map((label, index) => (
            <li
              key={label}
              className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.055)',
                border: '1px solid rgba(255, 255, 255, 0.11)',
              }}
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#5ff442]/15 text-[10px] font-bold text-[#a2fa8e]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="text-xs font-medium text-[#d8e2e2]">{label}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-8 space-y-5">
        {steps.map((step, index) => {
          const ActionIcon = step.actionIcon
          return (
            <section key={step.number} className="grid items-center gap-6 rounded-3xl border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-[#202b2f]/80 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.92fr)] lg:gap-9 lg:p-8">
              <div className={index % 2 === 1 ? 'lg:order-2' : undefined}>
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#5ff442]/15 text-sm font-bold text-[#24651d] dark:text-[#a2fa8e]">{step.number}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Step {index + 1}</span>
                </div>
                <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">{step.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{step.summary}</p>
                <ol className="mt-4 space-y-3">
                  {step.details.map((detail, detailIndex) => (
                    <li key={detail} className="flex gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[#359f25]/25 bg-[#359f25]/[0.07] text-[10px] font-semibold text-[#24651d] dark:text-[#a2fa8e]">{detailIndex + 1}</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ol>
                <Link href={step.href} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3.5 text-sm font-semibold text-slate-700 transition hover:border-[#359f25]/40 hover:bg-[#359f25]/[0.05] hover:text-[#24651d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#359f25] dark:border-white/10 dark:text-slate-200 dark:hover:border-[#5ff442]/30 dark:hover:text-[#a2fa8e]">
                  <ActionIcon className="h-4 w-4" />{step.action}<ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className={index % 2 === 1 ? 'lg:order-1' : undefined}>
                <figure>
                  <a href={step.image} target="_blank" rel="noreferrer" aria-label={`${step.imageAlt}. Open full-size screenshot`}>
                    <Image
                      src={step.image}
                      alt={step.imageAlt}
                      width={1440}
                      height={1000}
                      loading="lazy"
                      sizes="(max-width: 1024px) 100vw, 45vw"
                      className="h-auto w-full rounded-2xl border border-slate-200 shadow-[0_16px_40px_rgba(15,23,42,0.08)] dark:border-white/10"
                    />
                  </a>
                  <figcaption className="mt-2 text-center text-[11px] text-slate-400">
                    {step.imageCaption || 'Actual Afficix screen · open image for full size'}
                  </figcaption>
                </figure>
              </div>
            </section>
          )
        })}
      </div>

      <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-sky-200/70 bg-sky-50/70 p-5 dark:border-sky-300/10 dark:bg-sky-300/[0.05] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-300/10 dark:text-sky-300"><CircleHelp className="h-4 w-4" /></span>
          <div><h2 className="text-sm font-semibold text-slate-900 dark:text-white">Need a hand?</h2><p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">Open publisher help to message the Afficix team if anything in your account looks different.</p></div>
        </div>
        <Link href="/publisher/help" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-sky-200 bg-white px-3.5 text-sm font-semibold text-sky-800 transition hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-sky-300/15 dark:bg-white/[0.04] dark:text-sky-200 dark:hover:bg-sky-300/10">Contact support<ArrowRight className="h-4 w-4" /></Link>
      </section>
    </main>
  )
}