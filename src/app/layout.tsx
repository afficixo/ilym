import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import PageTransition from '@/components/ui/PageTransition'
import ThemeInitializer from '@/components/ui/ThemeInitializer'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  applicationName: 'Afficix',
  metadataBase: new URL('https://afficix.com'),
  title: 'Afficix | CPC Affiliate Network for Publishers & Advertisers',
  description:
    'Discover pay-per-click campaigns, create tracking links, and monitor clicks with Afficix, a CPC affiliate marketplace for publishers and advertisers.',
  authors: [{ name: 'Afficix', url: 'https://afficix.com' }],
  creator: 'Afficix',
  publisher: 'Afficix',
  category: 'Business',
  referrer: 'strict-origin-when-cross-origin',
  formatDetection: {
    email: false,
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Afficix',
  },
  alternates: {
    canonical: 'https://afficix.com',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: [
      { url: '/afficix_favicon.png', type: 'image/png' },
    ],
    apple: [{ url: '/afficix_favicon.png', type: 'image/png' }],
    shortcut: '/afficix_favicon.png',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'Afficix | CPC Affiliate Network for Publishers & Advertisers',
    description:
      'Discover pay-per-click campaigns, create tracking links, and monitor clicks with Afficix, a CPC affiliate marketplace for publishers and advertisers.',
    type: 'website',
    url: 'https://afficix.com',
    siteName: 'Afficix',
    locale: 'en_US',
    images: [
      {
        url: '/afficix-preview.png',
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
    title: 'Afficix | CPC Affiliate Network for Publishers & Advertisers',
    description:
      'Discover pay-per-click campaigns, create tracking links, and monitor clicks with Afficix, a CPC affiliate marketplace for publishers and advertisers.',
    images: ['/afficix-preview.png'],
    site: '@afficixo',
    creator: '@afficixo',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#1d282b' },
    { media: '(prefers-color-scheme: light)', color: '#eef2f7' },
  ],
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.variable} font-sans antialiased`}>
        <ThemeInitializer />
        <div className="min-h-dvh">
          <PageTransition>{children}</PageTransition>
        </div>
      </body>
    </html>
  )
}