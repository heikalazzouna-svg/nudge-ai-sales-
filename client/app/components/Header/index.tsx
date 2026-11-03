"use client";

import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';

const navLinks = [

  { href: '/about', label: 'About us' },
  { href: '/contact', label: 'Contact' },
];

export default function Header() {
  return (
    <header className="w-full bg-background border-b border-primary/10 ">
      <div className="max-w-[120rem] mx-auto px-8 py-6">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <span className="font-heading text-3xl font-bold text-primary">Nudge</span>
          </Link>
          
          <nav className="flex items-center gap-12">
            {navLinks.map((link) => (
              <Link 
                id={link.href}
                key={link.href} 
                href={link.href} 
                className="font-paragraph text-base text-primary hover:opacity-70 transition-opacity"
              >
                {link.label}
              </Link>
            ))}
            
            {/* Auth-conditional button */}
            <SignedIn>
              <div className="flex items-center gap-4">
                <Link 
                  href="/dashboard" 
                  className="px-8 py-3 border-2 border-buttonborder bg-buttonbackground text-primary font-paragraph text-base hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  Dashboard
                </Link>
                <UserButton afterSignOutUrl="/" />
              </div>
            </SignedIn>
            
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-8 py-3 border-2 border-buttonborder bg-buttonbackground text-primary font-paragraph text-base hover:bg-primary hover:text-primary-foreground transition-colors">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
          </nav>
        </div>
      </div>
    </header>
  );
}
