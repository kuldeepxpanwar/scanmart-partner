import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Stats } from "@/components/Stats";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { TechStack } from "@/components/TechStack";
import { Footer } from "@/components/Footer"; 
import { Security } from "@/components/Security"; 
import { Contact } from "@/components/Contact";

// JSON-LD Structured Data for rich Google results
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "ScanMart",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Fast pharmacy POS and billing software for Indian medical stores. Features barcode billing, batch & expiry tracking (FEFO), GST invoicing, inventory management, and patient credit.",
      url: "https://scanmart.vercel.app",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
        description: "Free to start",
      },
      featureList: [
        "Barcode Billing",
        "Batch & Expiry Tracking (FEFO)",
        "GST Tax Invoicing",
        "Inventory Management",
        "Patient Credit Management",
        "H1 Drug Register Compliance",
        "Multi-Store Support",
        "Role-Based Staff Access",
      ],
    },
    {
      "@type": "Organization",
      name: "ScanMart",
      url: "https://scanmart.vercel.app",
      logo: "https://scanmart.vercel.app/favicon.ico",
      description:
        "ScanMart builds modern pharmacy POS and billing software for Indian medical stores, pharmacies, and clinics.",
      sameAs: [],
    },
    {
      "@type": "WebSite",
      name: "ScanMart",
      url: "https://scanmart.vercel.app",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://scanmart.vercel.app/?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function Home() {
  return (
    <>
      {/* Structured Data for Google Rich Results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="min-h-screen bg-slate-50 dark:bg-[#0B0C10]">
        <Navbar />
        <Hero />
        <Stats />
        <Features />
        <TechStack />
        <HowItWorks />
        <Security /> 
        <Contact />
        {/* Footer Component */}
        <Footer /> 
      </main>
    </>
  );
}