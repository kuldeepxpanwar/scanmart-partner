"use client";
import React from "react";
import { Mail, Phone, MessageCircle, ArrowUpRight } from "lucide-react";

export const Contact = () => {
  return (
    <section id="contact" className="py-24 bg-slate-50 dark:bg-[#0B0C10] relative border-t border-slate-200 dark:border-slate-800/50">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Text Side */}
          <div>
            <h2 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Get In Touch</h2>
            <h3 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-6">
              Ready to Upgrade Your <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Retail Business?</span>
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-lg mb-8 max-w-md">
              Whether you need a custom setup, have technical questions, or want a live demo—we are just a message away.
            </p>

            {/* Contact Details */}
            <div className="space-y-6">
              {/* WhatsApp / Phone */}
              <a href="https://wa.me/919358752147" target="_blank" rel="noreferrer" className="flex items-center gap-6 p-4 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-green-500/50 transition-all group w-fit pr-8">
                <div className="p-3 bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-xl group-hover:scale-110 transition-transform">
                  <Phone size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Direct Call & WhatsApp</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">+91 93587 52147</p>
                </div>
                <ArrowUpRight className="ml-4 text-slate-400 group-hover:text-green-500 transition-colors" size={20}/>
              </a>

              {/* Email */}
              <a href="mailto:panwarkuldeep256@gmail.com" className="flex items-center gap-6 p-4 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 transition-all group w-fit pr-8">
                <div className="p-3 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl group-hover:scale-110 transition-transform">
                  <Mail size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email Us Directly</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">panwarkuldeep256@gmail.com</p>
                </div>
                <ArrowUpRight className="ml-4 text-slate-400 group-hover:text-blue-500 transition-colors" size={20}/>
              </a>
            </div>
          </div>

          {/* Right Floating Card (Visual Appeal) */}
          <div className="relative hidden md:block">
            <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full"></div>
            <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 rounded-[3rem] shadow-2xl">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30">
                <MessageCircle size={32} className="text-white" />
              </div>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-4">Fastest Support</h4>
              <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                Click on the WhatsApp or Email button to reach us instantly. We usually reply within minutes to help you set up your POS system.
              </p>
              <a href="https://wa.me/919358752147" target="_blank" rel="noreferrer">
                <button className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:scale-[1.02] active:scale-95 transition-all">
                  Chat on WhatsApp
                </button>
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};