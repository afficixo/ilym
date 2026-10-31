import type { Metadata } from "next";
import { Suspense } from "react";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  metadataBase: new URL('https://afficix.com'),
  title: 'Manager Login — Afficix',
  description:
    'Log in to your Afficix publisher account to manage CPC offers, tracking links, traffic analytics, and earnings.',
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: 'https://afficix.com/login',
  },
  openGraph: {
    title: 'Manager Login — Afficix',
    description:
      'Log in to your Afficix publisher account to manage CPC offers, tracking links, traffic analytics, and earnings.',
    type: 'website',
    url: 'https://afficix.com/login',
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
    title: 'Manager Login — Afficix',
    description:
      'Log in to your Afficix publisher account to manage CPC offers, tracking links, traffic analytics, and earnings.',
    images: ['https://afficix.com/afficix-preview.png'],
    creator: 'Afficix',
  },
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" aria-hidden="true" />}>
      <LoginClient />
    </Suspense>
  );
}
