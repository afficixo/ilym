import type { Metadata } from "next";
import FAQClient from "./FAQClient";
import PublicLayout from "@/components/layout/PublicLayout";

export const metadata: Metadata = {
  metadataBase: new URL('https://afficix.com'),
  title: "FAQ — CPC Affiliate Questions & Answers | Afficixo",
  description:
    "Get answers to common questions about Afficixo's CPC affiliate marketplace. Learn how to join, earn money, track clicks, and maximize your affiliate revenue.",
  keywords: [
    "CPC FAQ",
    "affiliate questions",
    "how to earn CPC",
    "click tracking explained",
    "affiliate marketplace FAQ",
    "publisher help",
    "CPC offers help",
    "Afficixo help",
  ],
  alternates: {
    canonical: "https://afficix.com/faq",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "FAQ — CPC Affiliate Questions & Answers",
    description:
      "Get answers to common questions about Afficixo's CPC affiliate marketplace and how to start earning.",
    type: "website",
    url: "https://afficix.com/faq",
    siteName: "Afficixo",
    locale: "en_US",
    images: [
      {
        url: "https://afficix.com/og.png",
        secureUrl: "https://afficix.com/og.png",
        width: 1200,
        height: 630,
        alt: "Afficixo FAQ",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FAQ — CPC Affiliate Questions & Answers",
    description:
      "Find answers to common questions about Afficixo's CPC marketplace and affiliate program.",
    images: ["https://afficix.com/og.png"],
    creator: "@afficixo",
    site: "@afficixo",
  },
};

const faqStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is Afficixo?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Afficixo is a pay-per-click affiliate marketplace for publishers and traffic partners who want to earn from valid clicks using CPC offers.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does the Afficixo CPC marketplace work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Publishers discover CPC offers, generate tracking links, promote campaigns, and earn when valid traffic converts according to offer rules.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do publishers earn with Afficixo?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Publishers earn money from valid clicks delivered to CPC affiliate offers. The more quality traffic you send, the more you can earn.',
      },
    },
    {
      '@type': 'Question',
      name: 'What are CPC affiliate offers?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'CPC affiliate offers pay publishers for each valid click or visit that meets the campaign\'s traffic and quality requirements.',
      },
    },
    {
      '@type': 'Question',
      name: 'How are clicks tracked?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Clicks are tracked with secure affiliate links and reporting tools that record visitor activity, traffic sources, and campaign performance in real time.',
      },
    },
  ],
}

export default function FAQPage() {
  return (
    <PublicLayout>
      <FAQClient faqData={faqStructuredData} />
    </PublicLayout>
  );
}