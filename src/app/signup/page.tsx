import type { Metadata } from "next"
import { Suspense } from "react"
import SignupClient from "./SignupClient"
import AfficixoLoading from "@/components/ui/AfficixoLoading"

export const metadata: Metadata = {
  metadataBase: new URL('https://afficix.com'),
  title: 'Join Afficixo — Become a CPC Affiliate Publisher',
  description:
    'Create your Afficixo publisher account and access CPC affiliate offers, tracking tools, campaign management, and traffic monetization features.',
  keywords: [
    'join Afficixo',
    'CPC affiliate publisher',
    'publisher signup',
    'affiliate tracking tools',
    'traffic monetization platform',
  ],
  alternates: {
    canonical: 'https://afficix.com/signup',
  },
  openGraph: {
    title: 'Join Afficixo — Become a CPC Affiliate Publisher',
    description:
      'Create your Afficixo publisher account and access CPC affiliate offers, tracking tools, campaign management, and traffic monetization features.',
    type: 'website',
    url: 'https://afficix.com/signup',
    siteName: 'Afficixo',
    images: [
      {
        url: 'https://afficix.com/og.png',
        secureUrl: 'https://afficix.com/og.png',
        width: 1200,
        height: 630,
        alt: 'Afficixo Pay Per Click Affiliate Marketplace',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Join Afficixo — Become a CPC Affiliate Publisher',
    description:
      'Create your Afficixo publisher account and access CPC affiliate offers, tracking tools, campaign management, and traffic monetization features.',
    images: ['https://afficix.com/og-image.png'],
    creator: 'Afficixo',
  },
}

export default function SignupPage() {
  return (
    <Suspense fallback={<AfficixoLoading text="Loading registration" />}>
      <SignupClient />
    </Suspense>
  )
}
