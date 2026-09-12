import type { Metadata } from "next";
import PublishersClient from "./PublishersClient";
import PublicLayout from "@/components/layout/PublicLayout";

export const metadata: Metadata = {
  metadataBase: new URL('https://afficix.com'),
  title: "Publisher Platform — Earn With High-Paying CPC Offers | Afficixo",
  description:
    "Join Afficixo publishers program and earn money from high-paying CPC affiliate offers. Discover campaigns, track clicks in real-time, and monetize your traffic with our transparent affiliate platform.",
  keywords: [
    "affiliate publishers",
    "publisher platform",
    "monetize traffic",
    "CPC offers",
    "click tracking",
    "performance marketing",
    "earn money online",
    "publisher program",
    "affiliate publisher",
    "traffic monetization platform",
    "high-paying offers",
    "real-time tracking",
  ],
  alternates: {
    canonical: "https://afficix.com/publishers",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Publisher Platform — Earn With High-Paying CPC Offers",
    description:
      "Join Afficixo publishers program. Discover high-paying CPC campaigns, track clicks in real-time, and monetize your traffic.",
    type: "website",
    url: "https://afficix.com/publishers",
    siteName: "Afficixo",
    locale: "en_US",
    images: [
      {
        url: "https://afficix.com/og.png",
        secureUrl: "https://afficix.com/og.png",
        width: 1200,
        height: 630,
        alt: "Afficixo Publisher Platform",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Publisher Platform — Earn With CPC Offers",
    description:
      "Join our publisher program, discover high-paying CPC offers, and start monetizing your traffic today.",
    images: ["https://afficix.com/og.png"],
    creator: "@afficixo",
    site: "@afficixo",
  },
};

export default function PublishersPage() {
  return (
    <PublicLayout>
      <PublishersClient />
    </PublicLayout>
  );
}