import type { Metadata } from "next";
import HomePageClient from "./HomePageClient";

const pageTitle = "Afficix | CPC Affiliate Network for Publishers & Advertisers";
const pageDescription =
  "Discover CPC campaigns, create tracking links, and monitor clicks with Afficix, a private affiliate network for publishers and advertisers.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "https://afficix.com/",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    type: "website",
    url: "https://afficix.com/",
    siteName: "Afficix",
    locale: "en_US",
    images: [
      {
        url: "/afficix-preview.png",
        secureUrl: "https://afficix.com/afficix-preview.png",
        width: 768,
        height: 768,
        alt: "Afficix Pay Per Click Affiliate Marketplace",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: [
      {
        url: "https://afficix.com/afficix-preview.png",
        alt: "Afficix Pay Per Click Affiliate Marketplace",
      },
    ],
    site: "@afficixo",
    creator: "@afficixo",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://afficix.com/#organization",
      name: "Afficix",
      url: "https://afficix.com/",
      logo: {
        "@type": "ImageObject",
        url: "https://afficix.com/afficixlogo.png",
      },
      email: "contact@afficix.com",
      address: {
        "@type": "PostalAddress",
        streetAddress: "16192 Coastal Highway",
        addressLocality: "Lewes",
        addressRegion: "DE",
        postalCode: "19958",
        addressCountry: "US",
      },
      description:
        "A CPC affiliate marketplace for publishers and advertisers to discover campaigns and manage click tracking.",
    },
    {
      "@type": "WebSite",
      "@id": "https://afficix.com/#website",
      name: "Afficix",
      url: "https://afficix.com/",
      publisher: { "@id": "https://afficix.com/#organization" },
      inLanguage: "en",
    },
    {
      "@type": "WebPage",
      "@id": "https://afficix.com/#webpage",
      url: "https://afficix.com/",
      name: pageTitle,
      description: pageDescription,
      isPartOf: { "@id": "https://afficix.com/#website" },
      about: { "@id": "https://afficix.com/#organization" },
      inLanguage: "en",
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <HomePageClient />
    </>
  );
}
