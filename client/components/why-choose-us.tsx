"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  Building2,
  Camera,
  Layers,
  MapPin,
  Minus,
  Navigation,
  Plus,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ExpandableCards } from "@/components/expandable-cards";
import { Button } from "@/components/ui/button";

interface Feature {
  titleKey: string;
  descriptionKey: string;
  icon: LucideIcon;
  coords: string;
  pinClass: string;
}

const features: Feature[] = [
  {
    titleKey: "feature1Title",
    descriptionKey: "feature1Description",
    icon: Zap,
    coords: "45.5088° N · 73.5542° W",
    pinClass: "bg-mtl-red",
  },
  {
    titleKey: "feature2Title",
    descriptionKey: "feature2Description",
    icon: Layers,
    coords: "45.5017° N · 73.5673° W",
    pinClass: "bg-mtl-blue",
  },
  {
    titleKey: "feature3Title",
    descriptionKey: "feature3Description",
    icon: Camera,
    coords: "45.4950° N · 73.5794° W",
    pinClass: "bg-mtl-yellow text-mtl-blue-dark",
  },
  {
    titleKey: "feature4Title",
    descriptionKey: "feature4Description",
    icon: Building2,
    coords: "45.5145° N · 73.5430° W",
    pinClass: "bg-mtl-blue-dark",
  },
];

function MapGridBackground() {
  return (
    <div
      aria-hidden
      className='pointer-events-none absolute inset-0'
      style={{
        backgroundImage: `
          linear-gradient(rgba(0, 61, 165, 0.07) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 61, 165, 0.07) 1px, transparent 1px),
          linear-gradient(rgba(0, 61, 165, 0.12) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 61, 165, 0.12) 1px, transparent 1px)
        `,
        backgroundSize: "24px 24px, 24px 24px, 120px 120px, 120px 120px",
      }}
    />
  );
}

function MapChrome() {
  const { t } = useTranslation("common");

  return (
    <div className='flex flex-wrap items-center gap-3'>
      <span className='inline-flex items-center gap-1.5 rounded-full border border-mtl-blue/20 bg-white/90 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-mtl-blue shadow-sm'>
        <span className='relative flex h-2 w-2'>
          <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-mtl-red opacity-60' />
          <span className='relative inline-flex h-2 w-2 rounded-full bg-mtl-red' />
        </span>
        {t("whyChooseUs.mapBadge")}
      </span>
      <div className='flex overflow-hidden rounded-lg border border-mtl-blue/15 bg-white shadow-sm'>
        <button
          type='button'
          aria-hidden
          tabIndex={-1}
          className='flex h-9 w-9 items-center justify-center border-r border-mtl-blue/10 text-mtl-blue/50'
        >
          <Plus className='h-4 w-4' />
        </button>
        <button
          type='button'
          aria-hidden
          tabIndex={-1}
          className='flex h-9 w-9 items-center justify-center text-mtl-blue/50'
        >
          <Minus className='h-4 w-4' />
        </button>
      </div>
      <span className='font-mono text-xs text-mtl-blue/70'>
        {t("whyChooseUs.mapCoords")}
      </span>
    </div>
  );
}

