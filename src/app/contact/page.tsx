import type { Metadata } from 'next'
import PublicLayout from '@/components/layout/PublicLayout'

export const metadata: Metadata = {
  metadataBase: new URL('https://afficix.com'),
  title: 'Contact Afficixo — Publisher Support',
  description:
    'Contact the Afficixo support team for help with your publisher account, affiliate offers, tracking, payments, and platform-related questions.',
  keywords: [
    'Afficixo contact',
    'publisher support',
    'affiliate support',
    'CPC affiliate marketplace support',
    'traffic monetization help',
  ],
  alternates: {
    canonical: 'https://afficix.com/contact',
  },
  openGraph: {
    title: 'Contact Afficixo — Publisher Support',
    description:
      'Contact the Afficixo support team for help with your publisher account, affiliate offers, tracking, payments, and platform-related questions.',
    type: 'website',
    url: 'https://afficix.com/contact',
    siteName: 'Afficixo',
    images: [
      {
        url: 'https://afficix.com/og-image.png',
        secureUrl: 'https://afficix.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Afficixo Pay Per Click Affiliate Marketplace',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Afficixo — Publisher Support',
    description:
      'Contact the Afficixo support team for help with your publisher account, affiliate offers, tracking, payments, and platform-related questions.',
    images: ['https://afficix.com/og-image.png'],
    creator: 'Afficixo',
  },
}

export default function ContactPage() {
  return (
    <PublicLayout>
      <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/40 backdrop-blur-xl shadow-[0_40px_120px_-40px_rgba(15,23,42,0.8)]">
          <div className="border-b border-white/10 px-6 py-10 sm:px-10">
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">Contact</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Contact Afficixo</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
              Reach out to the Afficixo team for questions about onboarding, support, or affiliate programs.
            </p>
          </div>

          <div className="space-y-10 px-6 py-10 sm:px-10">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">Support</h2>
              <p className="text-slate-300 leading-7">
                For general support, email us at <a className="text-cyan-300 hover:text-cyan-200" href="mailto:support@afficix.com">support@afficix.com</a>.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">Partnerships</h2>
              <p className="text-slate-300 leading-7">
                Interested in partnerships or affiliate collaboration? Send us a message and our team will follow up promptly.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">Feedback</h2>
              <p className="text-slate-300 leading-7">
                We value your feedback. Let us know what we can improve and how we can help your campaigns succeed.
              </p>
            </section>
          </div>
        </div>
      </main>
    </PublicLayout>
  )
}
