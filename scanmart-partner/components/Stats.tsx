"use client";
import React from "react";
import { motion } from "framer-motion";

// These stats reflect what an honest early-stage POS product can claim.
// No fabricated numbers — credibility > hype.
const stats = [
  { id: 1, name: "Setup Time", value: "< 5 min", desc: "From signup to first sale" },
  { id: 2, name: "Faster Billing", value: "3×", desc: "vs manual invoice methods" },
  { id: 3, name: "Roles Supported", value: "3", desc: "Admin · Manager · Staff" },
  { id: 4, name: "Always Free Trial", value: "∞", desc: "No credit card required" },
];

export const Stats = () => {
  return (
    <div className="bg-slate-50 dark:bg-[#0B0C10] py-20 relative z-10 border-t border-slate-100 dark:border-slate-900">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Why Shops Choose <span className="text-blue-500">ScanMart</span>
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-400">
            Simple, fast, and built for real retail.
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-8 text-center lg:grid-cols-4">
          {stats.map((stat) => (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: stat.id * 0.1 }}
              className="mx-auto flex max-w-xs flex-col gap-y-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-sm hover:shadow-lg transition-shadow"
            >
              <dd className="text-5xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400">
                {stat.value}
              </dd>
              <dt className="text-base font-bold text-slate-900 dark:text-white">{stat.name}</dt>
              <p className="text-sm text-slate-500 dark:text-slate-400">{stat.desc}</p>
            </motion.div>
          ))}
        </dl>
      </div>
    </div>
  );
};