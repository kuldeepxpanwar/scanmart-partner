import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Stats } from "@/components/Stats";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { TechStack } from "@/components/TechStack";
import { Footer } from "@/components/Footer"; 
import { Security } from "@/components/Security"; 
import { Contact } from "@/components/Contact";
export default function Home() {
  return (
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
  );
}