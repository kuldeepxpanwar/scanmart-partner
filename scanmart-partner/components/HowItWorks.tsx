"use client";
import React from "react";
import { motion } from "framer-motion";
import { UserPlus, Scan, Rocket } from "lucide-react";

const steps = [
  {
    id: 1,
    title: "Register Your Store",
    description: "Sign up in 30 seconds. No credit card required during trial.",
    icon: <UserPlus className="w-6 h-6 text-white" />,
    color: "bg-blue-500",
  },
  {
    id: 2,
    title: "AI Store Mapping",
    description: "Just take a video of your shelves. Gemini AI identifies products automatically.",
    icon: <Scan className="w-6 h-6 text-white" />,
    color: "bg-purple-500",
  },
  {
    id: 3,
    title: "Go Live & Earn",
    description: "Enable 'Scan & Go' for customers. Monitor sales on your dashboard.",
    icon: <Rocket className="w-6 h-6 text-white" />,
    color: "bg-green-500",
  },
];

export const HowItWorks = () => {
  return (
    <section className="py-24 bg-white dark:bg-[#0B0C10] relative overflow-hidden">
      {/* Connecting Line (Background) */}
      <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-slate-100 dark:bg-slate-800 -translate-x-1/2 hidden md:block" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            Live in <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-500">Minutes</span>, Not Months.
          </h2>
        </div>

        <div className="space-y-12 md:space-y-24">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className={`flex flex-col md:flex-row items-center gap-8 ${
                index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
              }`}
            >
              {/* Text Side */}
              <div className={`flex-1 text-center ${index % 2 === 0 ? "md:text-right" : "md:text-left"}`}>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{step.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-lg">{step.description}</p>
              </div>

              {/* Icon Circle (Center) */}
              <div className="relative z-10 flex-shrink-0">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 ${step.color}`}>
                  {step.icon}
                </div>
                {/* Ping Effect */}
                <div className={`absolute top-0 left-0 w-full h-full rounded-full ${step.color} animate-ping opacity-20`}></div>
              </div>

              {/* Empty Side for Balance */}
              <div className="flex-1 hidden md:block"></div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};