"use client";

import { useTranslation } from "react-i18next";
import Link from "next/link";
import { Twitter, Instagram } from "lucide-react";

const footerLinkClass = "text-white hover:text-brand-yellow transition-colors";

export function Footer() {
  const { t } = useTranslation("common");

  return (
    <footer className='bg-mtl-blue py-12 px-8'>
      <div className='max-w-7xl mx-auto'>
        <div className='grid grid-cols-2 md:grid-cols-6 gap-8 mb-16'>
          <div>
            <h3 className='font-bold text-white mb-4 text-sm uppercase tracking-wide'>
              {t("footer.tours")}
            </h3>
            <ul className='space-y-2 text-sm'>
              <li>
                <Link href='/' className={footerLinkClass}>
                  {t("footer.allTours")}
                </Link>
              </li>
              <li>
                <Link href='/' className={footerLinkClass}>
                  {t("footer.featured")}
                </Link>
              </li>
              <li>
                <Link href='/' className={footerLinkClass}>
                  {t("footer.popular")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className='font-bold text-white mb-4 text-sm uppercase tracking-wide'>
              {t("footer.contact")}
            </h3>
            <ul className='space-y-2 text-sm'>
              <li>
                <Link href='/contact' className={footerLinkClass}>
                  {t("footer.email")}
                </Link>
              </li>
              <li>
                <a href='#' className={footerLinkClass}>
                  <Twitter className='inline w-4 h-4 mr-1' />X
                </a>
              </li>
              <li>
                <a href='#' className={footerLinkClass}>
                  <Instagram className='inline w-4 h-4 mr-1' />
                  Instagram
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className='font-bold text-white mb-4 text-sm uppercase tracking-wide'>
              {t("footer.media")}
            </h3>
            <ul className='space-y-2 text-sm'>
              <li>
                <a href='#' className={footerLinkClass}>
                  {t("footer.pressKit")}
                </a>
              </li>
              <li>
                <a href='#' className={footerLinkClass}>
                  {t("footer.gallery")}
                </a>
              </li>
              <li>
                <a href='#' className={footerLinkClass}>
                  {t("footer.stories")}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className='font-bold text-white mb-4 text-sm uppercase tracking-wide'>
              {t("footer.resources")}
            </h3>
            <ul className='space-y-2 text-sm'>
              <li>
                <a href='#' className={footerLinkClass}>
                  {t("footer.blog")}
                </a>
              </li>
              <li>
                <a href='#' className={footerLinkClass}>
                  {t("footer.guides")}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className='font-bold text-white mb-4 text-sm uppercase tracking-wide'>
              {t("footer.legal")}
            </h3>
            <ul className='space-y-2 text-sm'>
              <li>
                <a href='#' className={footerLinkClass}>
                  {t("footer.privacy")}
                </a>
              </li>
              <li>
                <a href='#' className={footerLinkClass}>
                  {t("footer.terms")}
                </a>
              </li>
            </ul>
          </div>

          <div className='text-right'>
            <p className='text-xs text-white/70 mb-1'>
              © {new Date().getFullYear()} {t("footer.copyright")}
            </p>
            <p className='text-xs text-white/70'>{t("footer.rights")}</p>
          </div>
        </div>

        <div className='text-center'>
          <Link href='/' className='inline-block'>
            <h2 className='text-6xl md:text-8xl font-bold text-brand-yellow tracking-tight'>
              <span className='font-patrick-hand'>MaVille.club</span>
            </h2>
          </Link>
        </div>
      </div>
    </footer>
  );
}
