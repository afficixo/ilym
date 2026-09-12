import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  metadataBase: new URL('https://afficix.com'),
  title: "CPC Affiliate Offers & Campaigns — Afficixo Marketplace",
  description:
    "Browse thousands of high-paying CPC affiliate offers on Afficixo. Find the best campaigns, generate tracking links, promote offers, and earn from valid clicks with our reliable affiliate marketplace.",
  keywords: [
    "CPC affiliate offers",
    "affiliate marketplace",
    "pay per click offers",
    "tracking links",
    "valid clicks",
    "publisher campaigns",
    "affiliate traffic",
    "high paying offers",
    "CPC campaigns",
    "promote offers",
    "earn per click offers",
    "affiliate links",
  ],
  alternates: {
    canonical: "https://afficix.com/offers",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "CPC Affiliate Offers & Campaigns — Afficixo",
    description:
      "Browse thousands of high-paying CPC affiliate offers. Generate tracking links, promote campaigns, and earn from valid clicks.",
    type: "website",
    url: "https://afficix.com/offers",
    siteName: "Afficixo",
    locale: "en_US",
    images: [
      {
        url: "https://afficix.com/og.png",
        secureUrl: "https://afficix.com/og.png",
        width: 1200,
        height: 630,
        alt: "Afficixo Pay Per Click Affiliate Offers",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CPC Affiliate Offers — Afficixo Marketplace",
    description:
      "Browse high-paying CPC offers, generate tracking links, and start earning from valid clicks today.",
    images: ["https://afficix.com/og.png"],
    creator: "@afficixo",
    site: "@afficixo",
  },
};


export default function OffersPage() {
  redirect("/publishers");
}
