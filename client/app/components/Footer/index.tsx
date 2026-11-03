import Link from 'next/link';
import { Mail, Linkedin, Twitter } from 'lucide-react';

const product = [
  { href: '#', label: 'Features' },
  { href: '#', label: 'Lead Import' },
  { href: '#', label: 'AI Email Generation' },
  { href: '#', label: 'Workflow Automation' },
]

const navLinks = [
  { href: '/about', label: 'About Us' },
  { href: '/contact', label: 'Contact' },
];

export default function Footer() {
  return (
    <footer className="w-full bg-secondary text-secondary-foreground">
      <div className="max-w-[120rem] mx-auto px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-6">
            <h3 className="font-heading text-2xl font-bold text-secondary-foreground">Nudge</h3>
            <p className="font-paragraph text-base text-secondary-foreground/80">
              AI-powered sales outreach that helps SDRs close more deals with personalized, automated email campaigns.
            </p>
          </div>
          
          <div className="space-y-6">
            <h4 className="font-heading text-xl font-semibold text-secondary-foreground">Product</h4>
            <nav className="flex flex-col gap-3">
            {product.map((link) => (
              <Link 
                id={link.href}
                key={link.href} 
                href={link.href} 
                className="font-paragraph text-base text-secondary-foreground/80 hover:text-secondary-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
            </nav>
          </div>
          
          <div className="space-y-6">
            <h4 className="font-heading text-xl font-semibold text-secondary-foreground">Company</h4>
            <nav className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link 
                  id={link.href}
                  key={link.href} 
                  href={link.href} 
                  className="font-paragraph text-base text-secondary-foreground/80 hover:text-secondary-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          
          <div className="space-y-6">
            <h4 className="font-heading text-xl font-semibold text-secondary-foreground">Connect</h4>
            <div className="flex gap-4">
              <a 
                href="mailto:hello@nudge.ai" 
                className="p-3 border border-secondary-foreground/20 hover:border-secondary-foreground/40 transition-colors"
                aria-label="Email"
              >
                <Mail className="w-5 h-5 text-secondary-foreground" />
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 border border-secondary-foreground/20 hover:border-secondary-foreground/40 transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5 text-secondary-foreground" />
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 border border-secondary-foreground/20 hover:border-secondary-foreground/40 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5 text-secondary-foreground" />
              </a>
            </div>
          </div>
        </div>
        
        <div className="mt-20 border-t border-white/10 pt-8 flex flex-col items-center overflow-hidden">
          <h1 className="text-[27vw] font-bold leading-none tracking-tighter text-white/5 select-none pointer-events-none text-center">
            Nudge
          </h1>
          <div className="flex flex-col md:flex-row justify-between items-center w-full mt-8 text-sm text-slate-500 max-w-[90rem]">
            <p>© {new Date().getFullYear()} Nudge. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
               <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
               <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
