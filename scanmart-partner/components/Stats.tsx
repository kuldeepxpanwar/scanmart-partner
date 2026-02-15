"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

const stats = [
  { id: 1, name: "Active Stores", value: 2500, suffix: "+" },
  { id: 2, name: "Queues Bypassed", value: 1200000, suffix: "M+" }, // 1.2M
  { id: 3, name: "Avg. Checkout Time", value: 45, suffix: "s" },
  { id: 4, name: "Partner Growth", value: 300, suffix: "%" },
];

const Counter = ({ value, suffix }: { value: number, suffix: string }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    // Agar number bada hai (jaise 1.2M), toh jaldi khatam karo
    const duration = 2000; 
    const increment = end / (duration / 16); // 60FPS

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  // Formatting logic
  const displayValue = () => {
    if (value > 1000000) return (count / 1000000).toFixed(1); // 1.2
    if (value > 1000) return Math.floor(count).toLocaleString(); // 2,500
    return Math.floor(count); // 45
  };

  return <span>{displayValue()}{suffix}</span>;
};

export const Stats = () => {
  return (
    <div className="bg-slate-50 dark:bg-[#0B0C10] py-24 sm:py-32 relative z-10">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Trusted by the World's Best Retailers
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-400">
            Real impact, real numbers.
          </p>
        </div>

        <dl className="grid grid-cols-1 gap-y-16 gap-x-8 text-center lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.id} className="mx-auto flex max-w-xs flex-col gap-y-4">
              <dt className="text-base leading-7 text-slate-600 dark:text-slate-400">{stat.name}</dt>
              <dd className="order-first text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                <Counter value={stat.value} suffix={stat.suffix} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
};