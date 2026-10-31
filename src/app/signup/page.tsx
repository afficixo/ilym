import type { Metadata } from "next"
import { Suspense } from "react"
import SignupClient from "./SignupClient"

export const metadata: Metadata = {
  metadataBase: new URL('https://afficix.com'),
  title: 'Join Afficix — Become a CPC Affiliate Publisher',
  description:
    'Create your Afficix publisher account to access CPC offers, track campaign performance, and monetize your traffic.',
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: 'https://afficix.com/signup',
  },
  openGraph: {
    title: 'Join Afficix — Become a CPC Affiliate Publisher',
    description:
      'Create your Afficix publisher account to access CPC offers, track campaign performance, and monetize your traffic.',
    type: 'website',
    url: 'https://afficix.com/signup',
    siteName: 'Afficix',
    images: [
      {
        url: 'https://afficix.com/afficix-preview.png',
        secureUrl: 'https://afficix.com/afficix-preview.png',
        width: 768,
        height: 768,
        alt: 'Afficix Pay Per Click Affiliate Marketplace',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Join Afficix — Become a CPC Affiliate Publisher',
    description:
      'Create your Afficix publisher account to access CPC offers, track campaign performance, and monetize your traffic.',
    images: ['https://afficix.com/afficix-preview.png'],
    creator: 'Afficix',
  },
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" aria-hidden="true" />}>
      <SignupClient />
    </Suspense>
  )
}
