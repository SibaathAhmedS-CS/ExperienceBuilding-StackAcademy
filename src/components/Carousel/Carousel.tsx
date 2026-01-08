'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import styles from './Carousel.module.css';
import { BannerEntry, normalizeArray, extractColor } from '@/types/contentstack';

// Legacy slide interface for backwards compatibility
interface LegacyCarouselSlide {
  uid: string;
  title: string;
  description: string;
  image: string;
  ctaLabel: string;
  ctaUrl: string;
  backgroundColor?: string;
}

// Normalized slide format
interface NormalizedSlide {
  uid: string;
  label: string;
  title: string;
  description: string;
  image: string;
  ctaLabel: string;
  ctaUrl: string;
  backgroundColor: string;
  textColor: string;
  // Preserve original banner entry for Live Preview $ attributes
  _originalBanner?: BannerEntry;
}

interface CarouselProps {
  // New CMS data format
  banners?: BannerEntry | BannerEntry[];
  // Legacy props for backwards compatibility
  slides?: LegacyCarouselSlide[];
  autoPlay?: boolean;
  interval?: number;
}

// Default colors for carousel slides
const defaultColors = ['#3b82f6', '#7c3aed', '#059669', '#dc2626', '#ea580c'];

// Helper to extract image URL from various possible formats with fallback
function extractImageUrl(banner: BannerEntry): string {
  // Try banner_image (asset reference)
  if (banner.banner_image?.url) {
    return banner.banner_image.url;
  }
  
  // Try if banner_image is a string URL directly (variant case)
  if (typeof banner.banner_image === 'string' && banner.banner_image) {
    return banner.banner_image;
  }
  
  // Check for any other image field patterns that might exist
  const bannerAny = banner as any;
  if (bannerAny.image?.url) {
    return bannerAny.image.url;
  }
  if (bannerAny.image_url) {
    return bannerAny.image_url;
  }
  
  // If still no image, try to fetch from fallback locale (this should be done server-side)
  // For now, return empty string - the fallback should be handled in getPage
  return '';
}

// Normalize banner data to a common format
function normalizeBanners(
  banners?: BannerEntry | BannerEntry[],
  slides?: LegacyCarouselSlide[]
): NormalizedSlide[] {
  // If CMS banners are provided, convert them
  if (banners) {
    const bannerArray = normalizeArray(banners);
    return bannerArray.map((banner, index) => ({
      uid: banner.uid,
      label: banner.label || banner.title,
      title: banner.title,
      description: banner.description || '',
      image: extractImageUrl(banner),
      ctaLabel: banner.button?.title || 'Learn More',
      ctaUrl: banner.button?.href || '#',
      backgroundColor: extractColor(banner.banner_color, defaultColors[index % defaultColors.length]),
      textColor: extractColor(banner.banner_text_color, '#ffffff'),
      // Preserve original banner entry for Live Preview $ attributes
      _originalBanner: banner,
    }));
  }

  // Fall back to legacy slides
  if (slides) {
    return slides.map((slide, index) => ({
      uid: slide.uid,
      label: slide.title,
      title: slide.title,
      description: slide.description,
      image: slide.image,
      ctaLabel: slide.ctaLabel,
      ctaUrl: slide.ctaUrl,
      backgroundColor: slide.backgroundColor || defaultColors[index % defaultColors.length],
      textColor: '#ffffff',
    }));
  }

  return [];
}

export default function Carousel({ 
  banners,
  slides: legacySlides, 
  autoPlay = true, 
  interval = 5000 
}: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Normalize data from either source
  const slides = normalizeBanners(banners, legacySlides);

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 500);
  }, [isTransitioning]);

  const goToNext = useCallback(() => {
    if (slides.length === 0) return;
    goToSlide((currentIndex + 1) % slides.length);
  }, [currentIndex, slides.length, goToSlide]);

  const goToPrev = useCallback(() => {
    if (slides.length === 0) return;
    goToSlide((currentIndex - 1 + slides.length) % slides.length);
  }, [currentIndex, slides.length, goToSlide]);

  useEffect(() => {
    if (!autoPlay || isPaused || slides.length <= 1) return;

    const timer = setInterval(goToNext, interval);
    return () => clearInterval(timer);
  }, [autoPlay, isPaused, interval, goToNext, slides.length]);

  if (!slides.length) return null;

  return (
    <div 
      className={styles.carousel}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className={styles.slidesWrapper}>
        {slides.map((slide, index) => (
          <div
            key={slide.uid}
            className={`${styles.slide} ${index === currentIndex ? styles.active : ''}`}
            style={{ 
              backgroundColor: slide.backgroundColor,
              color: slide.textColor,
            }}
          >
            <div className={styles.slideContent}>
              <div className={styles.textContent}>
                <h2 
                  className={styles.slideTitle} 
                  style={{ color: slide.textColor }}
                  {...(slide._originalBanner?.title as any)?.$ || (slide._originalBanner?.label as any)?.$ || {}}
                >
                  {slide.label}
                </h2>
                <p 
                  className={styles.slideDescription} 
                  style={{ color: slide.textColor }}
                  {...(slide._originalBanner?.description as any)?.$ || {}}
                >
                  {slide.description}
                </p>
                <Link 
                  href={slide.ctaUrl} 
                  className={styles.ctaButton}
                  {...(slide._originalBanner?.button?.title as any)?.$ || {}}
                >
                  {slide.ctaLabel.includes('→') ? slide.ctaLabel.replace('→', '') : slide.ctaLabel}
                  <ArrowRight size={18} />
                </Link>
              </div>
              <div 
                className={styles.imageContent}
                style={{ '--slide-bg': slide.backgroundColor } as React.CSSProperties}
              >
                {slide.image ? (
                  <Image
                    src={slide.image}
                    alt={slide.label}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className={styles.slideImage}
                    priority={index === 0}
                  />
                ) : (
                  <div className={styles.imagePlaceholder} />
                )}
                <div className={styles.imageOverlay} />
              </div>
            </div>

            {/* Decorative Elements */}
            <div className={styles.decorCircle1} />
            <div className={styles.decorCircle2} />
            <div className={styles.decorCircle3} />
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <button
            className={`${styles.navButton} ${styles.prevButton}`}
            onClick={goToPrev}
            aria-label="Previous slide"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            className={`${styles.navButton} ${styles.nextButton}`}
            onClick={goToNext}
            aria-label="Next slide"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {slides.length > 1 && (
        <div className={styles.dots}>
          {slides.map((_, index) => (
            <button
              key={index}
              className={`${styles.dot} ${index === currentIndex ? styles.activeDot : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Progress Bar */}
      {autoPlay && slides.length > 1 && (
        <div className={styles.progressBar}>
          <div 
            className={styles.progress}
            style={{ 
              animationDuration: `${interval}ms`,
              animationPlayState: isPaused ? 'paused' : 'running'
            }}
            key={currentIndex}
          />
        </div>
      )}
    </div>
  );
}
