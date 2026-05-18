"use client";

import React from "react";
import { Button } from "@/components/ui/button";

import { RichText } from "@/components/rich-text";
import {
  Check,
  ArrowRight,
  Menu,
  X as XIcon,
  Snowflake,
  CloudRain,
  Thermometer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export interface LandingPageData {
  // Header Section
  title: string;
  subtitle?: string;
  shortDescription: string;
  heroImage?: string;

  // Summary Section
  summary?: string;
  summaryOrder?: number;
  ctaButton: {
    text: string;
    href: string;
    variant?:
      | "default"
      | "destructive"
      | "outline"
      | "secondary"
      | "ghost"
      | "link";
  };

  // Weather Forecast Section
  weatherForecast?: {
    title?: string;
    description?: string;
    order?: number;
    forecasts: Array<{
      date: string;
      snow?: {
        amount?: string;
        probability?: number;
      };
      rain?: {
        amount?: string;
        probability?: number;
      };
      temperature?: {
        high?: number;
        low?: number;
        unit?: "C" | "F";
      };
    }>;
  };

  // What You Get Section
  whatYouGet?: {
    title?: string;
    description?: string;
    order?: number;
    items: Array<{
      title: string;
      description?: string;
      icon?: React.ReactNode;
    }>;
  };

  // Helping For Section
  helpingFor?: {
    title?: string;
    description?: string;
    order?: number;
    items: Array<{
      title: string;
      description?: string;
    }>;
  };

  // Rich Content Section
  richContent?: string;
  richContentOrder?: number;

  // Pros and Cons Section
  prosAndCons?: {
    title?: string;
    order?: number;
    pros: string[];
    cons: string[];
  };

  // Media Section
  media?: {
    title?: string;
    description?: string;
    youtubeUrl?: string;
    order?: number;
  };

  // Image Carousel Section
  imageCarousel?: {
    title?: string;
    description?: string;
    order?: number;
    images: Array<{
      url: string;
      alt?: string;
      caption?: string;
    }>;
  };

  // Optional styling
  className?: string;
  containerClassName?: string;
}

type SectionType =
  | "summary"
  | "whatYouGet"
  | "helpingFor"
  | "richContent"
  | "prosAndCons"
  | "media"
  | "weatherForecast"
  | "imageCarousel";

interface SectionItem {
  type: SectionType;
  order: number;
  component: React.ReactNode;
}

// Helper function to extract YouTube video ID from various URL formats
function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export function LandingPageTemplate({
  title,
  subtitle,
  shortDescription,
  heroImage,
  summary,
  summaryOrder = 1,
  ctaButton,
  whatYouGet,
  helpingFor,
  richContent,
  richContentOrder,
  prosAndCons,
  media,
  weatherForecast,
  imageCarousel,
  className,
  containerClassName,
}: LandingPageData) {
  // Default order values if not specified
  const defaultOrders: Record<SectionType, number> = {
    summary: 1,
    weatherForecast: 1,
    whatYouGet: 2,
    helpingFor: 3,
    richContent: 4,
    prosAndCons: 5,
    media: 6,
    imageCarousel: 7,
  };

  // Build sections array with their orders
  const sections: SectionItem[] = [];

  // Summary Section (only if summary exists)
  if (summary) {
    sections.push({
      type: "summary",
      order: summaryOrder,
      component: (
        <section key='summary' className='mb-20'>
          <div className='bg-brand-blue/10 border-l-4 border-brand-blue p-8 md:p-10 rounded-r-lg'>
            <h2 className='text-2xl md:text-3xl font-bold mb-6 text-slate-800 dark:text-slate-100'>
              Summary
            </h2>
            <p className='text-base md:text-lg leading-relaxed text-slate-700 dark:text-slate-300 mb-8'>
              {summary}
            </p>
            <Button
              asChild
              variant={ctaButton.variant || "default"}
              size='lg'
              className='w-full sm:w-auto bg-brand-yellow hover:bg-brand-yellow/90 text-slate-900 font-semibold shadow-md hover:shadow-lg transition-shadow'
            >
              <a href={ctaButton.href}>
                {ctaButton.text}
                <ArrowRight className='ml-2 h-4 w-4' />
              </a>
            </Button>
          </div>
        </section>
      ),
    });
  }

  // Weather Forecast Section (only render if forecasts exist)
  if (
    weatherForecast &&
    weatherForecast.forecasts &&
    Array.isArray(weatherForecast.forecasts) &&
    weatherForecast.forecasts.length > 0
  ) {
    const forecasts = weatherForecast.forecasts;
    sections.push({
      type: "weatherForecast",
      order: weatherForecast.order ?? defaultOrders.weatherForecast,
      component: (
        <section key='weatherForecast' className='mb-20'>
          <div className='bg-brand-blue/10 border-l-4 border-brand-blue p-8 md:p-10 rounded-r-lg'>
            <h2 className='text-2xl md:text-3xl font-bold mb-4 text-slate-800 dark:text-slate-100'>
              {weatherForecast.title || "Weather Forecast"}
            </h2>
            {weatherForecast.description && (
              <p className='text-slate-600 dark:text-slate-400 mb-6 text-lg'>
                {weatherForecast.description}
              </p>
            )}
            <div className='space-y-4'>
              {forecasts.map((forecast, index) => {
                if (!forecast) return null;
                return (
                  <div
                    key={index}
                    className='bg-white dark:bg-slate-800 border-2 border-brand-blue/30 rounded-lg p-6'
                  >
                    {forecast.date && (
                      <h3 className='text-xl font-bold mb-4 text-slate-800 dark:text-slate-100'>
                        {forecast.date}
                      </h3>
                    )}
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                      {/* Snow Forecast */}
                      {forecast.snow && (
                        <div className='flex items-start gap-3'>
                          <Snowflake className='h-5 w-5 text-brand-blue mt-1 flex-shrink-0' />
                          <div>
                            <p className='font-semibold text-slate-800 dark:text-slate-100'>
                              Snow
                            </p>
                            {forecast.snow.amount && (
                              <p className='text-slate-600 dark:text-slate-400 text-sm'>
                                {forecast.snow.amount}
                              </p>
                            )}
                            {forecast.snow.probability !== undefined &&
                              forecast.snow.probability !== null && (
                                <p className='text-slate-500 dark:text-slate-500 text-sm'>
                                  {forecast.snow.probability}% chance
                                </p>
                              )}
                          </div>
                        </div>
                      )}

                      {/* Rain Forecast */}
                      {forecast.rain && (
                        <div className='flex items-start gap-3'>
                          <CloudRain className='h-5 w-5 text-brand-blue mt-1 flex-shrink-0' />
                          <div>
                            <p className='font-semibold text-slate-800 dark:text-slate-100'>
                              Rain
                            </p>
                            {forecast.rain.amount && (
                              <p className='text-slate-600 dark:text-slate-400 text-sm'>
                                {forecast.rain.amount}
                              </p>
                            )}
                            {forecast.rain.probability !== undefined &&
                              forecast.rain.probability !== null && (
                                <p className='text-slate-500 dark:text-slate-500 text-sm'>
                                  {forecast.rain.probability}% chance
                                </p>
                              )}
                          </div>
                        </div>
                      )}

                      {/* Temperature */}
                      {forecast.temperature && (
                        <div className='flex items-start gap-3'>
                          <Thermometer className='h-5 w-5 text-brand-orange mt-1 flex-shrink-0' />
                          <div>
                            <p className='font-semibold text-slate-800 dark:text-slate-100'>
                              Temperature
                            </p>
                            {(forecast.temperature.high !== undefined ||
                              forecast.temperature.low !== undefined) && (
                              <p className='text-slate-600 dark:text-slate-400 text-sm'>
                                {forecast.temperature.low !== undefined &&
                                forecast.temperature.high !== undefined
                                  ? `${forecast.temperature.low}°${
                                      forecast.temperature.unit || "C"
                                    } - ${forecast.temperature.high}°${
                                      forecast.temperature.unit || "C"
                                    }`
                                  : forecast.temperature.high !== undefined
                                    ? `High: ${forecast.temperature.high}°${
                                        forecast.temperature.unit || "C"
                                      }`
                                    : `Low: ${forecast.temperature.low}°${
                                        forecast.temperature.unit || "C"
                                      }`}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <Button
              asChild
              variant={ctaButton.variant || "default"}
              size='lg'
              className='w-full sm:w-auto bg-brand-yellow hover:bg-brand-yellow/90 text-slate-900 font-semibold shadow-md hover:shadow-lg transition-shadow mt-6'
            >
              <a href={ctaButton.href}>
                {ctaButton.text}
                <ArrowRight className='ml-2 h-4 w-4' />
              </a>
            </Button>
          </div>
        </section>
      ),
    });
  }

  // Combined What You Get and Helping For Section
  // If both exist, combine them into a 2-column layout
  if (
    (whatYouGet && whatYouGet.items.length > 0) ||
    (helpingFor && helpingFor.items.length > 0)
  ) {
    // Determine the order - use the first available section's order
    const combinedOrder =
      whatYouGet?.order ??
      helpingFor?.order ??
      Math.min(defaultOrders.whatYouGet, defaultOrders.helpingFor);

    sections.push({
      type: whatYouGet ? "whatYouGet" : "helpingFor",
      order: combinedOrder,
      component: (
        <section
          key='combinedFeatures'
          className='mb-20 bg-brand-green/5 dark:bg-brand-green/10 py-12 px-6 md:px-8 rounded-lg'
        >
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12'>
            {/* Left Column: What You Get - 1 column layout (stacked) */}
            {whatYouGet && whatYouGet.items.length > 0 && (
              <div>
                <div className='mb-8'>
                  <h2 className='text-3xl md:text-4xl font-bold mb-3 text-slate-800 dark:text-slate-100'>
                    {whatYouGet.title || "What You Get"}
                  </h2>
                  {whatYouGet.description && (
                    <p className='text-slate-600 dark:text-slate-400 mb-4 text-lg'>
                      {whatYouGet.description}
                    </p>
                  )}
                  <div className='w-24 h-1 bg-brand-green'></div>
                </div>
                <ul className='space-y-4'>
                  {whatYouGet.items.map((item, index) => (
                    <li
                      key={index}
                      className='text-slate-700 dark:text-slate-300'
                    >
                      <span className='font-semibold text-slate-800 dark:text-slate-100'>
                        {item.title}
                        {item.description && ": "}
                      </span>
                      {item.description && (
                        <span className='text-slate-600 dark:text-slate-400'>
                          {item.description}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Right Column: Who We're Helping - 1 column layout (stacked) */}
            {helpingFor && helpingFor.items.length > 0 && (
              <div>
                <div className='mb-8'>
                  <h2 className='text-3xl md:text-4xl font-bold mb-3 text-slate-800 dark:text-slate-100'>
                    {helpingFor.title || "Who We're Helping"}
                  </h2>
                  {helpingFor.description && (
                    <p className='text-slate-600 dark:text-slate-400 mb-4 text-lg'>
                      {helpingFor.description}
                    </p>
                  )}
                  <div className='w-24 h-1 bg-brand-orange'></div>
                </div>
                <ul className='space-y-4'>
                  {helpingFor.items.map((item, index) => (
                    <li
                      key={index}
                      className='text-slate-700 dark:text-slate-300'
                    >
                      <span className='font-semibold text-slate-800 dark:text-slate-100'>
                        {item.title}
                        {item.description && ": "}
                      </span>
                      {item.description && (
                        <span className='text-slate-600 dark:text-slate-400'>
                          {item.description}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      ),
    });
  }

  // Rich Content Section
  if (richContent) {
    sections.push({
      type: "richContent",
      order: richContentOrder ?? defaultOrders.richContent,
      component: (
        <section key='richContent' className='mb-20'>
          <div className='bg-slate-50 dark:bg-slate-900/50 border-2 border-brand-green/20 rounded-lg p-8 md:p-10'>
            <RichText
              content={richContent}
              className='prose prose-lg max-w-none prose-slate dark:prose-invert prose-headings:text-slate-800 dark:prose-headings:text-slate-100 prose-p:text-slate-700 dark:prose-p:text-slate-300'
            />
          </div>
        </section>
      ),
    });
  }

  // Pros and Cons Section
  if (prosAndCons) {
    sections.push({
      type: "prosAndCons",
      order: prosAndCons.order ?? defaultOrders.prosAndCons,
      component: (
        <section key='prosAndCons' className='mb-20'>
          <div className='text-center mb-12'>
            <h2 className='text-3xl md:text-4xl font-bold mb-3 text-slate-800 dark:text-slate-100'>
              {prosAndCons.title || "Pros and Cons"}
            </h2>
            <div className='w-24 h-1 bg-brand-blue mx-auto'></div>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
            {/* Pros */}
            <div className='bg-brand-green/10 border-2 border-brand-green rounded-lg p-6'>
              <h3 className='text-xl font-bold flex items-center gap-2 mb-6 text-slate-800 dark:text-slate-100'>
                <Check className='h-6 w-6 text-brand-green' />
                Pros
              </h3>
              <ul className='space-y-4'>
                {prosAndCons.pros.map((pro, index) => (
                  <li key={index} className='flex items-start gap-3'>
                    <Check className='h-5 w-5 text-brand-green mt-0.5 flex-shrink-0' />
                    <span className='text-slate-700 dark:text-slate-300'>
                      {pro}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cons */}
            <div className='bg-slate-100 dark:bg-slate-800/50 border-2 border-slate-300 dark:border-slate-600 rounded-lg p-6'>
              <h3 className='text-xl font-bold flex items-center gap-2 mb-6 text-slate-800 dark:text-slate-100'>
                <XIcon className='h-6 w-6 text-slate-600 dark:text-slate-400' />
                Cons
              </h3>
              <ul className='space-y-4'>
                {prosAndCons.cons.map((con, index) => (
                  <li key={index} className='flex items-start gap-3'>
                    <XIcon className='h-5 w-5 text-slate-500 dark:text-slate-500 mt-0.5 flex-shrink-0' />
                    <span className='text-slate-700 dark:text-slate-300'>
                      {con}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ),
    });
  }

  // Media Section
  if (media && media.youtubeUrl) {
    const videoId = getYouTubeVideoId(media.youtubeUrl);
    if (videoId) {
      sections.push({
        type: "media",
        order: media.order ?? defaultOrders.media,
        component: (
          <section key='media' className='mb-20'>
            <div className='text-center mb-12'>
              {media.title && (
                <>
                  <h2 className='text-3xl md:text-4xl font-bold mb-3 text-slate-800 dark:text-slate-100'>
                    {media.title}
                  </h2>
                  <div className='w-24 h-1 bg-brand-orange mx-auto mb-4'></div>
                </>
              )}
              {media.description && (
                <p className='text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg'>
                  {media.description}
                </p>
              )}
            </div>
            <div
              className='relative w-full'
              style={{ paddingBottom: "56.25%" }}
            >
              <iframe
                className='absolute top-0 left-0 w-full h-full rounded-lg border-2 border-brand-orange/30 shadow-lg'
                src={`https://www.youtube.com/embed/${videoId}`}
                title='YouTube video player'
                allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
                allowFullScreen
              ></iframe>
            </div>
          </section>
        ),
      });
    }
  }

  // Image Carousel Section
  if (
    imageCarousel &&
    imageCarousel.images &&
    Array.isArray(imageCarousel.images) &&
    imageCarousel.images.length > 0
  ) {
    sections.push({
      type: "imageCarousel",
      order: imageCarousel.order ?? defaultOrders.imageCarousel,
      component: (
        <section key='imageCarousel' className='mb-20'>
          <div className='text-center mb-12'>
            {imageCarousel.title && (
              <>
                <h2 className='text-3xl md:text-4xl font-bold mb-3 text-slate-800 dark:text-slate-100'>
                  {imageCarousel.title}
                </h2>
                <div className='w-24 h-1 bg-brand-blue mx-auto mb-4'></div>
              </>
            )}
            {imageCarousel.description && (
              <p className='text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg'>
                {imageCarousel.description}
              </p>
            )}
          </div>
          <div className='max-w-5xl mx-auto'>
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className='w-full'
            >
              <CarouselContent>
                {imageCarousel.images.map((image, index) => (
                  <CarouselItem
                    key={index}
                    className='md:basis-1/2 lg:basis-1/3'
                  >
                    <div className='relative aspect-video rounded-lg overflow-hidden border-2 border-brand-blue/30'>
                      <img
                        src={image.url}
                        alt={image.alt || `Image ${index + 1}`}
                        className='object-cover w-full h-full'
                      />
                      {image.caption && (
                        <div className='absolute bottom-0 left-0 right-0 bg-slate-900/70 text-white p-3 text-sm'>
                          {image.caption}
                        </div>
                      )}
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className='-left-12' />
              <CarouselNext className='-right-12' />
            </Carousel>
          </div>
        </section>
      ),
    });
  }

  // Sort sections by order
  const sortedSections = sections.sort((a, b) => a.order - b.order);

  // Navbar component
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navLinks = [
    { href: "/app", label: "Live Map" },
    { href: "/lp", label: "Landing Pages" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <div
      className={cn("min-h-screen bg-slate-50 dark:bg-slate-900", className)}
    >
      {/* Navbar */}
      <nav className='sticky top-0 z-50 bg-white dark:bg-slate-900 border-b-2 border-brand-green/30 shadow-sm'>
        <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between h-16 md:h-20'>
            {/* Logo */}
            <Link
              href='/'
              className='flex items-center space-x-2 text-slate-900 dark:text-slate-50 hover:opacity-80 transition-opacity'
            >
              <span className='text-xl md:text-2xl font-bold font-patrick-hand'>
                MaVille.club
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className='hidden md:flex items-center space-x-8'>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className='text-slate-700 dark:text-slate-300 hover:text-brand-green dark:hover:text-brand-green font-medium transition-colors text-sm lg:text-base'
                >
                  {link.label}
                </Link>
              ))}
              <Button
                asChild
                className='bg-brand-yellow hover:bg-brand-yellow/90 text-slate-900 font-semibold'
              >
                <Link href='/app'>Get Started</Link>
              </Button>
            </div>

            {/* Mobile menu button */}
            <button
              className='md:hidden p-2 text-slate-700 dark:text-slate-300 hover:text-brand-green transition-colors'
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label='Toggle menu'
            >
              {mobileMenuOpen ? (
                <XIcon className='h-6 w-6' />
              ) : (
                <Menu className='h-6 w-6' />
              )}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className='md:hidden border-t border-brand-green/20 py-4'>
              <div className='flex flex-col space-y-4'>
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className='text-slate-700 dark:text-slate-300 hover:text-brand-green dark:hover:text-brand-green font-medium transition-colors px-2 py-1'
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <Button
                  asChild
                  className='bg-brand-yellow hover:bg-brand-yellow/90 text-slate-900 font-semibold w-full mt-2'
                >
                  <Link href='/app' onClick={() => setMobileMenuOpen(false)}>
                    Get Started
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section with Winter Mountain Background */}
      <header className='relative h-[30vh] md:h-[35vh] lg:h-[40vh] flex items-center justify-center mb-8 md:mb-12 overflow-hidden'>
        {/* Background Image */}
        <div
          className='absolute inset-0 bg-cover bg-center bg-no-repeat'
          style={{
            backgroundImage: heroImage
              ? `url('${heroImage}')`
              : "url('https://plus.unsplash.com/premium_photo-1698846875880-e2fecb1b4234?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')",
          }}
        >
          {/* Dark overlay for text readability */}
          <div className='absolute inset-0 bg-slate-900/50 dark:bg-slate-900/70'></div>
        </div>

        {/* Content - Slim container */}
        <div className='relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto'>
          <div className='inline-block mb-4'>
            <div className='w-24 h-1 bg-brand-green mx-auto mb-3'></div>
          </div>
          <h1 className='text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white tracking-tight leading-tight drop-shadow-lg'>
            {title}
          </h1>
          {subtitle && (
            <h2 className='text-xl md:text-2xl lg:text-3xl font-semibold mb-4 text-white/95 drop-shadow-md'>
              {subtitle}
            </h2>
          )}
          <div className='w-20 h-1 bg-brand-blue mx-auto mb-4'></div>
          <p className='text-base md:text-lg text-white/90 max-w-2xl mx-auto leading-relaxed drop-shadow-md'>
            {shortDescription}
          </p>
        </div>
      </header>

      <div
        className={cn(
          "container mx-auto px-4 py-20 md:py-24 max-w-6xl",
          containerClassName,
        )}
      >
        {/* Render sections in order */}
        {sortedSections.map((section) => section.component)}
      </div>
    </div>
  );
}
