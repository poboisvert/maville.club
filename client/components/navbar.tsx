"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Navbar() {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);

  const navLinks = [
    { href: "/", label: t("nav.home") },
    { href: "/app", label: t("nav.liveMap") },
    { href: "/contact", label: t("nav.contact") },
  ];

  return (
    <nav className='absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-8 lg:px-16 py-6'>
      {/* Burger menu - left on mobile */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            className='lg:hidden text-white hover:text-brand-yellow transition-colors'
            aria-label='Toggle menu'
          >
            <Menu className='w-6 h-6 drop-shadow-md' />
          </button>
        </SheetTrigger>
        <SheetContent
          side='left'
          className='bg-gradient-to-b from-mtl-frost via-white to-white border-0 p-0 overflow-hidden'
        >
          {/* Content */}
          <div className='relative z-10 flex flex-col h-full'>
            {/* Header */}
            <div className='px-6 pt-8 pb-6 border-b border-mtl-blue/10'>
              <a
                href='/'
                className='text-mtl-blue text-xl font-medium tracking-wider inline-block'
                onClick={() => setOpen(false)}
              >
                <span className='font-patrick-hand'>MaVille.club</span>
              </a>
            </div>

            {/* Navigation Links */}
            <nav className='flex-1 px-6 py-8 space-y-1'>
              {navLinks.map((link, index) => (
                <a
                  key={link.href}
                  href={link.href}
                  className='block py-3 px-4 rounded-lg text-gray-700 hover:bg-mtl-blue/10 hover:text-mtl-blue transition-all duration-200 text-base font-light tracking-wide group'
                  onClick={() => setOpen(false)}
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  <span className='relative'>
                    {link.label}
                    <span className='absolute bottom-0 left-0 w-0 h-0.5 bg-mtl-blue transition-all duration-300 group-hover:w-full' />
                  </span>
                </a>
              ))}
            </nav>
          </div>
        </SheetContent>
      </Sheet>

      {/* Logo - left on desktop, right on mobile */}
      <a
        href='/'
        className='text-white text-sm lg:text-base font-medium tracking-wider drop-shadow-lg order-2 lg:order-1 hover:text-brand-yellow transition-colors'
      >
        <span className='font-patrick-hand'>MaVille.club</span>
      </a>

      {/* Desktop navigation - right */}
      <div className='hidden lg:flex items-center gap-8 lg:gap-12 order-2'>
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className='text-white hover:text-brand-yellow transition-colors text-sm drop-shadow-md'
          >
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
