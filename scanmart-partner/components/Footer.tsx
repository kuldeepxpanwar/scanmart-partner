"use client";
import React from "react";
import { Zap, Twitter, Linkedin, Instagram, Github, Send } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          
          {/* Brand & Newsletter Column */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Zap className="text-white w-5 h-5 fill-current" />
              </div>
              <span className="text-xl font-bold text-white">
                ScanMart<span className="text-blue-500">.Partner</span>
              </span>
            </div>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Empowering retailers with autonomous checkout technology. Zero queues, maximum efficiency.
            </p>
            
            {/* Newsletter Input */}
            <div className="relative">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg py-3 px-4 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button className="absolute right-2 top-2 p-1 bg-blue-600 rounded-md hover:bg-blue-700 transition">
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h3 className="text-white font-semibold mb-6">Product</h3>
            <ul className="space-y-4 text-sm text-slate-400">
              {["Features", "Pricing", "Hardware", "Integrations", "API Docs"].map((item) => (
                <li key={item}>
                  <a href="#" className="hover:text-blue-400 transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-6">Company</h3>
            <ul className="space-y-4 text-sm text-slate-400">
              {["About Us", "Careers", "Blog", "Press Kit", "Contact"].map((item) => (
                <li key={item}>
                  <a href="#" className="hover:text-blue-400 transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-6">Legal</h3>
            <ul className="space-y-4 text-sm text-slate-400">
              {["Privacy Policy", "Terms of Service", "Cookie Policy", "Security"].map((item) => (
                <li key={item}>
                  <a href="#" className="hover:text-blue-400 transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-slate-500 text-sm">
            © 2024 ScanMart Inc. All rights reserved.
          </div>
          
          <div className="flex gap-6">
            {[Twitter, Linkedin, Instagram, Github].map((Icon, i) => (
              <a key={i} href="#" className="text-slate-500 hover:text-white transition-colors">
                <Icon className="w-5 h-5" />
              </a>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
};