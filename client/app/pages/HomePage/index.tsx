"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  ArrowRight, 
  Sparkles, 
  Zap, 
  BarChart3, 
  Users, 
  ShieldCheck,
  CheckCircle2, 
  Play,
  TrendingUp,
  MessageSquare,
  Plus,
} from "lucide-react";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";

// Verified Features Data
const features = [
  {
    title: "Smart Lead Database",
    description: "Import leads via CSV or manually add contacts. Keep your prospect data organized and unified in one secure place.",
    icon: Users,
    color: "from-blue-500 to-indigo-500",
    size: "large"
  },
  {
    title: "AI-Powered Campaigns",
    description: "Launch personalized outreach campaigns with intelligent scheduling. Let our system handle the follow-up cadence automatically.",
    icon: Sparkles,
    color: "from-purple-500 to-pink-500",
    size: "small"
  },
  {
    title: "Real-time Analytics",
    description: "Track your funnel performance with live dashboard stats. Monitor emails sent, active leads, and conversion rates at a glance.",
    icon: BarChart3,
    color: "from-emerald-500 to-teal-500",
    size: "small"
  }
];

const testimonials = [
  {
    quote: "Nudge has completely transformed our outbound process. We've seen a 300% increase in response rates since switching.",
    author: "Sarah Chen",
    role: "VP of Sales, TechFlow",
    avatar: "SC"
  },
  {
    quote: "The AI personalization is indistinguishable from a human. It's saved my SDRs hours of manual research every week.",
    author: "Marcus Rodriguez",
    role: "Founder, ScaleUp",
    avatar: "MR"
  },
  {
    quote: "Setup was incredibly fast. We were sending active campaigns within minutes of signing up. Best ROI tool in our stack.",
    author: "Emily Watson",
    role: "Head of Growth, FinEdge",
    avatar: "EW"
  }
];

const faq = [
  {
    question: "Do I need to check my email manually?",
    answer: "No! Nudge tracks all replies automatically. When a lead replies, we mark them as 'Replied' and stop the sequence so you can take over personally."
  },
  {
    question: "Can I import my existing leads?",
    answer: "Absolutely. We support bulk CSV imports so you can migrate thousands of contacts in seconds."
  },
  {
    question: "Is there a limit on campaigns?",
    answer: "You can create unlimited campaigns to segment your audience by industry, role, or geography. Scale your outreach without boundaries."
  },
  {
    question: "Is my data secure?",
    answer: "Yes, we use enterprise-grade encryption for all data storage and transmission. Your lead data is yours alone."
  }
];

