"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/navbar";

const HERO_IMAGE_WINTER =
  "https://images.pexels.com/photos/19584061/pexels-photo-19584061.jpeg?auto=compress&cs=tinysrgb&w=1920";
const HERO_IMAGE_SUMMER =
  "https://images.pexels.com/photos/12879617/pexels-photo-12879617.jpeg?auto=compress&cs=tinysrgb&w=1920";

function getHeroBackgroundImage(date = new Date()) {
  const month = date.getMonth() + 1;
  return month >= 5 && month <= 9 ? HERO_IMAGE_SUMMER : HERO_IMAGE_WINTER;
}

export function Hero() {
  const { t } = useTranslation("common");
  const backgroundImage = getHeroBackgroundImage();

  return (
    <div className='h-[70vh] relative'>
      <div
        className='absolute inset-0 bg-cover bg-center bg-no-repeat'
        style={{
          backgroundImage: `url('${backgroundImage}')`,
        }}
      >
        <div className='absolute inset-0 bg-gradient-to-b from-mtl-blue/85 via-mtl-blue/65 to-mtl-blue-dark/90' />
      </div>

      <Navbar />

      <div className='relative z-10 flex flex-col h-full justify-center pt-20 lg:pt-0 bg-black/40'>
        <div className='flex-1 flex flex-col justify-center items-center px-8 lg:px-16 pt-12 pb-32 sm:py-12 max-w-5xl mx-auto text-center'>
          <div className='mb-6'>
            <div className='text-brand-yellow text-xs lg:text-sm font-medium tracking-widest drop-shadow-lg'>
              {t("hero.tagline")}
            </div>
          </div>

          <h1 className='text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-white leading-none tracking-tight mb-8 drop-shadow-2xl'>
            {t("hero.title")
              .split("\n")
              .map((line, i) => (
                <span key={i}>
                  {line}
                  {i < t("hero.title").split("\n").length - 1 && <br />}
                </span>
              ))}
          </h1>

          <p className='hidden sm:block text-white/90 text-lg lg:text-xl max-w-2xl drop-shadow-lg leading-relaxed mb-12'>
            {t("hero.description")}
          </p>

          <Button
            asChild
            className='bg-brand-yellow hover:bg-brand-yellow/90 text-mtl-blue-dark font-bold px-16 py-7 text-lg rounded-full transition-all group flex items-center gap-3'
          >
            <a href='/app'>
              {t("hero.cta")}
              <ArrowRight className='w-6 h-6 transition-transform group-hover:translate-x-2' />
            </a>
          </Button>

          <div className='hidden sm:flex flex-wrap justify-center items-center gap-8 mt-16 text-white/90'>
            <div className='flex items-center gap-2'>
              <div className='w-2 h-2 bg-mtl-red rounded-full' />
              <span className='text-xs lg:text-sm font-medium drop-shadow-lg'>
                {t("hero.updates")}
              </span>
            </div>
            <div className='flex items-center gap-2'>
              <div className='w-2 h-2 bg-brand-yellow rounded-full' />
              <span className='text-xs lg:text-sm font-medium drop-shadow-lg'>
                {t("hero.alerts")}
              </span>
            </div>
            <div className='flex items-center gap-2'>
              <div className='w-2 h-2 bg-mtl-red rounded-full' />
              <span className='text-xs lg:text-sm font-medium drop-shadow-lg'>
                {t("hero.allStreets")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