function FeaturePanel({
  feature,
  index,
}: {
  feature: Feature;
  index: number;
}) {
  const { t } = useTranslation("common");
  const Icon = feature.icon;
  const title = t(`whyChooseUs.${feature.titleKey}`);
  const description = t(`whyChooseUs.${feature.descriptionKey}`);

  return (
    <article
      className='group relative rounded-xl border border-mtl-blue/12 bg-white/95 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-mtl-blue/25 hover:shadow-md'
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className='absolute -top-px left-8 flex flex-col items-center'>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full shadow-md ring-4 ring-white ${feature.pinClass}`}
        >
          <Icon
            className={`h-4 w-4 ${feature.pinClass.includes("yellow") ? "text-mtl-blue-dark" : "text-white"}`}
            strokeWidth={2.25}
          />
        </div>
        <div className='h-3 w-0.5 bg-mtl-blue/25' />
        <div className='h-2 w-2 rotate-45 rounded-sm bg-mtl-blue/20' />
      </div>

      <p className='mb-3 mt-5 font-mono text-[10px] uppercase tracking-widest text-mtl-blue/55'>
        {feature.coords}
      </p>

      <h3 className='mb-3 text-lg font-semibold uppercase leading-tight tracking-tight text-mtl-blue-dark'>
        {title.split("\n").map((line, i) => (
          <span key={i}>
            {line}
            {i < title.split("\n").length - 1 && <br />}
          </span>
        ))}
      </h3>

      <p className='text-sm leading-relaxed text-slate-600'>{description}</p>
    </article>
  );
}

export function WhyChooseUs() {
  const { t } = useTranslation("common");
  const title = t("whyChooseUs.title");

  return (
    <section className='relative z-10 -mt-12 w-full overflow-hidden rounded-t-[40px] bg-[#dce6f0] px-8 py-16 lg:px-16 lg:py-24'>
      <MapGridBackground />

      {/* Decorative route lines */}
      <svg
        aria-hidden
        className='pointer-events-none absolute inset-0 h-full w-full text-mtl-blue/10'
        preserveAspectRatio='none'
      >
        <path
          d='M0 180 Q200 120 400 200 T800 160 T1200 220 T1600 140'
          fill='none'
          stroke='currentColor'
          strokeWidth='3'
          strokeDasharray='8 12'
        />
        <path
          d='M0 420 Q300 380 600 440 T1200 400'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeDasharray='6 10'
        />
      </svg>

      {/* Floating pins on the grid */}
      <div
        aria-hidden
        className='pointer-events-none absolute left-[12%] top-[28%] h-3 w-3 rounded-full bg-mtl-red/40 ring-4 ring-mtl-red/10'
      />
      <div
        aria-hidden
        className='pointer-events-none absolute right-[18%] top-[22%] h-2.5 w-2.5 rounded-full bg-mtl-blue/50 ring-4 ring-mtl-blue/10'
      />
      <div
        aria-hidden
        className='pointer-events-none absolute bottom-[35%] left-[42%] h-2 w-2 rounded-full bg-mtl-yellow/70 ring-4 ring-mtl-yellow/20'
      />

      <div className='relative z-10 mx-auto max-w-7xl'>
        {/* Header */}
        <div className='mb-10 flex flex-col gap-8 lg:mb-14 lg:flex-row lg:items-end lg:justify-between'>
          <div className='max-w-3xl'>
            <p className='mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-widest text-mtl-blue'>
              <Navigation className='h-4 w-4' aria-hidden />
              {t("whyChooseUs.label")}
            </p>
            <h2 className='text-3xl font-bold uppercase leading-[1.05] tracking-tight text-mtl-blue-dark lg:text-5xl xl:text-6xl'>
              {title.split("\n").map((line, i) => (
                <span key={i}>
                  {line}
                  {i < title.split("\n").length - 1 && <br />}
                </span>
              ))}
            </h2>
          </div>
          <MapChrome />
        </div>

        {/* Map canvas with feature panels */}
        <div className='relative overflow-hidden rounded-2xl border border-mtl-blue/15 bg-white/60 shadow-xl backdrop-blur-md'>
          <MapGridBackground />
          <div className='absolute left-4 top-4 z-20 rounded-md border border-mtl-blue/10 bg-white/95 px-2.5 py-1.5 shadow-sm'>
            <p className='text-[10px] font-semibold uppercase tracking-wider text-mtl-blue'>
              Montréal
            </p>
            <p className='font-mono text-[9px] text-slate-500'>EPSG:4326</p>
          </div>

          <div className='relative z-10 grid grid-cols-1 gap-4 p-5 md:grid-cols-2 lg:gap-5 lg:p-8'>
            {features.map((feature, index) => (
              <FeaturePanel key={feature.titleKey} feature={feature} index={index} />
            ))}
          </div>

          <div className='relative z-10 flex flex-col items-start justify-between gap-4 border-t border-mtl-blue/10 bg-mtl-blue/5 px-5 py-4 sm:flex-row sm:items-center lg:px-8'>
            <p className='flex items-center gap-2 text-sm text-mtl-blue-dark/80'>
              <MapPin className='h-4 w-4 shrink-0 text-mtl-red' aria-hidden />
              {t("whyChooseUs.mapHint")}
            </p>
            <Button
              asChild
              className='rounded-full bg-mtl-blue px-6 text-white hover:bg-mtl-blue-dark'
            >
              <Link href='/app'>{t("whyChooseUs.openMap")}</Link>
            </Button>
          </div>
        </div>

        {/* Borough coverage */}
        <div className='mt-14 lg:mt-20'>
          <div className='mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
            <div>
              <p className='mb-2 font-mono text-[11px] uppercase tracking-widest text-mtl-blue/70'>
                {t("whyChooseUs.boroughsLabel")}
              </p>
              <h3 className='text-2xl font-bold uppercase tracking-tight text-mtl-blue-dark lg:text-3xl'>
                {t("whyChooseUs.boroughsTitle")}
              </h3>
            </div>
            <p className='max-w-md text-sm text-slate-600'>
              {t("whyChooseUs.feature2Description")}
            </p>
          </div>
          <ExpandableCards />
        </div>
      </div>
    </section>
  );
}