// FAQ Accordion Item Component
const FAQItem = ({ item, isOpen, onClick }: { item: any, isOpen: boolean, onClick: () => void }) => {
  return (
    <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/5 hover:bg-white/10 transition-colors">
      <button 
        onClick={onClick}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <span className="text-lg font-semibold text-white pr-8">{item.question}</span>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full border border-white/20 flex items-center justify-center transition-all bg-white/5 ${isOpen ? 'rotate-45 bg-white/10' : ''}`}>
           <Plus className="w-4 h-4 text-white" />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="px-6 pb-6 pt-0 text-slate-400 leading-relaxed border-t border-white/5 mt-2">
              <div className="pt-4">
                 {item.answer}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0F172A] text-white selection:bg-indigo-500 selection:text-white overflow-x-hidden font-sans">
      <Header />

      {/* --- HERO SECTION --- */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 pb-32 px-6 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse delay-1000" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>

        <motion.div 
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 max-w-5xl mx-auto text-center space-y-8"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors cursor-pointer"
          >
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span className="text-sm font-medium text-indigo-200">v2.0 Now Live</span>
            <ArrowRight className="w-3 h-3 text-indigo-200" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-6xl md:text-8xl font-bold tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent leading-[1.1]"
          >
            Supercharge Your <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-shimmer">
              Sales Outreach
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed"
          >
            Stop manual follow-ups. Nudge automates your entire sales workflow with 
            intelligent campaigns, verified lead data, and real-time performance insights.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8"
          >
            <Link 
              href="/campaigns/new"
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)] hover:shadow-[0_0_25px_-5px_rgba(79,70,229,0.6)] flex items-center gap-2 group transform hover:scale-105"
            >
              <Zap className="w-5 h-5 fill-white" />
              Start Free Campaign
            </Link>
            <Link 
              href="/contact"
              className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-semibold transition-all backdrop-blur-sm flex items-center gap-2"
            >
              <Play className="w-4 h-4 ml-1" />
              Watch Demo
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* --- MARQUEE SECTION --- */}
      <section className="py-12 border-y border-white/5 bg-white/5 backdrop-blur-sm overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center mb-8">
           <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Trusted by fast-growing teams</p>
        </div>
        <div className="flex relative overflow-hidden">
           <motion.div 
             className="flex gap-16 items-center flex-nowrap"
             animate={{ x: ["0%", "-50%"] }}
             transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
           >
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex gap-16 items-center shrink-0">
                  {['ACME', 'Globex', 'Soylent', 'Initech', 'Umbrella', 'Stark', 'Wayne', 'Cyberdyne'].map((name, idx) => (
                    <span key={idx} className="text-2xl font-bold text-slate-600 font-mono opacity-50">{name} CORP</span>
                  ))}
                </div>
              ))}
           </motion.div>
           <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#0F172A] to-transparent z-10" />
           <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#0F172A] to-transparent z-10" />
        </div>
      </section>

      {/* --- DASHBOARD PREVIEW --- */}
      <section className="relative z-20 py-24 px-4 md:px-12">
        <div className="max-w-7xl mx-auto">
           <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Unified Command Center</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">Manage your entire funnel from a single, powerful interface.</p>
           </div>
           
           <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="rounded-xl border border-white/10 bg-[#1E293B]/50 backdrop-blur-xl shadow-2xl overflow-hidden p-2 md:p-4 ring-1 ring-white/10"
          >
            <div className="rounded-lg overflow-hidden bg-[#0F172A] border border-white/5 relative aspect-[16/9] group">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-purple-500/5" />
              
              <div className="absolute top-0 left-0 w-full h-full p-4 md:p-8 flex gap-6">
                <div className="w-64 h-full hidden md:flex flex-col gap-4 border-r border-white/10 pr-6">
                  <div className="h-8 w-8 bg-indigo-500 rounded-lg mb-8" />
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-8 w-full bg-white/5 rounded-md" />
                  ))}
                </div>
                
                <div className="flex-1 flex flex-col gap-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="h-8 w-48 bg-white/10 rounded-md animate-pulse" />
                    <div className="flex gap-2">
                       <div className="h-8 w-24 bg-indigo-500/20 rounded-md" />
                       <div className="h-8 w-8 bg-white/10 rounded-md" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-32 bg-white/5 rounded-xl border border-white/5 p-4 flex flex-col justify-between hover:bg-white/10 transition-colors cursor-pointer">
                         <div className="w-8 h-8 rounded-full bg-white/10" />
                         <div className="h-4 w-16 bg-white/20 rounded" />
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex-1 bg-white/5 rounded-xl border border-white/5 mt-4 p-6 relative overflow-hidden">
                     <div className="space-y-4">
                        {[1, 2, 3, 4].map(i => (
                           <div key={i} className="flex items-center justify-between border-b border-white/5 pb-4">
                              <div className="flex items-center gap-4">
                                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500" />
                                 <div className="space-y-2">
                                    <div className="h-3 w-32 bg-white/20 rounded" />
                                    <div className="h-2 w-20 bg-white/10 rounded" />
                                 </div>
                              </div>
                              <div className="h-6 w-16 bg-emerald-500/20 rounded-full" />
                           </div>
                        ))}
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* --- HOW IT WORKS (Workflow) --- */}
      <section className="py-32 px-6 bg-[#0B1120] relative">
         <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:48px_48px]"></div>
         <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-24">
               <h2 className="text-3xl md:text-5xl font-bold mb-6">Launch in 3 Simple Steps</h2>
               <p className="text-slate-400">From prospect to pipeline in minutes.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
               <div className="hidden md:block absolute top-12 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

               {[
                  { title: "Import Leads", desc: "Upload your CSV or add contacts manually.", icon: Users },
                  { title: "Configure Campaign", desc: "Set your email sequence and AI parameters.", icon: Sparkles },
                  { title: "Launch & Track", desc: "Go live and watch the replies roll in.", icon: TrendingUp }
               ].map((step, i) => (
                  <motion.div 
                     key={i}
                     initial={{ opacity: 0, y: 20 }}
                     whileInView={{ opacity: 1, y: 0 }}
                     viewport={{ once: true }}
                     transition={{ delay: i * 0.2 }}
                     className="relative flex flex-col items-center text-center"
                  >
                     <div className="w-24 h-24 rounded-2xl bg-[#0F172A] border border-indigo-500/30 flex items-center justify-center mb-8 relative z-10 shadow-[0_0_30px_-5px_rgba(79,70,229,0.3)]">
                        <step.icon className="w-10 h-10 text-indigo-400" />
                        <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold border border-[#0F172A]">
                           {i + 1}
                        </div>
                     </div>
                     <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                     <p className="text-slate-400 max-w-xs">{step.desc}</p>
                  </motion.div>
               ))}
            </div>
         </div>
      </section>

      {/* --- FEATURES BENTO GRID --- */}
      <section className="py-32 px-6 bg-[#0F172A] relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 max-w-3xl mx-auto">
             <h2 className="text-3xl md:text-5xl font-bold mb-6">Built for Growth</h2>
             <p className="text-slate-400 text-lg">Every feature you need to scale your outreach engine.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-6 md:auto-rows-[350px]">
             {/* Feature 1: Large Card */}
             <motion.div 
               whileHover={{ scale: 1.01 }}
               className="md:col-span-4 bg-gradient-to-br from-indigo-900/40 to-[#0F172A] p-10 rounded-3xl border border-white/10 relative overflow-hidden group"
             >
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/20 blur-[100px] rounded-full group-hover:bg-indigo-600/30 transition-colors" />
                <div className="relative z-10 h-full flex flex-col justify-between">
                   <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-6">
                      <Users className="w-8 h-8 text-indigo-400" />
                   </div>
                   <div>
                      <h3 className="text-3xl font-bold mb-4">Smart Lead Database</h3>
                      <p className="text-slate-400 text-lg max-w-md">Import your prospects instantly. We clean, organize, and enrich your contacts so you can focus on messaging.</p>
                      
                      {/* Abstract Visual */}
                      <div className="mt-8 flex gap-4 opacity-50">
                         {['Name', 'Email', 'Company', 'Status'].map((h, i) => (
                            <div key={i} className="px-4 py-2 bg-white/5 rounded-lg text-xs font-mono border border-white/5">{h}</div>
                         ))}
                      </div>
                   </div>
                </div>
             </motion.div>

             {/* Feature 2: Tall Vertical */}
             <motion.div 
               whileHover={{ scale: 1.01 }}
               className="md:col-span-2 md:row-span-2 bg-gradient-to-b from-[#1E293B]/50 to-[#0F172A] p-10 rounded-3xl border border-white/10 relative overflow-hidden group flex flex-col"
             >
                <div className="absolute bottom-0 right-0 w-full h-1/2 bg-gradient-to-t from-emerald-500/10 to-transparent" />
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-6">
                   <BarChart3 className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-3xl font-bold mb-4">Real-time Analytics</h3>
                <p className="text-slate-400 mb-8">Track open rates, replies, and conversions as they happen.</p>
                
                {/* Visual Chart */}
                <div className="flex-1 flex items-end gap-2 mt-4 opacity-80">
                   {[40, 60, 45, 70, 50, 80, 65].map((h, i) => (
                      <div key={i} className="flex-1 bg-emerald-500/20 rounded-t-lg relative group-hover:bg-emerald-500/40 transition-colors" style={{ height: `${h}%` }}>
                         <div className="absolute top-0 w-full h-1 bg-emerald-400/50" />
                      </div>
                   ))}
                </div>
             </motion.div>

             {/* Feature 3: Medium Card */}
             <motion.div 
               whileHover={{ scale: 1.01 }}
               className="md:col-span-2 bg-[#0B1120] p-10 rounded-3xl border border-white/10 relative overflow-hidden group"
             >
                <div className="absolute -right-10 -top-10 w-48 h-48 bg-purple-500/20 blur-[60px]" />
                <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-6">
                   <Sparkles className="w-7 h-7 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3">AI Personalization</h3>
                <p className="text-slate-400">Generative AI that writes like a human, for every single prospect.</p>
             </motion.div>

             {/* Feature 4: Medium Card */}
             <motion.div 
               whileHover={{ scale: 1.01 }}
               className="md:col-span-2 bg-[#0B1120] p-10 rounded-3xl border border-white/10 relative overflow-hidden group"
             >
                <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6">
                   <ShieldCheck className="w-7 h-7 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Enterprise Security</h3>
                <p className="text-slate-400">SOC2 compliant infrastructure keeping your data separate and safe.</p>
             </motion.div>
          </div>
        </div>
      </section>

      {/* --- TESTIMONIALS --- */}
      <section className="py-32 bg-[#0B1120] border-t border-white/5 relative overflow-hidden">
         <div className="max-w-7xl mx-auto px-6 mb-16 text-center">
            <h2 className="text-3xl md:text-5xl font-bold">Loved by Modern Sales Teams</h2>
         </div>

         <div className="relative w-full overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#0B1120] to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#0B1120] to-transparent z-10 pointer-events-none" />

            <motion.div 
               className="flex gap-8 w-max"
               animate={{ x: ["0%", "-50%"] }}
               transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
            >
               {[...testimonials, ...testimonials, ...testimonials, ...testimonials].map((t, i) => (
                  <div 
                     key={i}
                     className="w-[400px] bg-[#1E293B]/30 p-8 rounded-2xl border border-white/5 flex-shrink-0 relative hover:bg-[#1E293B]/50 transition-colors"
                  >
                     <MessageSquare className="w-8 h-8 text-indigo-500/20 absolute top-8 right-8" />
                     <p className="text-lg text-slate-300 mb-8 italic leading-relaxed">"{t.quote}"</p>
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-sm text-white shadow-lg">
                           {t.avatar}
                        </div>
                        <div>
                           <div className="font-bold text-white">{t.author}</div>
                           <div className="text-sm text-indigo-300">{t.role}</div>
                        </div>
                     </div>
                  </div>
               ))}
            </motion.div>
         </div>
      </section>

      {/* --- FAQ SECTION --- */}
      <section className="py-32 px-6 bg-[#0F172A]">
         <div className="max-w-7xl mx-auto  gap-16">
            <div >
               <h2 className="text-3xl md:text-6xl font-bold mb-6">Frequently  Asked Questions</h2>
               <p className="text-slate-400 text-lg mb-8 ">
                  Everything you need to know about Nudge billing, features, and security.
               </p>
               <Link href="/contact" className="text-indigo-400 mb-6 font-semibold hover:text-indigo-300 flex items-center gap-2">
                  Contact Support <ArrowRight className="w-4 h-4" />
               </Link>
            </div>
            
            <div className="flex flex-col gap-4">
               {faq.map((item, i) => (
                  <FAQItem 
                    key={i} 
                    item={item} 
                    isOpen={openFaqIndex === i} 
                    onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                  />
               ))}
            </div>
         </div>
      </section>

      {/* --- FINAL CTA --- */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-indigo-900/40 pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-block mb-6 p-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500">
             <div className="bg-[#0F172A] rounded-full px-4 py-1 text-sm font-medium">
                Limited Time Offer
             </div>
          </div>
          <h2 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight">
            Ready to scale your <br /> outreach?
          </h2>
          <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
            Join thousands of sales professionals using Nudge to automate their workflow and increase response rates today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/campaigns/new"
              className="px-10 py-5 bg-white text-slate-900 rounded-xl font-bold text-lg hover:bg-slate-100 transition-colors shadow-2xl shadow-indigo-500/20 flex items-center gap-2 transform hover:-translate-y-1"
            >
              <Zap className="w-5 h-5 fill-slate-900" />
              Start Free Campaign
            </Link>
            <Link 
              href="/contact"
               className="px-10 py-5 bg-transparent border border-white/20 text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-colors"
            >
               Talk to Sales
            </Link>
          </div>
          <p className="mt-8 text-sm text-slate-500 flex items-center justify-center gap-6">
             <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> No credit card required</span>
             <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 14-day free trial</span>
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}