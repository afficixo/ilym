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
  metadataBase: new URL('https://afficix.com'),
  title: 'Afficixo — Best CPC Affiliate Marketplace for Publishers',
  description:
    'Afficixo is the premier pay-per-click affiliate marketplace where publishers find high-paying CPC offers, promote campaigns, generate valid clicks, track traffic, and earn from quality visitors worldwide. Join 10,000+ publishers earning with our platform.',
  keywords: [
    'CPC affiliate marketplace',
    'pay per click offers',
    'affiliate network',
    'publisher network',
    'click tracking',
    'traffic monetization',
    'affiliate marketing platform',
    'earn per click',
    'Afficixo',
    'CPC advertising network',
    'affiliate links',
    'campaign management',
    'valid clicks',
    'publisher earnings',
    'online monetization',
    'performance marketing',
    'publisher platform',
    'affiliate offers',
  ],
  authors: [{ name: 'Afficixo', url: 'https://afficix.com' }],
  creator: 'Afficixo',
  publisher: 'Afficixo',
  category: 'Business',
  referrer: 'strict-origin-when-cross-origin',
  formatDetection: {
    email: false,
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Afficixo',
    startupImage: '/web-app-manifest-512x512.png',
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
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/favicon.ico',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'Afficixo — Pay Per Click Affiliate Marketplace',
    description:
      'Join Afficixo and discover CPC affiliate offers, promote campaigns, track your traffic, and earn from valid clicks.',
    type: 'website',
    url: 'https://afficix.com',
    siteName: 'Afficixo',
    locale: 'en_US',
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
    title: 'Afficixo — CPC Affiliate Marketplace',
    description:
      'Discover CPC offers, promote campaigns, track valid clicks, and monetize your traffic with Afficixo.',
    images: ['https://afficix.com/og.png'],
    site: '@afficixo',
    creator: '@afficixo',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#34d399' },
    { media: '(prefers-color-scheme: light)', color: '#34d399' },
  ],
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.variable} font-sans antialiased`}>
        <ThemeInitializer />
        <div className="min-h-screen">
          <PageTransition>{children}</PageTransition>
        </div>
      </body>
    </html>
  )
}