"use client";

import { motion } from "framer-motion";
import { Users, Target, Zap, Heart, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";

const team = [
  {
    name: "Alex Morgan",
    role: "CEO & Co-Founder",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
  },
  {
    name: "Sarah Chen",
    role: "CTO",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
  },
  {
    name: "David Kim",
    role: "Head of Product",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
  },
  {
    name: "Jessica Wu",
    role: "Head of Sales",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica",
  },
];

const values = [
  {
    title: "Customer First",
    description: "We obsess over our customers' success. Your growth is our growth.",
    icon: Heart,
    color: "text-rose-400"
  },
  {
    title: "Innovation",
    description: "We push boundaries and challenge the status quo of sales tech.",
    icon: Zap,
    color: "text-amber-400"
  },
  {
    title: "Transparency",
    description: "We believe in open communication and building trust through honesty.",
    icon: Target,
    color: "text-emerald-400"
  },
  {
    title: "Teamwork",
    description: "We achieve more together. Collaboration is at our core.",
    icon: Users,
    color: "text-blue-400"
  }
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0F172A] text-white selection:bg-indigo-500 selection:text-white font-sans">
      <Header />

      <main>
        {/* --- HERO SECTION --- */}
        <section className="pt-32 pb-20 px-6 relative overflow-hidden">
          <div className="absolute inset-0 z-0">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-indigo-600/10 blur-[100px] rounded-full opacity-50" />
          </div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-5xl md:text-7xl font-bold mb-8 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent"
            >
              We're building the future <br /> of sales outreach.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto"
            >
              Nudge was founded with a simple mission: to help sales teams focus on building relationships, not managing spreadsheets.
            </motion.p>
          </div>
        </section>

        {/* --- STORY SECTION --- */}
        <section className="py-24 px-6 border-y border-white/5 bg-white/5 overflow-hidden">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-3xl transform rotate-3 blur-sm" />
              <div className="relative bg-[#1E293B] border border-white/10 rounded-3xl p-8 md:p-12">
                 <h3 className="text-2xl font-bold mb-6">Our Story</h3>
                 <div className="space-y-4 text-slate-400 text-lg">
                    <p>
                       It started in a coffee shop in 2023. Our founders, frustrated by the clumsy, expensive, and disconnected tools available for sales teams, decided to build something better.
                    </p>
                    <p>
                       They wanted a tool that felt magical. One that used AI not just as a buzzword, but as a core engine to drive efficiency and personalization at scale.
                    </p>
                    <p>
                       Today, Nudge powers thousands of sales conversations every day, helping companies of all sizes reach their full potential.
                    </p>
                 </div>
              </div>
            </motion.div>

            <motion.div
               initial={{ opacity: 0, x: 50 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
               transition={{ duration: 0.6 }}
            >
               <div className="grid grid-cols-2 gap-6">
                  {values.map((v, i) => (
                     <div key={i} className="bg-[#1E293B]/50 p-6 rounded-2xl border border-white/5 hover:bg-[#1E293B] transition-colors">
                        <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-4 ${v.color}`}>
                           <v.icon className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-lg mb-2">{v.title}</h4>
                        <p className="text-slate-400 text-sm">{v.description}</p>
                     </div>
                  ))}
               </div>
            </motion.div>
          </div>
        </section>

        {/* --- TEAM SECTION --- */}
        <section className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
               <h2 className="text-3xl md:text-5xl font-bold mb-4">Meet the Team</h2>
               <p className="text-slate-400">The builders and dreamers behind Nudge.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
               {team.map((member, i) => (
                  <motion.div 
                     key={i}
                     initial={{ opacity: 0, y: 20 }}
                     whileInView={{ opacity: 1, y: 0 }}
                     viewport={{ once: true }}
                     transition={{ delay: i * 0.1 }}
                     className="group"
                  >
                     <div className="relative overflow-hidden rounded-2xl aspect-square mb-6 bg-white/5 border border-white/5">
                        <img 
                           src={member.image} 
                           alt={member.name}
                           className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                     </div>
                     <h3 className="text-xl font-bold">{member.name}</h3>
                     <p className="text-indigo-400 font-medium">{member.role}</p>
                  </motion.div>
               ))}
            </div>

            <div className="mt-20 text-center">
               <div className="inline-flex flex-col items-center p-8 rounded-3xl bg-gradient-to-br from-indigo-900/50 to-[#0F172A] border border-white/10 max-w-2xl mx-auto">
                  <h3 className="text-2xl font-bold mb-4">Join our mission</h3>
                  <p className="text-slate-400 mb-8">
                     We're always looking for talented individuals to join our growing team.
                  </p>
                  <Link 
                     href="/contact" 
                     className="px-8 py-3 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-100 transition-colors flex items-center gap-2"
                  >
                     View Open Positions <ArrowRight className="w-4 h-4" />
                  </Link>
               </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
