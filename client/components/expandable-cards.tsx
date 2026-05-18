"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, MapPin } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";

interface Card {
  id: number;
  titleKey: string;
  descriptionKey: string;
  coords: string;
  pinColor: string;
}

const cards: Card[] = [
  {
    id: 1,
    titleKey: "card1Title",
    descriptionKey: "card1Description",
    coords: "45.5211° N",
    pinColor: "bg-mtl-red",
  },
  {
    id: 2,
    titleKey: "card2Title",
    descriptionKey: "card2Description",
    coords: "45.5048° N",
    pinColor: "bg-mtl-blue",
  },
  {
    id: 3,
    titleKey: "card3Title",
    descriptionKey: "card3Description",
    coords: "45.5430° N",
    pinColor: "bg-mtl-blue-dark",
  },
  {
    id: 4,
    titleKey: "card4Title",
    descriptionKey: "card4Description",
    coords: "45.4584° N",
    pinColor: "bg-mtl-yellow",
  },
];

function CardContent({
  card,
  isExpanded,
  interactive = false,
  onActivate,
}: {
  card: Card;
  isExpanded: boolean;
  interactive?: boolean;
  onActivate?: () => void;
}) {
  const { t } = useTranslation("common");
  const title = t(`whyChooseUs.${card.titleKey}`);
  const description = t(`whyChooseUs.${card.descriptionKey}`);

  return (
    <div
      className={`group relative h-[360px] overflow-hidden rounded-xl border border-mtl-blue/15 bg-white shadow-md transition-[border-color,box-shadow] duration-500 ease-in-out lg:h-full ${
        isExpanded
          ? "border-mtl-blue/30 shadow-lg"
          : "hover:border-mtl-blue/30 hover:shadow-lg"
      } ${interactive ? "cursor-pointer" : ""}`}
      onClick={interactive ? onActivate : undefined}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onActivate?.();
              }
            }
          : undefined
      }
    >
      {/* Mini map grid inside card */}
      <div
        aria-hidden
        className='absolute inset-0 opacity-60'
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 61, 165, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 61, 165, 0.06) 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
        }}
      />

      {/* Map pin */}
      <div className='absolute left-1/2 top-8 z-10 flex -translate-x-1/2 flex-col items-center'>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg ring-4 ring-white ${card.pinColor} transition-transform duration-500 ${isExpanded ? "scale-110" : ""}`}
        >
          <MapPin
            className={`h-5 w-5 ${card.pinColor.includes("yellow") ? "text-mtl-blue-dark" : "text-white"}`}
          />
        </div>
        <div className='h-4 w-0.5 bg-mtl-blue/30' />
        <div className='h-2.5 w-2.5 rotate-45 rounded-sm bg-mtl-blue/15' />
      </div>

      <div className='relative flex h-full flex-col justify-end p-6 pt-24'>
        <p className='mb-2 text-center font-mono text-[10px] uppercase tracking-widest text-mtl-blue/60'>
          {card.coords}
        </p>

        <div
          className='rounded-lg border border-mtl-blue/10 bg-white/95 p-4 shadow-sm backdrop-blur-sm'
        >
          <h3 className='mb-2 text-lg font-bold leading-tight text-mtl-blue-dark'>
            {title}
          </h3>

          <p
            className={`hidden text-xs leading-relaxed text-slate-500 transition-opacity duration-500 lg:block ${
              isExpanded ? "pointer-events-none h-0 overflow-hidden opacity-0" : "opacity-100"
            }`}
          >
            {description.slice(0, 72)}…
          </p>

          <div
            className={`grid transition-[grid-template-rows,opacity] duration-500 ease-in-out ${
              isExpanded
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0 lg:grid-rows-[0fr] lg:opacity-0"
            }`}
          >
            <div className='min-h-0 overflow-hidden'>
              <p className='mb-4 pt-2 text-sm leading-relaxed text-slate-600 lg:pt-0'>
                {description}
              </p>
              <span
                className={`inline-flex items-center gap-1.5 text-sm font-medium text-mtl-blue transition-[gap] duration-300 ${
                  isExpanded ? "gap-2.5" : ""
                }`}
              >
                {t("whyChooseUs.learnMore")}
                <ArrowRight
                  className={`h-4 w-4 transition-transform duration-300 ${
                    isExpanded ? "translate-x-1" : ""
                  }`}
                />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ExpandableCards() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [emblaRef] = useEmblaCarousel(
    {
      align: "center",
      slidesToScroll: 1,
      containScroll: "trimSnaps",
      dragFree: false,
    },
    []
  );

  return (
    <section className='py-2'>
      <div className='max-w-7xl mx-auto'>
        <div
          className='lg:hidden overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-2 px-2'
          ref={emblaRef}
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className='flex gap-3'>
            {cards.map((card) => (
              <div
                key={card.id}
                className='flex-[0_0_88%] min-w-0 snap-center'
              >
                <CardContent card={card} isExpanded />
              </div>
            ))}
          </div>
        </div>

        <div
          className='hidden lg:flex lg:h-[340px] lg:gap-4'
          onMouseLeave={() => setExpandedId(null)}
        >
          {cards.map((card) => {
            const isExpanded = expandedId === card.id;
            return (
              <div
                key={card.id}
                className={`min-h-0 min-w-0 transition-[flex-grow,flex-basis] duration-500 ease-in-out ${
                  isExpanded ? "flex-[2]" : "flex-1"
                }`}
                onMouseEnter={() => setExpandedId(card.id)}
              >
                <CardContent
                  card={card}
                  isExpanded={isExpanded}
                  interactive
                  onActivate={() =>
                    setExpandedId(isExpanded ? null : card.id)
                  }
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
